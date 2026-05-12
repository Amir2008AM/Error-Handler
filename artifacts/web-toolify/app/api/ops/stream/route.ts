/**
 * GET /api/ops/stream
 *
 * Server-Sent Events endpoint for the /ops dashboard.
 * Pushes a plain `data:` event every 1 second.
 *
 * Wires in three new monitoring modules (no existing code changed):
 *  #6  — error-resolver:  auto-filters errors whose tool has since succeeded
 *  #11 — worker-health:   BullMQ Queue.getWorkers() polled every 30 s via Redis
 *  #13 — disconnect:      handled client-side by DisconnectBeacon component
 *
 * Security: same cookie / Bearer token as /api/ops/data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '../auth/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SNAP_MS         = 1_000
const PING_MS         = 25_000
const WORKER_CHECK_MS = 30_000

// Known BullMQ queue names — MUST match QUEUE_NAMES in lib/queue/bullmq-backend.ts
const QUEUE_NAMES = ['toolify-pdf', 'toolify-image', 'toolify-ocr', 'toolify-document']

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

interface ResolvedErrorEntry {
  id:         string
  tool:       string
  msg:        string
  severity:   string
  errorType:  string
  createdAt:  number
  resolvedAt: number
}

interface ToolStat {
  name:          string
  count:         number
  successRate:   number
  avgDurationMs: number
  failureRate:   number
}

interface SecurityStats {
  failedAuthLast24h:   number
  rateLimitHitsLast1h: number
  topOffendingIps:     Array<{ ip: string; count: number }>
  threatLevel:         'none' | 'low' | 'medium' | 'high'
  recentEvents:        Array<{ type: string; ip: string; ts: number; detail?: string }>
}

interface OpsPayload {
  activeJobs:     number
  successRate:    number
  successCount:   number
  failedCount:    number
  usersToday:     number
  uptimeSeconds:  number
  totalJobs:      number
  pid:            number
  cpu:            number
  ram:            number
  memoryMB:       number
  snapshotAge:    number
  queue:          { waiting: number; active: number; completed: number; failed: number }
  redisOk:        boolean
  sqliteOk:       boolean
  supabaseOk:     boolean
  errors:         OpsError[]
  resolvedErrors: ResolvedErrorEntry[]
  liveTools:      Array<{ id: number; tool: string; ok: boolean; ts: number }>
  activeUsers:    Array<{ id: string; tool: string; since: number }>
  workers:        Array<{ queueName: string; status: string; addr: string; lastSeen: number }>
  toolStats:      ToolStat[]
  securityStats:  SecurityStats
}

// ── Worker health poll — #11 ──────────────────────────────────────────────────

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

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
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

async function buildOpsPayload(): Promise<OpsPayload> {
  const [
    { getSystemSnapshot, getQueueSnapshot, getConnectivitySnapshot, snapshotAge },
    { getLiveEvents },
    { dbReadGlobalStats, dbReadUserStats, dbReadAllDetailedErrors, dbReadToolStats },
    { getUniqueActiveUsersByIp },
    { syncFromLiveEvents, isErrorActive },
    { getWorkerHealth, seedQueues },
    { getSecurityStats },
    { addResolvedError, getResolvedErrors },
  ] = await Promise.all([
    import('@/lib/telegram/analytics-cache'),
    import('@/lib/telegram/analytics'),
    import('@/lib/telegram/db'),
    import('@/lib/monitoring/active-users'),
    import('@/lib/monitoring/error-resolver'),
    import('@/lib/monitoring/worker-health'),
    import('@/lib/monitoring/security-monitor'),
    import('@/lib/monitoring/resolved-errors'),
  ])

  // Seed known queues so they appear before first BullMQ poll
  seedQueues(QUEUE_NAMES)

  const system       = getSystemSnapshot()
  const queue        = getQueueSnapshot()
  const connectivity = getConnectivitySnapshot()
  const globalStats  = dbReadGlobalStats()
  const userStats    = dbReadUserStats()
  const rawErrors    = dbReadAllDetailedErrors(20)
  const liveEvents   = getLiveEvents(100)
  const activeUsers  = getUniqueActiveUsersByIp()
  const workerHealth = getWorkerHealth()
  const toolStats    = dbReadToolStats()
  const secStats     = getSecurityStats()

  // Sync error-resolver with latest live events
  syncFromLiveEvents(liveEvents)

  // Partition errors into active vs resolved, and persist newly-resolved ones
  const errors: OpsError[] = []
  for (let i = 0; i < rawErrors.length; i++) {
    const e   = rawErrors[i]
    const id  = `err-${e.createdAt}-${i}`
    const active = isErrorActive(e.service || 'unknown', e.createdAt)
    if (active) {
      errors.push({
        id,
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
      })
    } else {
      // Error was resolved — persist it to the resolved store
      addResolvedError({
        id,
        tool:       e.service   || 'unknown',
        msg:        (e.rawMessage || '').slice(0, 300),
        severity:   (e.severity  || 'medium').toUpperCase(),
        errorType:  e.errorType  || 'Error',
        createdAt:  e.createdAt,
        resolvedAt: Date.now(),
      })
    }
  }

  const resolvedErrors = getResolvedErrors()

  // Kick off worker health refresh (non-blocking, every 30 s)
  void refreshWorkerHealth()

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
    resolvedErrors,
    liveTools: liveEvents.map(j => ({ id: j.ts, tool: j.type, ok: j.success, ts: j.ts })),
    activeUsers: activeUsers.map(u => ({
      id:    u.ip || u.id.slice(0, 12).toUpperCase(),
      tool:  u.tool   || '—',
      since: u.since,
    })),
    workers: workerHealth.map(w => ({
      queueName: w.queueName,
      status:    w.status,
      addr:      w.addr,
      lastSeen:  w.lastSeen,
    })),
    toolStats,
    securityStats: {
      failedAuthLast24h:   secStats.failedAuthLast24h,
      rateLimitHitsLast1h: secStats.rateLimitHitsLast1h,
      topOffendingIps:     secStats.topOffendingIps,
      threatLevel:         secStats.threatLevel,
      recentEvents:        secStats.recentEvents,
    },
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

      // Keepalive ping (SSE comment line — EventSource ignores lines starting with ':')
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
