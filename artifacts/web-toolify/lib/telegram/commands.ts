/**
 * Bot Command Handlers
 *
 * ALL data reads go through analytics-cache.ts first — zero live DB
 * or queue queries on any button press. The background collectors
 * (8s–60s intervals) keep everything fresh automatically.
 *
 * Cache layer (cache.ts) wraps the formatted message strings:
 *   - First render: assembles from analytics-cache (~0ms) + formats
 *   - Repeat presses within TTL: instant string cache hit
 *   - Rapid tapping: no extra work at all
 *
 * CRITICAL FIX: handleDashboard never caches "no data" responses —
 * if analytics-cache hasn't populated yet it triggers an immediate
 * parallel collect, waits, and then always returns real data.
 */

import { getLiveActivity, recordJob } from './analytics'
import {
  dbReadGlobalStats, dbReadToolStats, dbReadRecentErrors,
  dbReadFileStats, dbReadUserStats, dbReadInsights, dbReadAllDetailedErrors,
  getDb,
  type DetailedErrorRecord,
} from './db'
import { fmtBytes, fmtUptime } from './metrics'
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
import { cachedFetch, cacheAgeLabel } from './cache'
import {
  formatDashboard, triggerImmediateSnapshot, getSnapshot,
} from './dashboard'
import {
  getSystemSnapshot, getQueueSnapshot, getDbSnapshot,
  getConnectivitySnapshot, getRecentFailures, getFailureStats,
} from './analytics-cache'

// ── Format helpers ────────────────────────────────────────────────────────────

function ms(n: number): string {
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)}m`
  if (n >= 1_000)  return `${(n / 1_000).toFixed(1)}s`
  return `${n}ms`
}

function bar(pct: number): string {
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

/** Cache TTLs (ms) — short because analytics-cache is always fresh */
const TTL = {
  dashboard:  5_000,  // 5s — data is pre-collected, just re-format
  status:     8_000,
  health:     8_000,  // reads from analytics-cache (fast)
  queue:      6_000,  // reads from analytics-cache (fast)
  live:       4_000,
  stats:      15_000,
  tools:      30_000,
  users:      30_000,
  files:      60_000,
  insights:   30_000,
  errors:     10_000,
  failures:   5_000,
} as const

// ── /dashboard ────────────────────────────────────────────────────────────────

export async function handleDashboard(lang: Lang): Promise<string> {
  // CRITICAL: if analytics-cache hasn't populated yet, trigger NOW and wait.
  // We NEVER cache the "no data" / "collecting..." message —
  // that would trap the user in the loading state for up to 5s.
  const hasData = !!(getSystemSnapshot() || getQueueSnapshot() || getDbSnapshot())

  if (!hasData) {
    await triggerImmediateSnapshot()   // parallel collect — completes in ~500ms
  }

  // Now always has data — cache the formatted string for 5s
  return cachedFetch(`dashboard:${lang}`, TTL.dashboard, async () => formatDashboard(lang))
}

// ── /stats ────────────────────────────────────────────────────────────────────

export async function handleStats(lang: Lang): Promise<string> {
  return cachedFetch(`stats:${lang}`, TTL.stats, async () => {
    const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

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

    // Fall back to analytics-cache db snapshot
    const db   = getDbSnapshot()
    const live = getLiveActivity()
    const s    = db ?? dbReadGlobalStats()
    if (!s) return t(lang, 'stats_no_data')

    return [
      t(lang, 'stats_title'), '',
      `${t(lang, 'stats_online_now')}      \`${live.activeUsers}\``,
      `${t(lang, 'stats_total_users')}     \`${(s as typeof db & { totalUsers?: number })?.totalUsers ?? (s as ReturnType<typeof dbReadGlobalStats> & object)?.['totalUsers'] ?? 0}\``,
      `${t(lang, 'stats_files_processed')} \`${'totalJobs' in s ? s.totalJobs : 0}\``,
      `${t(lang, 'stats_jobs_today')}      \`${'jobsToday' in s ? s.jobsToday : 0}\``,
      `${t(lang, 'stats_success_rate')}    \`${'successRate' in s ? s.successRate : 100}%\``,
      `${t(lang, 'stats_failed_jobs')}     \`${'failedCount' in s ? s.failedCount : 0}\``,
      `${t(lang, 'stats_avg_processing')}  \`${ms('avgDurationMs' in s ? s.avgDurationMs : 0)}\``,
      '',
      `${t(lang, 'stats_generated_at')} \`${generatedAt}\``,
      `_Source: SQLite (local)_`,
    ].join('\n')
  })
}

