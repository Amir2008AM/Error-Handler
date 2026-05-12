/**
 * GET /api/ops/stream
 *
 * Server-Sent Events endpoint for the /ops dashboard (legacy UI).
 * Pushes a plain `data:` event every 1 second (no named event type),
 * so the client can use a plain EventSource + onmessage listener.
 *
 * Payload shape matches what OpsDashboard expects:
 *   { activeJobs, successRate, successCount, failedCount, usersToday,
 *     uptimeSeconds, totalJobs, pid, cpu, ram, memoryMB, snapshotAge,
 *     queue, redisOk, sqliteOk, supabaseOk,
 *     errors[], liveTools[], activeUsers[] }
 *
 * Security: same cookie / Bearer token as /api/ops/data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '../auth/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SNAP_MS = 1_000
const PING_MS = 25_000

// ── Types ─────────────────────────────────────────────────────────────────────

interface OpsError {
  id:         string
  type:       string
  tool:       string
  severity:   string
  msg:        string
  createdAt:  number
  diagnosis?: { cause: string; fix: string; confidence: number }
}

interface OpsPayload {
  activeJobs:    number
  successRate:   number
  successCount:  number
  failedCount:   number
  usersToday:    number
  uptimeSeconds: number
  totalJobs:     number
  pid:           number
  cpu:           number
  ram:           number
  memoryMB:      number
  snapshotAge:   number
  queue:         { waiting: number; active: number; completed: number; failed: number }
  redisOk:       boolean
  sqliteOk:      boolean
  supabaseOk:    boolean
  errors:        OpsError[]
  liveTools:     Array<{ id: number; tool: string; ok: boolean; ts: number }>
  activeUsers:   Array<{ id: string; tool: string; since: number }>
}

// ── Payload builder ───────────────────────────────────────────────────────────

async function buildOpsPayload(): Promise<OpsPayload> {
  const [
    { getSystemSnapshot, getQueueSnapshot, getConnectivitySnapshot, snapshotAge },
    { getLiveEvents },
    { dbReadGlobalStats, dbReadUserStats, dbReadAllDetailedErrors },
    { getActiveUsers },
  ] = await Promise.all([
    import('@/lib/telegram/analytics-cache'),
    import('@/lib/telegram/analytics'),
    import('@/lib/telegram/db'),
    import('@/lib/monitoring/active-users'),
  ])

  const system       = getSystemSnapshot()
  const queue        = getQueueSnapshot()
  const connectivity = getConnectivitySnapshot()
  const globalStats  = dbReadGlobalStats()
  const userStats    = dbReadUserStats()
  const rawErrors    = dbReadAllDetailedErrors(20)
  const liveEvents   = getLiveEvents(60)
  const activeUsers  = getActiveUsers()

  const errors: OpsError[] = rawErrors.map((e, i) => ({
    id:        `err-${e.createdAt}-${i}`,
    type:      e.errorType || 'Error',
    tool:      e.service   || 'unknown',
    severity:  (e.severity || 'medium').toUpperCase(),
    msg:       e.rawMessage || '',
    createdAt: e.createdAt,
    ...(e.rootCause ? {
      diagnosis: {
        cause:      e.rootCause,
        fix:        e.fix || 'Review the error details and restart the affected service.',
        confidence: 85,
      },
    } : {}),
  }))

  return {
    activeJobs:    queue?.active ?? 0,
    successRate:   globalStats?.successRate ?? 100,
    successCount:  globalStats?.successCount ?? 0,
    failedCount:   globalStats?.failedCount ?? 0,
    usersToday:    userStats?.newToday ?? activeUsers.length,
    uptimeSeconds: Math.round(process.uptime()),
    totalJobs:     globalStats?.totalJobs ?? 0,
    pid:           process.pid,
    cpu:           system?.cpu ?? 0,
    ram:           system?.memPct ?? 0,
    memoryMB:      system ? Math.round(system.memUsed / (1024 * 1024)) : 0,
    snapshotAge:   system ? snapshotAge(system) : 0,
    queue: {
      waiting:   queue?.waiting   ?? 0,
      active:    queue?.active    ?? 0,
      completed: queue?.completed ?? 0,
      failed:    queue?.failed    ?? 0,
    },
    redisOk:    connectivity?.redisOk    ?? false,
    sqliteOk:   connectivity?.dbOk       ?? false,
    supabaseOk: connectivity?.supabaseOk ?? false,
    errors,
    liveTools: liveEvents.map(j => ({ id: j.ts, tool: j.type, ok: j.success, ts: j.ts })),
    activeUsers: activeUsers.map(u => ({
      id:    u.id.slice(0, 8).toUpperCase(),
      tool:  u.tool || '—',
      since: u.since,
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

// ── Global publisher (one timer for all clients) ──────────────────────────────

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

      // First snapshot immediately on connect
      try {
        const payload = await buildOpsPayload()
        controller.enqueue(new TextEncoder().encode(`data:${JSON.stringify(payload)}\n\n`))
      } catch {}

      // Keepalive ping (comment-only line — EventSource ignores lines starting with ':')
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
