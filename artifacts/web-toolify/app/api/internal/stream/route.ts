/**
 * GET /api/internal/stream
 *
 * Server-Sent Events endpoint — pushes real-time snapshots and events
 * to connected ops dashboard clients.
 *
 * Protocol:
 *   event: snapshot  — full metrics snapshot every 3 s
 *   event: ping      — keepalive every 25 s (prevents proxy timeouts)
 *   event: job_success | job_failed | error | queue_overflow | cpu_alert | mem_alert
 *            — pushed immediately when the event occurs
 *
 * Security: same auth as all /api/internal/* routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsV2Session } from '../auth/route'
import { addSseClient, pushSseEvent, getSseClientCount } from '@/lib/monitoring/sse-bus'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SNAPSHOT_INTERVAL_MS = 3_000
const PING_INTERVAL_MS     = 25_000

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

  const system       = getSystemSnapshot()
  const queue        = getQueueSnapshot()
  const connectivity = getConnectivitySnapshot()
  const dbSnap       = getDbSnapshot()
  const failures     = getRecentFailures(50)
  const failStats    = getFailureStats()
  const live         = getLiveActivity()
  const globalStats  = dbReadGlobalStats()
  const toolStats    = dbReadToolStats()
  const recentErrors = dbReadRecentErrors(30)
  const detailedErrors = dbReadAllDetailedErrors(50)
  const userStats    = dbReadUserStats()
  const insights     = dbReadInsights()

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
    failures:      failures.slice(0, 30),
    failStats,
    live: {
      recentCount:  live.recentJobs,
      activeUsers:  live.activeUsers,
      byTool:       live.byTool,
    },
    globalStats,
    toolStats,
    recentErrors,
    detailedErrors,
    userStats,
    insights,
    meta: {
      nodeEnv:     process.env.NODE_ENV,
      uptime:      Math.round(process.uptime()),
      pid:         process.pid,
      sseClients:  getSseClientCount(),
    },
  }
}

export async function GET(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }

  let remove: (() => void) | null = null
  let snapshotTimer: ReturnType<typeof setInterval> | null = null
  let pingTimer:     ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      remove = addSseClient(controller)

      const enc = (event: string, data: unknown, id?: number) => {
        const line = `id:${id ?? Date.now()}\nevent:${event}\ndata:${JSON.stringify(data)}\n\n`
        try { controller.enqueue(new TextEncoder().encode(line)) } catch {}
      }

      // Send first snapshot immediately
      try {
        const snap = await buildSnapshot()
        enc('snapshot', snap)
      } catch (err) {
        enc('snapshot', { error: (err as Error).message })
      }

      // Recurring snapshots
      snapshotTimer = setInterval(async () => {
        try {
          const snap = await buildSnapshot()
          enc('snapshot', snap)
        } catch {}
      }, SNAPSHOT_INTERVAL_MS)

      // Keepalive pings
      pingTimer = setInterval(() => {
        enc('ping', { ts: Date.now() })
      }, PING_INTERVAL_MS)

      // Unref so intervals don't block Node exit
      if (snapshotTimer && 'unref' in snapshotTimer) (snapshotTimer as NodeJS.Timeout).unref()
      if (pingTimer     && 'unref' in pingTimer)     (pingTimer     as NodeJS.Timeout).unref()
    },

    cancel() {
      if (snapshotTimer) clearInterval(snapshotTimer)
      if (pingTimer)     clearInterval(pingTimer)
      if (remove)        remove()
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
