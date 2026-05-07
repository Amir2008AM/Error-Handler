/**
 * Bot Command Handlers
 *
 * Data priority:
 *  1. Supabase (monitoring layer) — cross-restart, real-time, enterprise-grade
 *  2. SQLite (db.ts)             — persistent fallback within the same process
 *  3. In-memory ring buffer      — last 10s live snapshot
 *
 * Every handler is safe: if both Supabase and SQLite are unavailable, a
 * "No data yet" message is returned — never an uncaught error.
 */

import { getLiveActivity, recordJob } from './analytics'
import {
  dbReadGlobalStats, dbReadToolStats, dbReadRecentErrors,
  dbReadFileStats, dbReadUserStats, dbReadInsights, dbReadAllDetailedErrors,
  getDb,
  type DetailedErrorRecord,
} from './db'
import {
  getCpuPercent, getDiskUsage, getMemoryInfo,
  getQueueCounts, pingRedis, pingDb, fmtBytes, fmtUptime,
} from './metrics'
import {
  queryGlobalStats, queryToolStats, queryLiveEvents,
  queryRecentErrors, queryLatestMetric, queryWorkerStatus,
  queryActiveSessions, pingSupabase,
  type SupabaseError,
} from '../monitoring/queries'
import { isMonitoringEnabled } from '../monitoring/client'
import { pauseAllQueues, resumeAllQueues, clearAllQueues } from './worker-control'
import { t, fmt, type Lang } from './i18n'
import { sendMessage } from './api'

function ms(n: number): string {
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)}m`
  if (n >= 1_000)  return `${(n / 1_000).toFixed(1)}s`
  return `${n}ms`
}

function bar(pct: number): string {
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

// ── /stats ───────────────────────────────────────────────────────────────────
export async function handleStats(lang: Lang): Promise<string> {
  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

  // Try Supabase first
  const supaStats = await queryGlobalStats()
  if (supaStats) {
    const successRate = typeof supaStats.success_rate === 'number' ? supaStats.success_rate : 100
    return [
      t(lang, 'stats_title'), '',
      `${t(lang, 'stats_online_now')}      \`${supaStats.online_now}\``,
      `${t(lang, 'stats_total_users')}     \`${supaStats.total_sessions}\``,
      `${t(lang, 'stats_files_processed')} \`${supaStats.total_jobs}\``,
      `${t(lang, 'stats_jobs_today')}      \`${supaStats.jobs_today}\``,
      `${t(lang, 'stats_success_rate')}    \`${successRate}%\``,
      `${t(lang, 'stats_failed_jobs')}     \`${supaStats.total_failed}\``,
      `${t(lang, 'stats_avg_processing')}  \`${ms(supaStats.avg_duration)}\``,
      '',
      `${t(lang, 'stats_generated_at')} \`${generatedAt}\``,
      `_Source: Supabase_ ✅`,
    ].join('\n')
  }

  // Fall back to SQLite
  const s    = dbReadGlobalStats()
  const live = getLiveActivity()
  if (!s) return t(lang, 'stats_no_data')
  return [
    t(lang, 'stats_title'), '',
    `${t(lang, 'stats_online_now')}      \`${live.activeUsers}\``,
    `${t(lang, 'stats_total_users')}     \`${s.totalUsers}\``,
    `${t(lang, 'stats_files_processed')} \`${s.totalJobs}\``,
    `${t(lang, 'stats_jobs_today')}      \`${s.jobsToday}\``,
    `${t(lang, 'stats_success_rate')}    \`${s.successRate}%\``,
    `${t(lang, 'stats_failed_jobs')}     \`${s.failedCount}\``,
    `${t(lang, 'stats_avg_processing')}  \`${ms(s.avgDurationMs)}\``,
    '',
    `${t(lang, 'stats_generated_at')} \`${generatedAt}\``,
    `_Source: SQLite (local)_`,
  ].join('\n')
}

