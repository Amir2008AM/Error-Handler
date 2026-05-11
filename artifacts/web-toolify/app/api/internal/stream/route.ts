/**
 * GET /api/internal/stream
 *
 * Server-Sent Events endpoint — pushes real-time snapshots and events
 * to connected ops dashboard clients.
 *
 * Protocol:
 *   event: snapshot  — full metrics snapshot every 1 s (global publisher, shared timer)
 *   event: ping      — keepalive every 25 s (prevents proxy timeouts)
 *   event: job_success | job_failed | error | queue_overflow | cpu_alert | mem_alert
 *            — pushed immediately when the event occurs via pushSseEvent()
 *
 * Architecture:
 *   A single globalThis-based snapshot publisher fires once per second and
 *   pushes to ALL connected clients via the SSE bus. Individual client handlers
 *   only manage their own ping timer and cleanup — no per-client snapshot loops.
 *   This avoids N×DB-reads/s when multiple dashboards are open simultaneously.
 *
 * Security: same auth as all /api/internal/* routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsV2Session } from '../auth/route'
import { addSseClient, pushSseEvent, getSseClientCount } from '@/lib/monitoring/sse-bus'
import { getActiveUsers, pruneStaleUsers } from '@/lib/monitoring/active-users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SNAPSHOT_INTERVAL_MS = 1_000
const PING_INTERVAL_MS     = 25_000

// ── Snapshot builder ──────────────────────────────────────────────────────────

async function buildSnapshot() {
  const [
    { getSystemSnapshot, getQueueSnapshot, getConnectivitySnapshot, getDbSnapshot, getRecentFailures, getFailureStats, snapshotAge },
    { getLiveActivity },
    { dbReadGlobalStats, dbReadToolStats, dbReadRecentErrors, dbReadUserStats, dbReadInsights, dbReadAllDetailedErrors },
  ] = await Promise.all([
    import('@/lib/telegram/analytics-cache'),
    import('@/lib/telegram/analytics'),
    import('@/lib/telegram/db'),
  ])

  pruneStaleUsers()

  const system         = getSystemSnapshot()
  const queue          = getQueueSnapshot()
  const connectivity   = getConnectivitySnapshot()
  const dbSnap         = getDbSnapshot()
  const failures       = getRecentFailures(50)
  const failStats      = getFailureStats()
  const live           = getLiveActivity()
  const globalStats    = dbReadGlobalStats()
  const toolStats      = dbReadToolStats()
  const recentErrors   = dbReadRecentErrors(30)
  const detailedErrors = dbReadAllDetailedErrors(50)
  const userStats      = dbReadUserStats()
  const insights       = dbReadInsights()
  const activeUsersList = getActiveUsers()

  return {
    ts: Date.now(),
    system: system ? {
      cpu:      system.cpu,
      memPct:   system.memPct,
      memUsed:  system.memUsed,
      memTotal: system.memTotal,
      heapPct:  system.heapPct,
      heapUsed: system.heapUsed,
      age:      snapshotAge(system),
    } : null,
    queue: queue ? {
      waiting:   queue.waiting,
      active:    queue.active,
      completed: queue.completed,
      failed:    queue.failed,
      delayed:   queue.delayed,
      byQueue:   queue.byQueue,
      age:       snapshotAge(queue),
    } : null,
    connectivity: connectivity ? {
      redisOk:    connectivity.redisOk,
      dbOk:       connectivity.dbOk,
      supabaseOk: connectivity.supabaseOk,
      age:        snapshotAge(connectivity),
    } : null,
    dbSnap: dbSnap ? {
      totalJobs:     dbSnap.totalJobs,
      jobsToday:     dbSnap.jobsToday,
      successRate:   dbSnap.successRate,
      failedCount:   dbSnap.failedCount,
      avgDurationMs: dbSnap.avgDurationMs,
      topTools:      dbSnap.topTools?.slice(0, 8) ?? [],
    } : null,
    failures:        failures.slice(0, 30),
    failStats,
    live: {
      recentCount:  live.recentJobs,
      activeUsers:  Math.max(live.activeUsers, activeUsersList.length),
      byTool:       live.byTool,
    },
    globalStats,
    toolStats,
    recentErrors,
    detailedErrors,
    userStats,
    insights,
    activeUsersList,
    meta: {
      nodeEnv:     process.env.NODE_ENV,
      uptime:      Math.round(process.uptime()),
      pid:         process.pid,
      sseClients:  getSseClientCount(),
    },
  }
}

// ── Global snapshot publisher (one timer for all clients) ─────────────────────

const KEY_PUB = Symbol.for('toolify.snapshot.publisher')

interface Publisher {
  started: boolean
  timer?:  ReturnType<typeof setInterval>
}

type PubG = Record<symbol, Publisher>

function getPub(): Publisher {
  const g = globalThis as PubG
  if (!g[KEY_PUB]) g[KEY_PUB] = { started: false }
  return g[KEY_PUB]
}

function startSnapshotPublisher(): void {
  const pub = getPub()
  if (pub.started) return
  pub.started = true

  pub.timer = setInterval(async () => {
    try {
      const snap = await buildSnapshot()
      pushSseEvent({ type: 'snapshot', ts: snap.ts, data: snap })
    } catch {}
  }, SNAPSHOT_INTERVAL_MS)

  if (pub.timer && 'unref' in pub.timer) {
    (pub.timer as NodeJS.Timeout).unref()
  }
}

// ── SSE handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }

  startSnapshotPublisher()

  let remove:    (() => void) | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      remove = addSseClient(controller)

      const enc = (event: string, data: unknown, id?: number) => {
        const line = `id:${id ?? Date.now()}\nevent:${event}\ndata:${JSON.stringify(data)}\n\n`
        try { controller.enqueue(new TextEncoder().encode(line)) } catch {}
      }

      // Send first snapshot immediately on connect
      try {
        const snap = await buildSnapshot()
        enc('snapshot', snap)
      } catch (err) {
        enc('snapshot', { error: (err as Error).message })
      }

      // Per-client keepalive (publisher handles snapshots)
      pingTimer = setInterval(() => {
        enc('ping', { ts: Date.now() })
      }, PING_INTERVAL_MS)

      if (pingTimer && 'unref' in pingTimer) {
        (pingTimer as NodeJS.Timeout).unref()
      }
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