// ── /health ───────────────────────────────────────────────────────────────────

export async function handleHealth(lang: Lang): Promise<string> {
  return cachedFetch(`health:${lang}`, TTL.health, async () => {
    // Read from analytics-cache — instant
    const sys   = getSystemSnapshot()
    const q     = getQueueSnapshot()
    const conn  = getConnectivitySnapshot()

    // Supabase latest snapshot (low-cost Supabase read)
    const [supaOk, latestMetric] = await Promise.all([
      pingSupabase(),
      queryLatestMetric(),
    ])

    const supaLine = isMonitoringEnabled()
      ? (supaOk ? '🟢 Supabase monitoring: `connected`' : '🔴 Supabase monitoring: `unreachable`')
      : '⚫ Supabase monitoring: `disabled`'

    const cpuIcon  = (sys?.cpu    ?? 0) >= 90 ? '🔴' : (sys?.cpu    ?? 0) >= 75 ? '🟡' : '🟢'
    const memIcon  = (sys?.memPct ?? 0) >= 90 ? '🔴' : (sys?.memPct ?? 0) >= 75 ? '🟡' : '🟢'
    const heapIcon = (sys?.heapPct ?? 0) >= 85 ? '🔴' : (sys?.heapPct ?? 0) >= 70 ? '🟡' : '🟢'

    return [
      t(lang, 'health_title'), '',
      `${t(lang, 'health_cpu')}    ${cpuIcon} ${bar(sys?.cpu ?? 0)} \`${sys?.cpu ?? 0}%\``,
      `${t(lang, 'health_memory')} ${memIcon} ${bar(sys?.memPct ?? 0)} \`${sys?.memPct ?? 0}%\` (${fmtBytes(sys?.memUsed ?? 0)} / ${fmtBytes(sys?.memTotal ?? 0)})`,
      `🧠 JS Heap:  ${heapIcon} ${bar(sys?.heapPct ?? 0)} \`${sys?.heapPct ?? 0}%\` (${fmtBytes(sys?.heapUsed ?? 0)} / ${fmtBytes(sys?.heapTotal ?? 0)})`,
      `${t(lang, 'health_uptime')} \`${sys?.uptime ?? '—'}\``,
      '',
      `${t(lang, 'health_active_jobs')} \`${q?.active ?? 0}\``,
      `${t(lang, 'health_waiting')}     \`${q?.waiting ?? 0}\``,
      `${t(lang, 'health_completed')}   \`${q?.completed ?? 0}\``,
      `${t(lang, 'health_failed')}      \`${q?.failed ?? 0}\``,
      '',
      supaLine,
      ...(latestMetric ? [`📊 Last snapshot: \`${new Date(latestMetric.timestamp).toISOString().replace('T',' ').slice(0,19)} UTC\``] : []),
      '',
      `_⚡ System data: ${sys ? `${Math.round((Date.now() - sys.collectedAt) / 1000)}s old` : 'pending'}_`,
    ].join('\n')
  })
}

// ── /tools ────────────────────────────────────────────────────────────────────

export async function handleTools(lang: Lang): Promise<string> {
  return cachedFetch(`tools:${lang}`, TTL.tools, async () => {
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

    // Fall back to analytics-cache
    const cached = getDbSnapshot()?.topTools
    const stats  = cached?.length ? cached.map((t) => ({ name: t.name, count: t.count, successRate: t.successRate, avgDurationMs: t.avgMs })) : dbReadToolStats()
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
  })
}

// ── /queue ────────────────────────────────────────────────────────────────────