// ── /health ──────────────────────────────────────────────────────────────────
export async function handleHealth(lang: Lang): Promise<string> {
  const [cpu, disk, queue, supaOk] = await Promise.all([
    getCpuPercent(),
    getDiskUsage(),
    getQueueCounts(),
    pingSupabase(),
  ])
  const mem    = getMemoryInfo()
  const uptime = fmtUptime(Math.floor(process.uptime()))

  // Latest metric snapshot from Supabase (30s interval)
  const latestMetric = await queryLatestMetric()
  const supaLine = isMonitoringEnabled()
    ? (supaOk ? '🟢 Supabase monitoring: `connected`' : '🔴 Supabase monitoring: `unreachable`')
    : '⚫ Supabase monitoring: `disabled`'

  const heapPct = Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)

  return [
    t(lang, 'health_title'), '',
    `${t(lang, 'health_cpu')}    ${bar(cpu)} \`${cpu}%\``,
    `${t(lang, 'health_memory')} ${bar(mem.pct)} \`${mem.pct}%\` (${fmtBytes(mem.used)} / ${fmtBytes(mem.total)})`,
    `🧠 JS Heap:  ${bar(heapPct)} \`${heapPct}%\` (${fmtBytes(process.memoryUsage().heapUsed)} / ${fmtBytes(process.memoryUsage().heapTotal)})`,
    `${t(lang, 'health_disk')}   ${bar(disk.pct)} \`${disk.pct}%\` (${fmtBytes(disk.used)} / ${fmtBytes(disk.total)})`,
    `${t(lang, 'health_uptime')} \`${uptime}\``,
    '',
    `${t(lang, 'health_active_jobs')} \`${queue.active}\``,
    `${t(lang, 'health_waiting')}     \`${queue.waiting}\``,
    `${t(lang, 'health_completed')}   \`${queue.completed}\``,
    `${t(lang, 'health_failed')}      \`${queue.failed}\``,
    '',
    supaLine,
    ...(latestMetric ? [`📊 Last snapshot: \`${new Date(latestMetric.timestamp).toISOString().replace('T',' ').slice(0,19)} UTC\``] : []),
  ].join('\n')
}

// ── /tools ───────────────────────────────────────────────────────────────────
export async function handleTools(lang: Lang): Promise<string> {
  // Try Supabase first
  const supaTools = await queryToolStats()
  if (supaTools && supaTools.length > 0) {
    const lines = supaTools.map((tool) =>
      fmt(t(lang, 'tools_row'), {
        name:  tool.tool,
        count: tool.total,
        rate:  tool.success_rate,
        avg:   ms(tool.avg_ms),
      })
    )
    return [t(lang, 'tools_title'), `_Source: Supabase_ ✅`, '', ...lines].join('\n')
  }

  // Fall back to SQLite
  const stats = dbReadToolStats()
  if (!stats.length) return t(lang, 'tools_no_data')
  const lines = stats.slice(0, 15).map((tool) =>
    fmt(t(lang, 'tools_row'), {
      name:  tool.name,
      count: tool.count,
      rate:  tool.successRate,
      avg:   ms(tool.avgDurationMs),
    })
  )
  return [t(lang, 'tools_title'), `_Source: SQLite (local)_`, '', ...lines].join('\n')
}

// ── /queue ───────────────────────────────────────────────────────────────────
export async function handleQueue(lang: Lang): Promise<string> {
  const [q, live, liveEvents, workers] = await Promise.all([
    getQueueCounts(),
    Promise.resolve(getLiveActivity()),
    queryLiveEvents(10_000),
    queryWorkerStatus(),
  ])

  // Live activity from Supabase (more accurate across restarts)
  const supaLiveJobs   = liveEvents.length
  const supaLiveUsers  = new Set(liveEvents.map((e) => e.session_id).filter(Boolean)).size
  const supaActiveJobs = liveEvents.filter((e) => e.event_type === 'job_started').length

  const useSupaLive = isMonitoringEnabled()
  const recentJobs  = useSupaLive ? supaLiveJobs  : live.recentJobs
  const activeUsers = useSupaLive ? supaLiveUsers  : live.activeUsers

  const queueLines = Object.entries(q.byQueue).map(([name, c]) => {
    const short = name.replace('toolify-', '')
    return `• \`${short}\`: ⏳${c.waiting} ⚡${c.active} ✅${c.completed} ❌${c.failed}`
  })

  const workerLines = workers.length
    ? workers.map((w) => {
        const icon = w.status === 'busy' ? '⚡' : w.status === 'crashed' ? '💥' : '💤'
        const ago  = Math.round((Date.now() - new Date(w.last_seen).getTime()) / 1000)
        return `${icon} \`${w.worker_id}\` (${w.worker_type}) — ${w.status} | ✅${w.jobs_done} ❌${w.jobs_failed} | ${ago}s ago`
      })
    : []

  return [
    t(lang, 'queue_title'), '',
    `${t(lang, 'queue_live_jobs')}  \`${recentJobs}\`${useSupaLive ? ' _(Supabase)_' : ''}`,
    `${t(lang, 'queue_live_users')} \`${activeUsers}\`${useSupaLive ? ' _(Supabase)_' : ''}`,
    `⚡ Active now:               \`${supaActiveJobs}\``,
    '',
    t(lang, 'queue_async_header'),
    `${t(lang, 'queue_waiting')}   \`${q.waiting}\``,
    `${t(lang, 'queue_active')}    \`${q.active}\``,
    `${t(lang, 'queue_completed')} \`${q.completed}\``,
    `${t(lang, 'queue_failed')}    \`${q.failed}\``,
    `${t(lang, 'queue_delayed')}   \`${q.delayed}\``,
    ...(queueLines.length   ? ['', t(lang, 'queue_by_worker'), ...queueLines] : []),
    ...(workerLines.length  ? ['', '*Worker status (Supabase):*', ...workerLines] : []),
  ].join('\n')
}

