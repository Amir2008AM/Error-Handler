/**
 * Bot Command Handlers
 *
 * Each handler accepts `lang: Lang` and returns a Markdown string in that language.
 * Historical data comes from SQLite (persistent across restarts).
 * Real-time /live data comes from the in-memory ring buffer.
 * All handlers fall back to "No data yet" if the DB is unavailable.
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
  const s = dbReadGlobalStats()
  if (!s) return t(lang, 'stats_no_data')
  return [
    t(lang, 'stats_title'), '',
    `${t(lang, 'stats_total_users')}     \`${s.totalUsers}\``,
    `${t(lang, 'stats_active_24h')}      \`${s.activeUsers24h}\``,
    `${t(lang, 'stats_files_processed')} \`${s.totalJobs}\``,
    `${t(lang, 'stats_jobs_today')}      \`${s.jobsToday}\``,
    `${t(lang, 'stats_success_rate')}    \`${s.successRate}%\``,
    `${t(lang, 'stats_failed_jobs')}     \`${s.failedCount}\``,
    `${t(lang, 'stats_avg_processing')}  \`${ms(s.avgDurationMs)}\``,
  ].join('\n')
}

// ── /health ──────────────────────────────────────────────────────────────────
export async function handleHealth(lang: Lang): Promise<string> {
  const [cpu, disk, queue] = await Promise.all([
    getCpuPercent(),
    getDiskUsage(),
    getQueueCounts(),
  ])
  const mem    = getMemoryInfo()
  const uptime = fmtUptime(Math.floor(process.uptime()))

  return [
    t(lang, 'health_title'), '',
    `${t(lang, 'health_cpu')}    ${bar(cpu)} \`${cpu}%\``,
    `${t(lang, 'health_memory')} ${bar(mem.pct)} \`${mem.pct}%\` (${fmtBytes(mem.used)} / ${fmtBytes(mem.total)})`,
    `${t(lang, 'health_disk')}   ${bar(disk.pct)} \`${disk.pct}%\` (${fmtBytes(disk.used)} / ${fmtBytes(disk.total)})`,
    `${t(lang, 'health_uptime')} \`${uptime}\``,
    '',
    `${t(lang, 'health_active_jobs')} \`${queue.active}\``,
    `${t(lang, 'health_waiting')}     \`${queue.waiting}\``,
    `${t(lang, 'health_completed')}   \`${queue.completed}\``,
    `${t(lang, 'health_failed')}      \`${queue.failed}\``,
  ].join('\n')
}

// ── /tools ───────────────────────────────────────────────────────────────────
export async function handleTools(lang: Lang): Promise<string> {
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
  return [t(lang, 'tools_title'), '', ...lines].join('\n')
}

// ── /queue ───────────────────────────────────────────────────────────────────
export async function handleQueue(lang: Lang): Promise<string> {
  const q = await getQueueCounts()
  const lines = Object.entries(q.byQueue).map(([name, c]) => {
    const short = name.replace('toolify-', '')
    return `• \`${short}\`: ⏳${c.waiting} ⚡${c.active} ✅${c.completed} ❌${c.failed}`
  })
  return [
    t(lang, 'queue_title'), '',
    `${t(lang, 'queue_waiting')}   \`${q.waiting}\``,
    `${t(lang, 'queue_active')}    \`${q.active}\``,
    `${t(lang, 'queue_completed')} \`${q.completed}\``,
    `${t(lang, 'queue_failed')}    \`${q.failed}\``,
    `${t(lang, 'queue_delayed')}   \`${q.delayed}\``,
    '',
    t(lang, 'queue_by_worker'),
    ...lines,
  ].join('\n')
}

// ── /users ───────────────────────────────────────────────────────────────────
export async function handleUsers(lang: Lang): Promise<string> {
  const u = dbReadUserStats()
  if (!u) return t(lang, 'users_no_data')
  const topLines = u.top.slice(0, 5).map((x, i) =>
    `${i + 1}. \`${x.userId.slice(0, 8)}…\` — ${x.count}`
  )
  return [
    t(lang, 'users_title'), '',
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

/** Split pre-built blocks into pages that fit within Telegram's 4096-char limit. */
function _paginate(header: string, blocks: string[], maxChars = 3800): string[] {
  const pages: string[] = []
  let current = header

  for (const block of blocks) {
    const sep = current === header ? '' : '\n\n' + '─'.repeat(22) + '\n\n'
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
  // Primary source: fully-diagnosed errors_detail table
  const detailed = dbReadAllDetailedErrors()

  if (detailed.length > 0) {
    const total  = detailed.length
    const header = `📋 *Error Audit Log* — ${total} error${total !== 1 ? 's' : ''} (newest first)\n\n`
    const blocks = detailed.map((e, i) => _formatDetailedError(e, i + 1))
    const pages  = _paginate(header, blocks)

    // If caller supplied chatId, send overflow pages directly
    if (chatId && pages.length > 1) {
      for (let i = 1; i < pages.length; i++) {
        await sendMessage(chatId, pages[i])
      }
    }

    return pages[0]
  }

  // Fallback: legacy errors_log (simpler format, still accurate timestamps)
  const legacy = dbReadRecentErrors(50)
  if (!legacy.length) return t(lang, 'errors_no_data')

  const header = `📋 *Error Log* — ${legacy.length} record${legacy.length !== 1 ? 's' : ''}\n\n`
  const blocks = legacy.map((e, i) => {
    const ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    return `*#${i + 1}*\n📍 Tool: \`${e.tool}\`\n🧾 Error: \`${e.message.slice(0, 200)}\`\n⏱ Time: \`${ts}\``
  })
  const pages = _paginate(header, blocks)

  if (chatId && pages.length > 1) {
    for (let i = 1; i < pages.length; i++) {
      await sendMessage(chatId, pages[i])
    }
  }

  return pages[0]
}

// ── /live ────────────────────────────────────────────────────────────────────
export async function handleLive(lang: Lang): Promise<string> {
  const live  = getLiveActivity()
  const queue = await getQueueCounts()
  const byTool = live.byTool.map((x) => `• \`${x.tool}\`: ${x.count}`)
  return [
    t(lang, 'live_title'), '',
    `${t(lang, 'live_jobs')}     \`${live.recentJobs}\``,
    `${t(lang, 'live_sessions')} \`${live.activeUsers}\``,
    `${t(lang, 'live_queue')}    \`${queue.active}\``,
    '',
    t(lang, 'live_tools_header'),
    ...(byTool.length ? byTool : [t(lang, 'live_none')]),
  ].join('\n')
}

// ── /files ───────────────────────────────────────────────────────────────────
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

// ── /insights ────────────────────────────────────────────────────────────────
export async function handleInsights(lang: Lang): Promise<string> {
  const i   = dbReadInsights()
  const mem = process.memoryUsage()
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100)

  const suggestions: string[] = []
  if ((i.slowest?.avgDurationMs ?? 0) > 30_000) {
    suggestions.push(fmt(t(lang, 'insights_slow_worker'), { tool: i.slowest!.name }))
  }
  if ((i.mostFailing?.failureRate ?? 0) > 10) {
    suggestions.push(fmt(t(lang, 'insights_high_failure'), { tool: i.mostFailing!.name }))
  }
  if (!suggestions.length) suggestions.push(t(lang, 'insights_ok'))

  return [
    t(lang, 'insights_title'), '',
    `${t(lang, 'insights_slowest')}      \`${i.slowest?.name ?? 'n/a'}\` (${ms(i.slowest?.avgDurationMs ?? 0)})`,
    `${t(lang, 'insights_most_failing')} \`${i.mostFailing?.name ?? 'n/a'}\` (${i.mostFailing?.failureRate ?? 0}%)`,
    `${t(lang, 'insights_heap')}         \`${heapPct}%\``,
    '',
    t(lang, 'insights_suggestions'),
    ...suggestions,
  ].join('\n')
}