export async function handleQueue(lang: Lang): Promise<string> {
  return cachedFetch(`queue:${lang}`, TTL.queue, async () => {
    // Read from analytics-cache — instant
    const q    = getQueueSnapshot()
    const live = getLiveActivity()

    const [liveEvents, workers] = await Promise.all([
      queryLiveEvents(10_000),
      queryWorkerStatus(),
    ])

    const supaLiveJobs  = liveEvents.length
    const supaLiveUsers = new Set(liveEvents.map((e) => e.session_id).filter(Boolean)).size
    const supaActive    = liveEvents.filter((e) => e.event_type === 'job_started').length

    const useSupaLive = isMonitoringEnabled()
    const recentJobs  = useSupaLive ? supaLiveJobs  : live.recentJobs
    const activeUsers = useSupaLive ? supaLiveUsers : live.activeUsers

    const queueLines = q
      ? Object.entries(q.byQueue).map(([name, c]) => {
          const short = name.replace('toolify-', '')
          return `• \`${short}\`: ⏳${c.waiting} ⚡${c.active} ✅${c.completed} ❌${c.failed}`
        })
      : []

    const workerLines = workers.length
      ? workers.map((w) => {
          const icon = w.status === 'busy' ? '⚡' : w.status === 'crashed' ? '💥' : '💤'
          const ago  = Math.round((Date.now() - new Date(w.last_seen).getTime()) / 1000)
          return `${icon} \`${w.worker_id}\` — ${w.status} | ✅${w.jobs_done} ❌${w.jobs_failed} | ${ago}s ago`
        })
      : []

    const age = q ? `${Math.round((Date.now() - q.collectedAt) / 1000)}s ago` : 'pending'

    return [
      t(lang, 'queue_title'), '',
      `${t(lang, 'queue_live_jobs')}  \`${recentJobs}\`${useSupaLive ? ' _(Supabase)_' : ''}`,
      `${t(lang, 'queue_live_users')} \`${activeUsers}\``,
      `⚡ Active now:               \`${supaActive}\``,
      '',
      t(lang, 'queue_async_header'),
      `${t(lang, 'queue_waiting')}   \`${q?.waiting ?? 0}\``,
      `${t(lang, 'queue_active')}    \`${q?.active ?? 0}\``,
      `${t(lang, 'queue_completed')} \`${q?.completed ?? 0}\``,
      `${t(lang, 'queue_failed')}    \`${q?.failed ?? 0}\``,
      `${t(lang, 'queue_delayed')}   \`${q?.delayed ?? 0}\``,
      ...(queueLines.length  ? ['', t(lang, 'queue_by_worker'), ...queueLines] : []),
      ...(workerLines.length ? ['', '*Worker status (Supabase):*', ...workerLines] : []),
      '',
      `_⚡ Queue data: ${age}_`,
    ].join('\n')
  })
}

// ── /users ────────────────────────────────────────────────────────────────────

export async function handleUsers(lang: Lang): Promise<string> {
  return cachedFetch(`users:${lang}`, TTL.users, async () => {
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
  })
}

// ── /errors ───────────────────────────────────────────────────────────────────

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
    `🧾 *Error:*    \`${e.rawMessage.slice(0, 180)}\``,
    `⏱ *Time:*     \`${ts}\``,
    `⚠️ *Severity:* ${sev}`,
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
  return cachedFetch(`errors:${lang}`, TTL.errors, async () => {
    // First: check failure ring buffer for instant results
    const recentFails = getRecentFailures(20)
    const failStats   = getFailureStats()

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

    const detailed = dbReadAllDetailedErrors()
    if (detailed.length > 0) {
      const header = `📋 *Error Audit Log* — ${detailed.length} error${detailed.length !== 1 ? 's' : ''}\n\n`
      const blocks = detailed.map((e, i) => _formatDetailedError(e, i + 1))
      const pages  = _paginate(header, blocks)
      if (chatId && pages.length > 1) {
        for (let i = 1; i < pages.length; i++) await sendMessage(chatId, pages[i])
      }
      return pages[0]
    }

    // Recent failures from ring buffer
    if (recentFails.length > 0) {
      const header = `📋 *Recent Failures* — ${failStats.total} total | ${failStats.last5m} in last 5m\n\n`
      const blocks = recentFails.map((f, i) => {
        const ts  = new Date(f.ts).toISOString().replace('T', ' ').slice(11, 19) + ' UTC'
        const sev = SEVERITY_LABEL[f.severity] ?? '🟡 Medium'
        return `*#${i + 1}*\n🔧 Tool: \`${f.tool}\`\n💥 Error: \`${f.error.slice(0, 200)}\`\n⏱ Time: \`${ts}\`\n⚠️ ${sev}`
      })
      const pages = _paginate(header, blocks)
      if (chatId && pages.length > 1) {
        for (let i = 1; i < pages.length; i++) await sendMessage(chatId, pages[i])
      }
      return pages[0]
    }

    const legacy = dbReadRecentErrors(50)
    if (!legacy.length) return t(lang, 'errors_no_data')
    const header = `📋 *Error Log* — ${legacy.length} records\n\n`
    const blocks = legacy.map((e, i) => {
      const ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
      return `*#${i + 1}*\n📍 Tool: \`${e.tool}\`\n🧾 Error: \`${e.message.slice(0, 200)}\`\n⏱ Time: \`${ts}\``
    })
    const pages = _paginate(header, blocks)
    if (chatId && pages.length > 1) {
      for (let i = 1; i < pages.length; i++) await sendMessage(chatId, pages[i])
    }
    return pages[0]
  })
}