// ── /users ───────────────────────────────────────────────────────────────────
export async function handleUsers(lang: Lang): Promise<string> {
  // Try Supabase first
  const supaUsers = await queryActiveSessions(24)
  if (supaUsers.total > 0) {
    const topLines = supaUsers.top.map((x, i) =>
      `${i + 1}. \`${x.sessionId.slice(0, 8)}…\` — ${x.count} requests`
    )
    return [
      t(lang, 'users_title'), `_Source: Supabase_ ✅`, '',
      `${t(lang, 'users_total')} \`${supaUsers.total}\``,
      `${t(lang, 'users_new')}   \`${supaUsers.newToday}\``,
      '',
      t(lang, 'users_top'),
      ...(topLines.length ? topLines : [t(lang, 'users_no_top')]),
    ].join('\n')
  }

  // Fall back to SQLite
  const u = dbReadUserStats()
  if (!u) return t(lang, 'users_no_data')
  const topLines = u.top.slice(0, 5).map((x, i) =>
    `${i + 1}. \`${x.userId.slice(0, 8)}…\` — ${x.count}`
  )
  return [
    t(lang, 'users_title'), `_Source: SQLite (local)_`, '',
    `${t(lang, 'users_total')} \`${u.total}\``,
    `${t(lang, 'users_new')}   \`${u.newToday}\``,
    '',
    t(lang, 'users_top'),
    ...(topLines.length ? topLines : [t(lang, 'users_no_top')]),
  ].join('\n')
}

// ── /errors ──────────────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<string, string> = {
  critical: '⛔ Critical',
  high:     '🔴 High',
  medium:   '🟡 Medium',
  low:      '🟢 Low',
}

function _formatDetailedError(e: DetailedErrorRecord, idx: number): string {
  const ts  = new Date(e.createdAt).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  const sev = SEVERITY_LABEL[e.severity] ?? '🟡 Medium'
  return [
    `*#${idx} — ${e.errorType}*`,
    `📍 *Service:*  ${e.service}`,
    `📁 *Location:* \`${e.location || e.service}\``,
    `🧾 *Error:*    \`${e.rawMessage.slice(0, 180)}\``,
    `⏱ *Time:*     \`${ts}\``,
    `⚠️ *Severity:* ${sev}`,
    `🧠 *Diagnosis:* ${e.diagnosis}`,
    `🔍 *Root Cause:* ${e.rootCause}`,
    `💡 *Fix:* ${e.fix}`,
  ].join('\n')
}