// ── /test-pipeline ────────────────────────────────────────────────────────────
export async function handleTestPipeline(lang: Lang): Promise<string> {
  const ar = lang === 'ar'

  // 1. Verify DB is reachable
  const db = getDb()
  if (!db) {
    return ar
      ? '❌ *فشل اختبار الاتصال*\n\nلا يمكن الوصول إلى قاعدة البيانات.'
      : '❌ *Pipeline Test Failed*\n\nDatabase is not reachable.'
  }

  // 2. Write a synthetic test job entry via the normal recordJob() path
  const testId = `test-${Date.now().toString(36)}`
  const before = dbReadGlobalStats()
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

  // 3. Give the setImmediate write time to commit (it's non-blocking)
  await new Promise<void>((r) => setImmediate(r))

  // 4. Read back — confirm the count increased
  const after = dbReadGlobalStats()
  const countAfter = after?.totalJobs ?? 0

  if (countAfter > countBefore) {
    return ar
      ? [
          '✅ *اختبار الاتصال نجح*', '',
          `المهام قبل: \`${countBefore}\``,
          `المهام بعد:  \`${countAfter}\``,
          '',
          '🔗 البيانات تتدفق بشكل صحيح من الخادم إلى قاعدة البيانات.',
        ].join('\n')
      : [
          '✅ *Pipeline Test Passed*', '',
          `Jobs before: \`${countBefore}\``,
          `Jobs after:  \`${countAfter}\``,
          '',
          '🔗 Data is flowing correctly from server → DB → bot.',
        ].join('\n')
  }

  return ar
    ? '⚠️ *اختبار الاتصال: كتابة غير مؤكدة*\n\nتم الكتابة ولكن العدد لم يتغير. تحقق من سجلات الخادم.'
    : '⚠️ *Pipeline Test: Write Unconfirmed*\n\nWrite was called but count did not change. Check server logs for errors.'
}