// ── /live ─────────────────────────────────────────────────────────────────────

export async function handleLive(lang: Lang): Promise<string> {
  return cachedFetch(`live:${lang}`, TTL.live, async () => {
    const [liveEvents, q] = await Promise.all([
      queryLiveEvents(10_000),
      Promise.resolve(getQueueSnapshot()),
    ])
    const local = getLiveActivity()

    if (liveEvents.length > 0) {
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
        `${t(lang, 'live_queue')}    \`${q?.active ?? 0}\``,
        `❌ Failed (10s):    \`${failed}\``,
        '',
        t(lang, 'live_tools_header'),
        ...(toolLines.length ? toolLines : [t(lang, 'live_none')]),
      ].join('\n')
    }

    const byTool = local.byTool.map((x) => `• \`${x.tool}\`: ${x.count}`)
    return [
      t(lang, 'live_title'), `_Source: in-memory buffer_`, '',
      `${t(lang, 'live_jobs')}     \`${local.recentJobs}\``,
      `${t(lang, 'live_sessions')} \`${local.activeUsers}\``,
      `${t(lang, 'live_queue')}    \`${q?.active ?? 0}\``,
      '',
      t(lang, 'live_tools_header'),
      ...(byTool.length ? byTool : [t(lang, 'live_none')]),
    ].join('\n')
  })
}

// ── /files ────────────────────────────────────────────────────────────────────

export async function handleFiles(lang: Lang): Promise<string> {
  return cachedFetch(`files:${lang}`, TTL.files, async () => {
    const f = dbReadFileStats()
    if (!f || f.total === 0) return t(lang, 'files_no_data')
    return [
      t(lang, 'files_title'), '',
      `${t(lang, 'files_total')}   \`${f.total}\``,
      `${t(lang, 'files_avg')}     \`${fmtBytes(f.avgSizeB)}\``,
      `${t(lang, 'files_largest')} \`${fmtBytes(f.maxSizeB)}\``,
      `${t(lang, 'files_top_fmt')} \`${f.topFormat.toUpperCase()}\``,
    ].join('\n')
  })
}

// ── /insights ─────────────────────────────────────────────────────────────────

export async function handleInsights(lang: Lang): Promise<string> {
  return cachedFetch(`insights:${lang}`, TTL.insights, async () => {
    const [i, supaTools] = await Promise.all([
      Promise.resolve(dbReadInsights()),
      queryToolStats(),
    ])
    const sys  = getSystemSnapshot()
    const heap = sys?.heapPct ?? Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
    const fails = getFailureStats()

    const slowestTool = supaTools?.reduce((a, b) => (a.avg_ms > b.avg_ms ? a : b), supaTools[0])
    const failingTool = supaTools?.reduce((a, b) => ((100 - a.success_rate) > (100 - b.success_rate) ? a : b), supaTools[0])

    const slowestName = slowestTool?.tool ?? i.slowest?.name ?? 'n/a'
    const slowestMs   = slowestTool?.avg_ms ?? i.slowest?.avgDurationMs ?? 0
    const failingName = failingTool?.tool ?? i.mostFailing?.name ?? 'n/a'
    const failingRate = failingTool ? Math.round(100 - failingTool.success_rate) : (i.mostFailing?.failureRate ?? 0)

    const suggestions: string[] = []
    if (slowestMs > 30_000)  suggestions.push(fmt(t(lang, 'insights_slow_worker'), { tool: slowestName }))
    if (failingRate > 10)    suggestions.push(fmt(t(lang, 'insights_high_failure'), { tool: failingName }))
    if (heap > 80)           suggestions.push(lang === 'ar' ? `⚠️ JS Heap مرتفع: \`${heap}%\`` : `⚠️ JS Heap usage is high: \`${heap}%\``)
    if (fails.last5m > 5)    suggestions.push(lang === 'ar' ? `🚨 ${fails.last5m} فشل في آخر 5 دقائق` : `🚨 ${fails.last5m} failures in last 5 minutes`)
    if (!suggestions.length) suggestions.push(t(lang, 'insights_ok'))

    return [
      t(lang, 'insights_title'),
      ...(supaTools ? ['_Source: Supabase_ ✅'] : []),
      '',
      `${t(lang, 'insights_slowest')}      \`${slowestName}\` (${ms(slowestMs)})`,
      `${t(lang, 'insights_most_failing')} \`${failingName}\` (${failingRate}%)`,
      `${t(lang, 'insights_heap')}         \`${heap}%\``,
      `🚨 ${lang === 'ar' ? 'فشل الـ 5 دقائق الأخيرة' : 'Last 5m failures'}: \`${fails.last5m}\` | ${lang === 'ar' ? 'الإجمالي' : 'Total'}: \`${fails.total}\``,
      '',
      t(lang, 'insights_suggestions'),
      ...suggestions,
    ].join('\n')
  })
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

  const testId      = `test-${Date.now().toString(36)}`
  const before      = dbReadGlobalStats()
  const countBefore = before?.totalJobs ?? 0

  recordJob({ type: 'test-pipeline', success: true, durationMs: 1, fileSizeB: 0, format: 'test', userId: testId, ts: Date.now() })
  await new Promise<void>((r) => setImmediate(r))

  const after      = dbReadGlobalStats()
  const countAfter = after?.totalJobs ?? 0
  const supaOk     = await pingSupabase()

  if (countAfter > countBefore) {
    return ar
      ? [`✅ *اختبار الاتصال نجح*`, '', `المهام قبل: \`${countBefore}\``, `المهام بعد:  \`${countAfter}\``, '', supaOk ? '✅ Supabase monitoring: متصل' : '⚠️ Supabase monitoring: غير متاح', '', '🔗 البيانات تتدفق بشكل صحيح.'].join('\n')
      : [`✅ *Pipeline Test Passed*`, '', `Jobs before: \`${countBefore}\``, `Jobs after:  \`${countAfter}\``, '', supaOk ? '✅ Supabase monitoring: connected' : '⚠️ Supabase monitoring: unavailable', '', '🔗 Data is flowing correctly.'].join('\n')
  }

  return ar
    ? '⚠️ *اختبار الاتصال: كتابة غير مؤكدة*\n\nتم الكتابة ولكن العدد لم يتغير.'
    : '⚠️ *Pipeline Test: Write Unconfirmed*\n\nWrite was called but count did not change.'
}