function _formatSupabaseError(e: SupabaseError, idx: number): string {
  const ts  = new Date(e.timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  const sev = SEVERITY_LABEL[e.severity] ?? '🟡 Medium'
  return [
    `*#${idx}*`,
    `📍 *Tool:*     \`${e.tool ?? 'unknown'}\``,
    `🧾 *Error:*    \`${(e.error_message ?? '').slice(0, 200)}\``,
    `⏱ *Time:*     \`${ts}\``,
    `⚠️ *Severity:* ${sev}`,
  ].join('\n')
}

function _paginate(header: string, blocks: string[], maxChars = 3800): string[] {
  const pages: string[] = []
  let current = header
  for (const block of blocks) {
    const sep       = current === header ? '' : '\n\n' + '─'.repeat(22) + '\n\n'
    const candidate = current + sep + block
    if (candidate.length > maxChars && current !== header) {
      pages.push(current)
      current = block
    } else {
      current = candidate
    }
  }
  if (current) pages.push(current)
  return pages
}

export async function handleErrors(lang: Lang, chatId?: number): Promise<string> {
  // Try Supabase first
  const supaErrors = await queryRecentErrors(20)
  if (supaErrors.length > 0) {
    const header = `📋 *Error Log (Supabase)* — ${supaErrors.length} error${supaErrors.length !== 1 ? 's' : ''} ✅\n\n`
    const blocks = supaErrors.map((e, i) => _formatSupabaseError(e, i + 1))
    const pages  = _paginate(header, blocks)
    if (chatId && pages.length > 1) {
      for (let i = 1; i < pages.length; i++) await sendMessage(chatId, pages[i])
    }
    return pages[0]
  }

  // Try detailed SQLite errors
  const detailed = dbReadAllDetailedErrors()
  if (detailed.length > 0) {
    const total  = detailed.length
    const header = `📋 *Error Audit Log* — ${total} error${total !== 1 ? 's' : ''} (newest first)\n\n`
    const blocks = detailed.map((e, i) => _formatDetailedError(e, i + 1))
    const pages  = _paginate(header, blocks)
    if (chatId && pages.length > 1) {
      for (let i = 1; i < pages.length; i++) await sendMessage(chatId, pages[i])
    }
    return pages[0]
  }

  // Legacy simple errors
  const legacy = dbReadRecentErrors(50)
  if (!legacy.length) return t(lang, 'errors_no_data')
  const header = `📋 *Error Log* — ${legacy.length} record${legacy.length !== 1 ? 's' : ''}\n\n`
  const blocks = legacy.map((e, i) => {
    const ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    return `*#${i + 1}*\n📍 Tool: \`${e.tool}\`\n🧾 Error: \`${e.message.slice(0, 200)}\`\n⏱ Time: \`${ts}\``
  })
  const pages = _paginate(header, blocks)
  if (chatId && pages.length > 1) {
    for (let i = 1; i < pages.length; i++) await sendMessage(chatId, pages[i])
  }
  return pages[0]
}

// ── /live ─────────────────────────────────────────────────────────────────────
export async function handleLive(lang: Lang): Promise<string> {
  const [liveEvents, queue] = await Promise.all([
    queryLiveEvents(10_000),
    getQueueCounts(),
  ])
  const local = getLiveActivity()

  if (liveEvents.length > 0) {
    // Supabase-powered live feed
    const byTool = new Map<string, number>()
    let failed = 0
    for (const e of liveEvents) {
      if (e.tool) byTool.set(e.tool, (byTool.get(e.tool) ?? 0) + 1)
      if (e.status === 'failed') failed++
    }
    const uniqueSessions = new Set(liveEvents.map((e) => e.session_id).filter(Boolean)).size
    const toolLines = [...byTool.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tool, count]) => `• \`${tool}\`: ${count}`)

    return [
      t(lang, 'live_title'), `_Source: Supabase realtime_ ✅`, '',
      `${t(lang, 'live_jobs')}     \`${liveEvents.length}\``,
      `${t(lang, 'live_sessions')} \`${uniqueSessions}\``,
      `${t(lang, 'live_queue')}    \`${queue.active}\``,
      `❌ Failed (10s):    \`${failed}\``,
      '',
      t(lang, 'live_tools_header'),
      ...(toolLines.length ? toolLines : [t(lang, 'live_none')]),
    ].join('\n')
  }

  // Fall back to in-memory ring buffer
  const byTool = local.byTool.map((x) => `• \`${x.tool}\`: ${x.count}`)
  return [
    t(lang, 'live_title'), `_Source: in-memory buffer_`, '',
    `${t(lang, 'live_jobs')}     \`${local.recentJobs}\``,
    `${t(lang, 'live_sessions')} \`${local.activeUsers}\``,
    `${t(lang, 'live_queue')}    \`${queue.active}\``,
    '',
    t(lang, 'live_tools_header'),
    ...(byTool.length ? byTool : [t(lang, 'live_none')]),
  ].join('\n')
}

