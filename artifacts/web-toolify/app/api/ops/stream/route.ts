/**
 * GET /api/ops/stream
 *
 * Server-Sent Events endpoint for the /ops dashboard.
 * Pushes one `data:` event per second (SNAP_MS).
 *
 * Architecture (central-state pattern):
 *   All data sources → central-state.ts → getOpsSnapshot()
 *   This route imports from exactly TWO modules:
 *     1. central-state  — full ops snapshot (single source of truth)
 *     2. worker-health  — BullMQ worker liveness (polled every 30 s)
 *
 * Security: same cookie / Bearer token as /api/ops/auth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '../auth/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SNAP_MS         = 1_000
const PING_MS         = 25_000
const WORKER_CHECK_MS = 30_000

// Must match QUEUE_NAMES in lib/queue/bullmq-backend.ts
const QUEUE_NAMES = ['toolify-pdf', 'toolify-image', 'toolify-ocr', 'toolify-document']

// ── Types ─────────────────────────────────────────────────────────────────────

// Re-export the canonical OpsSnapshot shape as OpsPayload (extended with workers)
import type { OpsSnapshot } from '@/lib/monitoring/central-state'

interface OpsPayload extends OpsSnapshot {
  workers: Array<{ queueName: string; status: string; addr: string; lastSeen: number }>
}

// ── Worker health poll (every 30 s, non-blocking) ─────────────────────────────

const KEY_WORKER_CHECK = Symbol.for('toolify.ops.stream.lastWorkerCheck')
type WG = Record<symbol, number>

function shouldCheckWorkers(): boolean {
  const g = globalThis as WG
  const last = g[KEY_WORKER_CHECK] ?? 0
  if (Date.now() - last < WORKER_CHECK_MS) return false
  g[KEY_WORKER_CHECK] = Date.now()
  return true
}

async function refreshWorkerHealth(): Promise<void> {
  if (!shouldCheckWorkers()) return
  try {
    const { recordWorker, markQueueStale, seedQueues } = await import('@/lib/monitoring/worker-health')
    const { Queue } = await import('bullmq')
    const { Redis }  = await import('ioredis')

    seedQueues(QUEUE_NAMES)

    const redisUrl   = process.env.REDIS_URL || 'redis://localhost:6379'
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: 0, lazyConnect: true })

    try {
      await connection.connect()
    } catch {
      try { connection.disconnect() } catch {}
      return
    }

    await Promise.all(QUEUE_NAMES.map(async (name) => {
      try {
        const q       = new Queue(name, { connection })
        const workers = await q.getWorkers()
        await q.close()

        if (workers.length === 0) {
          markQueueStale(name)
        } else {
          const counts = await q.getJobCounts('active')
          const busy   = (counts.active ?? 0) > 0
          for (const w of workers) {
            recordWorker(name, w.addr ?? name, busy)
          }
        }
      } catch {
        markQueueStale(name)
      }
    }))

    try { connection.disconnect() } catch {}
  } catch {
    // ioredis or bullmq unavailable — skip silently
  }
}

// ── Payload builder ───────────────────────────────────────────────────────────
// Reads from central state ONLY — no direct SQLite queries, no fragmented imports.

async function buildOpsPayload(): Promise<OpsPayload> {
  const [
    { getOpsSnapshot },
    { getWorkerHealth, seedQueues },
  ] = await Promise.all([
    import('@/lib/monitoring/central-state'),
    import('@/lib/monitoring/worker-health'),
  ])

  // Ensure known queues are registered so they appear before first BullMQ poll
  seedQueues(QUEUE_NAMES)

  // Kick off worker health refresh (non-blocking, throttled to every 30 s)
  void refreshWorkerHealth()

  const snap         = getOpsSnapshot()
  const workerHealth = getWorkerHealth()

  return {
    ...snap,
    workers: workerHealth.map((w) => ({
      queueName: w.queueName,
      status:    w.status,
      addr:      w.addr,
      lastSeen:  w.lastSeen,
    })),
  }
}

// ── Simple ops-specific SSE bus ───────────────────────────────────────────────

const KEY_BUS = Symbol.for('toolify.ops.stream.bus')
type G = Record<symbol, Set<ReadableStreamDefaultController<Uint8Array>>>

function getBus(): Set<ReadableStreamDefaultController<Uint8Array>> {
  const g = globalThis as G
  if (!g[KEY_BUS]) g[KEY_BUS] = new Set()
  return g[KEY_BUS]
}

function pushToAll(payload: unknown): void {
  const clients = getBus()
  if (clients.size === 0) return
  const bytes = new TextEncoder().encode(`data:${JSON.stringify(payload)}\n\n`)
  const dead: ReadableStreamDefaultController<Uint8Array>[] = []
  for (const ctrl of clients) {
    try { ctrl.enqueue(bytes) } catch { dead.push(ctrl) }
  }
  for (const ctrl of dead) clients.delete(ctrl)
}

// ── Global publisher (one timer shared across all clients) ────────────────────

const KEY_PUB = Symbol.for('toolify.ops.stream.publisher')
interface OpsPub { started: boolean; timer?: ReturnType<typeof setInterval> }
type PubG = Record<symbol, OpsPub>

function getPub(): OpsPub {
  const g = globalThis as PubG
  if (!g[KEY_PUB]) g[KEY_PUB] = { started: false }
  return g[KEY_PUB]
}

function startPublisher(): void {
  const pub = getPub()
  if (pub.started) return
  pub.started = true
  pub.timer = setInterval(async () => {
    try {
      const payload = await buildOpsPayload()
      pushToAll(payload)
    } catch {}
  }, SNAP_MS)
  if (pub.timer && 'unref' in pub.timer) (pub.timer as NodeJS.Timeout).unref()
}

// ── SSE handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyOpsSession(request)) {
    return new NextResponse(null, { status: 404 })
  }

  startPublisher()

  let remove:    (() => void) | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const clients = getBus()
      clients.add(controller)
      remove = () => clients.delete(controller)

      // Send first snapshot immediately on connect (no waiting for the 1 s tick)
      try {
        const payload = await buildOpsPayload()
        controller.enqueue(new TextEncoder().encode(`data:${JSON.stringify(payload)}\n\n`))
      } catch {}

      // Keepalive comment line every 25 s (prevents proxy / load-balancer timeouts)
      pingTimer = setInterval(() => {
        try { controller.enqueue(new TextEncoder().encode(`: ping ${Date.now()}\n\n`)) } catch {}
      }, PING_MS)
      if (pingTimer && 'unref' in pingTimer) (pingTimer as NodeJS.Timeout).unref()
    },
    cancel() {
      if (pingTimer) clearInterval(pingTimer)
      if (remove)    remove()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache, no-transform',
      'X-Accel-Buffering':           'no',
      'Connection':                  'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