// ── /status ──────────────────────────────────────────────────────────────────
export async function handleStatus(lang: Lang): Promise<string> {
  const [redisOk, dbOk, queue, mem] = await Promise.all([
    pingRedis(),
    pingDb(),
    getQueueCounts(),
    Promise.resolve(getMemoryInfo()),
  ])

  const activeWorkers = queue.active
  const uptime = fmtUptime(Math.floor(process.uptime()))

  return [
    t(lang, 'status_title'),
    '',
    redisOk ? t(lang, 'status_redis_ok') : t(lang, 'status_redis_fail'),
    dbOk    ? t(lang, 'status_db_ok')    : t(lang, 'status_db_fail'),
    fmt(t(lang, 'status_workers'), { count: activeWorkers }),
    fmt(t(lang, 'status_uptime'),  { uptime }),
    fmt(t(lang, 'status_memory'),  { pct: mem.pct, used: fmtBytes(mem.used), total: fmtBytes(mem.total) }),
  ].join('\n')
}

// ── /pause-workers ───────────────────────────────────────────────────────────
export async function handlePauseWorkers(lang: Lang): Promise<string> {
  await pauseAllQueues()
  return t(lang, 'pause_workers')
}

// ── /resume-workers ──────────────────────────────────────────────────────────
export async function handleResumeWorkers(lang: Lang): Promise<string> {
  await resumeAllQueues()
  return t(lang, 'resume_workers')
}

// ── /clear-queue ─────────────────────────────────────────────────────────────
export async function handleClearQueue(lang: Lang): Promise<string> {
  const removed = await clearAllQueues()
  return fmt(t(lang, 'clear_queue'), { count: removed })
}

// ── /language ────────────────────────────────────────────────────────────────
export async function handleLanguage(lang: Lang): Promise<string> {
  return t(lang, 'language_prompt')
}

// ── /help ────────────────────────────────────────────────────────────────────
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
