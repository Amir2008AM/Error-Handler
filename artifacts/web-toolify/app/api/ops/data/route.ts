import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '../auth/route'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  if (!verifyOpsSession(request)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  try {
    const [
      { getSystemSnapshot, getQueueSnapshot, getConnectivitySnapshot, getDbSnapshot, getRecentFailures, getFailureStats, snapshotAge },
      { getLiveActivity },
      { dbReadGlobalStats, dbReadToolStats, dbReadRecentErrors, dbReadFileStats, dbReadUserStats, dbReadInsights, dbReadAllDetailedErrors },
      { getJobManager },
    ] = await Promise.all([
      import('@/lib/telegram/analytics-cache'),
      import('@/lib/telegram/analytics'),
      import('@/lib/telegram/db'),
      import('@/lib/queue'),
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
    const fileStats    = dbReadFileStats()
    const userStats    = dbReadUserStats()
    const insights     = dbReadInsights()
    const detailedErrors = dbReadAllDetailedErrors(50)

    let queueCounts = { pdf: {}, image: {}, ocr: {}, document: {} }
    try {
      const jm = getJobManager()
      const jmAny = jm as unknown as Record<string, unknown>
      if (jmAny && typeof jmAny.getAllQueueCounts === 'function') {
        queueCounts = await (jmAny.getAllQueueCounts as () => Promise<typeof queueCounts>)()
      }
    } catch { /* best-effort */ }

    return NextResponse.json({
      ts: Date.now(),
      system: system ? {
        cpu: system.cpu,
        memPct: system.memPct,
        memUsed: system.memUsed,
        age: snapshotAge(system),
        collectedAt: system.collectedAt,
      } : null,
      queue: queue ? {
        waiting: queue.waiting,
        active: queue.active,
        completed: queue.completed,
        failed: queue.failed,
        age: snapshotAge(queue),
      } : null,
      connectivity: connectivity ? {
        redisOk: connectivity.redisOk,
        dbOk: connectivity.dbOk,
        supabaseOk: connectivity.supabaseOk,
        age: snapshotAge(connectivity),
      } : null,
      dbSnap: dbSnap ? {
        totalJobs: dbSnap.totalJobs,
        jobsToday: dbSnap.jobsToday,
        successRate: dbSnap.successRate,
        topTools: dbSnap.topTools?.slice(0, 5) ?? [],
      } : null,
      failures: failures.slice(0, 30),
      failStats,
      live: {
        recentCount: live.recentJobs,
        activeUsers: live.activeUsers,
        byTool: live.byTool,
      },
      globalStats,
      toolStats,
      recentErrors,
      detailedErrors,
      fileStats,
      userStats,
      insights,
      queueCounts,
      nodeEnv: process.env.NODE_ENV,
      uptime: Math.round(process.uptime()),
      pid: process.pid,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