// ── /files ────────────────────────────────────────────────────────────────────
export async function handleFiles(lang: Lang): Promise<string> {
  const f = dbReadFileStats()
  if (!f || f.total === 0) return t(lang, 'files_no_data')
  return [
    t(lang, 'files_title'), '',
    `${t(lang, 'files_total')}   \`${f.total}\``,
    `${t(lang, 'files_avg')}     \`${fmtBytes(f.avgSizeB)}\``,
    `${t(lang, 'files_largest')} \`${fmtBytes(f.maxSizeB)}\``,
    `${t(lang, 'files_top_fmt')} \`${f.topFormat.toUpperCase()}\``,
  ].join('\n')
}

// ── /insights ─────────────────────────────────────────────────────────────────
export async function handleInsights(lang: Lang): Promise<string> {
  const [i, supaTools] = await Promise.all([
    Promise.resolve(dbReadInsights()),
    queryToolStats(),
  ])
  const mem     = process.memoryUsage()
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100)

  // Use Supabase tool data for insights if available
  const slowestTool = supaTools?.reduce((a, b) => (a.avg_ms > b.avg_ms ? a : b), supaTools[0])
  const failingTool = supaTools?.reduce((a, b) => ((100 - a.success_rate) > (100 - b.success_rate) ? a : b), supaTools[0])

  const slowestName = slowestTool?.tool ?? i.slowest?.name ?? 'n/a'
  const slowestMs   = slowestTool?.avg_ms ?? i.slowest?.avgDurationMs ?? 0
  const failingName = failingTool?.tool ?? i.mostFailing?.name ?? 'n/a'
  const failingRate = failingTool ? Math.round(100 - failingTool.success_rate) : (i.mostFailing?.failureRate ?? 0)

  const suggestions: string[] = []
  if (slowestMs > 30_000) suggestions.push(fmt(t(lang, 'insights_slow_worker'), { tool: slowestName }))
  if (failingRate > 10)   suggestions.push(fmt(t(lang, 'insights_high_failure'), { tool: failingName }))
  if (heapPct > 80)       suggestions.push(lang === 'ar' ? `⚠️ استخدام JS Heap مرتفع: \`${heapPct}%\`` : `⚠️ JS Heap usage is high: \`${heapPct}%\``)
  if (!suggestions.length) suggestions.push(t(lang, 'insights_ok'))

  return [
    t(lang, 'insights_title'),
    ...(supaTools ? ['_Source: Supabase_ ✅'] : []),
    '',
    `${t(lang, 'insights_slowest')}      \`${slowestName}\` (${ms(slowestMs)})`,
    `${t(lang, 'insights_most_failing')} \`${failingName}\` (${failingRate}%)`,
    `${t(lang, 'insights_heap')}         \`${heapPct}%\``,
    '',
    t(lang, 'insights_suggestions'),
    ...suggestions,
  ].join('\n')
}

// ── /test-pipeline ────────────────────────────────────────────────────────────
export async function handleTestPipeline(lang: Lang): Promise<string> {
  const ar = lang === 'ar'

  const db = getDb()
  if (!db) {
    return ar
      ? '❌ *فشل اختبار الاتصال*\n\nلا يمكن الوصول إلى قاعدة البيانات.'
      : '❌ *Pipeline Test Failed*\n\nDatabase is not reachable.'
  }

  const testId   = `test-${Date.now().toString(36)}`
  const before   = dbReadGlobalStats()
  const countBefore = before?.totalJobs ?? 0

  recordJob({
    type:       'test-pipeline',
    success:    true,
    durationMs: 1,
    fileSizeB:  0,
    format:     'test',
    userId:     testId,
    ts:         Date.now(),
  })

  await new Promise<void>((r) => setImmediate(r))

  const after      = dbReadGlobalStats()
  const countAfter = after?.totalJobs ?? 0
  const supaOk     = await pingSupabase()

  if (countAfter > countBefore) {
    return ar
      ? [
          '✅ *اختبار الاتصال نجح*', '',
          `المهام قبل: \`${countBefore}\``,
          `المهام بعد:  \`${countAfter}\``,
          '',
          supaOk ? '✅ Supabase monitoring: متصل' : '⚠️ Supabase monitoring: غير متاح',
          '',
          '🔗 البيانات تتدفق بشكل صحيح من الخادم إلى قاعدة البيانات.',
        ].join('\n')
      : [
          '✅ *Pipeline Test Passed*', '',
          `Jobs before: \`${countBefore}\``,
          `Jobs after:  \`${countAfter}\``,
          '',
          supaOk ? '✅ Supabase monitoring: connected' : '⚠️ Supabase monitoring: unavailable (check SQL schema)',
          '',
          '🔗 Data is flowing correctly from server → SQLite → bot.',
        ].join('\n')
  }

  return ar
    ? '⚠️ *اختبار الاتصال: كتابة غير مؤكدة*\n\nتم الكتابة ولكن العدد لم يتغير. تحقق من سجلات الخادم.'
    : '⚠️ *Pipeline Test: Write Unconfirmed*\n\nWrite was called but count did not change. Check server logs for errors.'
}