// ── /status ───────────────────────────────────────────────────────────────────

export async function handleStatus(lang: Lang): Promise<string> {
  return cachedFetch(`status:${lang}`, TTL.status, async () => {
    const conn    = getConnectivitySnapshot()
    const sys     = getSystemSnapshot()
    const q       = getQueueSnapshot()
    const workers = await queryWorkerStatus()

    // If connectivity snapshot is stale, do a fresh check
    const [supaOk] = await Promise.all([pingSupabase()])

    const supaLine = isMonitoringEnabled()
      ? (supaOk ? t(lang, 'status_supabase_ok') : t(lang, 'status_supabase_fail'))
      : t(lang, 'status_supabase_off')

    return [
      t(lang, 'status_title'),
      '',
      conn?.redisOk ? t(lang, 'status_redis_ok') : t(lang, 'status_redis_fail'),
      conn?.dbOk    ? t(lang, 'status_db_ok')    : t(lang, 'status_db_fail'),
      supaLine,
      fmt(t(lang, 'status_workers'), { count: q?.active ?? 0 }),
      fmt(t(lang, 'status_uptime'),  { uptime: sys?.uptime ?? '—' }),
      ...(workers.length ? ['', `*Registered workers:* ${workers.map((w) => `\`${w.worker_id}\``).join(', ')}`] : []),
      '',
      `_⚡ Connectivity: ${conn ? `${Math.round((Date.now() - conn.collectedAt) / 1000)}s old` : 'checking...'}_`,
    ].join('\n')
  })
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

// ── /help ─────────────────────────────────────────────────────────────────────

export async function handleHelp(lang: Lang): Promise<string> {
  const ar = lang === 'ar'
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
    '',
    t(lang, 'help_control'),
    t(lang, 'help_status_cmd'),
    t(lang, 'help_pause_cmd'),
    t(lang, 'help_resume_cmd'),
    t(lang, 'help_clear_cmd'),
    t(lang, 'help_language_cmd'),
    '',
    ar
      ? '📊 `dashboard` — لوحة التحكم المباشرة (⚡ فورية — بيانات محفوظة في الذاكرة)'
      : '📊 `dashboard` — Live dashboard (⚡ instant — pre-cached metrics)',
    '',
    ar
      ? '_🔄 جميع البيانات محدثة كل 6–15 ثانية تلقائياً_'
      : '_🔄 All metrics auto-refresh every 6–15s in the background_',
  ].join('\n')
}