// ── /status ───────────────────────────────────────────────────────────────────
export async function handleStatus(lang: Lang): Promise<string> {
  const [redisOk, dbOk, supaOk, queue] = await Promise.all([
    pingRedis(),
    pingDb(),
    pingSupabase(),
    getQueueCounts(),
  ])
  const mem     = getMemoryInfo()
  const uptime  = fmtUptime(Math.floor(process.uptime()))
  const workers = await queryWorkerStatus()

  const supaLine = isMonitoringEnabled()
    ? (supaOk ? t(lang, 'status_supabase_ok') : t(lang, 'status_supabase_fail'))
    : t(lang, 'status_supabase_off')

  return [
    t(lang, 'status_title'),
    '',
    redisOk ? t(lang, 'status_redis_ok') : t(lang, 'status_redis_fail'),
    dbOk    ? t(lang, 'status_db_ok')    : t(lang, 'status_db_fail'),
    supaLine,
    fmt(t(lang, 'status_workers'), { count: queue.active }),
    fmt(t(lang, 'status_uptime'),  { uptime }),
    fmt(t(lang, 'status_memory'),  { pct: mem.pct, used: fmtBytes(mem.used), total: fmtBytes(mem.total) }),
    ...(workers.length ? ['', `*Registered workers:* ${workers.map((w) => `\`${w.worker_id}\``).join(', ')}`] : []),
  ].join('\n')
}

// ── /pause-workers ────────────────────────────────────────────────────────────
export async function handlePauseWorkers(lang: Lang): Promise<string> {
  await pauseAllQueues()
  return t(lang, 'pause_workers')
}

// ── /resume-workers ───────────────────────────────────────────────────────────
export async function handleResumeWorkers(lang: Lang): Promise<string> {
  await resumeAllQueues()
  return t(lang, 'resume_workers')
}

// ── /clear-queue ──────────────────────────────────────────────────────────────
export async function handleClearQueue(lang: Lang): Promise<string> {
  const removed = await clearAllQueues()
  return fmt(t(lang, 'clear_queue'), { count: removed })
}

// ── /language ─────────────────────────────────────────────────────────────────
export async function handleLanguage(lang: Lang): Promise<string> {
  return t(lang, 'language_prompt')
}

// ── /help ─────────────────────────────────────────────────────────────────────
export async function handleHelp(lang: Lang): Promise<string> {
  return [
    t(lang, 'help_header'),
    t(lang, 'help_subtitle'),
    '',
    t(lang, 'help_analytics'),
    t(lang, 'help_stats_cmd'),
    t(lang, 'help_health_cmd'),
    t(lang, 'help_tools_cmd'),
    t(lang, 'help_queue_cmd'),
    t(lang, 'help_users_cmd'),
    t(lang, 'help_errors_cmd'),
    t(lang, 'help_live_cmd'),
    t(lang, 'help_files_cmd'),
    t(lang, 'help_insights_cmd'),
    t(lang, 'help_language_cmd'),
    t(lang, 'help_status_cmd'),
    '',
    t(lang, 'help_control'),
    t(lang, 'help_pause_cmd'),
    t(lang, 'help_resume_cmd'),
    t(lang, 'help_clear_cmd'),
  ].join('\n')
}
