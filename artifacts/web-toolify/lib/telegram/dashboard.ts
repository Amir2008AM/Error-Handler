/**
 * Live Dashboard Engine
 *
 * Reads entirely from analytics-cache.ts — no live DB or queue queries.
 * All metric collection is pre-done by the background collectors.
 *
 * formatDashboard() assembles the message in microseconds from cached values.
 * If analytics-cache hasn't collected yet (< 1s after startup), it triggers
 * an immediate parallel collect and waits — then always returns real data.
 *
 * Auto-refresh sessions push updated dashboard messages every 12 s.
 * State is on globalThis to survive Next.js HMR hot-reloads.
 */

import { editMessageText } from './api'
import { dbGetLanguage } from './db'
import {
  getSystemSnapshot, getQueueSnapshot, getConnectivitySnapshot, getDbSnapshot,
  triggerAllCollectors, snapshotAge, getRecentFailures, getFailureStats,
  type SystemSnapshot, type QueueSnapshot, type ConnectivitySnapshot, type DbSnapshot,
} from './analytics-cache'
import type { Lang } from './i18n'

// ── Age label ─────────────────────────────────────────────────────────────────

function ageLabel(snap: { collectedAt: number } | null): string {
  const s = snapshotAge(snap)
  if (s < 0)   return '?'
  if (s < 2)   return 'just now'
  if (s < 60)  return `${s}s ago`
  return `${Math.round(s / 60)}m ago`
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function bar(pct: number): string {
  const n = Math.round(Math.min(100, Math.max(0, pct)) / 10)
  return '█'.repeat(n) + '░'.repeat(10 - n)
}

function ms(n: number): string {
  if (n >= 60_000) return `${(n / 60_000).toFixed(1)}m`
  if (n >= 1_000)  return `${(n / 1_000).toFixed(1)}s`
  return `${n}ms`
}

// ── Compact dashboard formatter ───────────────────────────────────────────────

export function formatDashboard(lang: Lang): string {
  const sys   = getSystemSnapshot()
  const q     = getQueueSnapshot()
  const conn  = getConnectivitySnapshot()
  const db    = getDbSnapshot()
  const ar    = lang === 'ar'
  const fails = getFailureStats()

  // All collectors not yet populated — return lightweight "first load" message
  if (!sys && !q && !db) {
    return ar
      ? '📊 *لوحة التحكم المباشرة*\n\n⏳ جاري التجميع... اضغط 🔄 للتحديث.\n\n_تأخذ البيانات أقل من ثانيتين._'
      : '📊 *Live Dashboard*\n\n⏳ Collecting first snapshot...\nPress 🔄 Refresh in 1–2 seconds.'
  }

  const cpuIcon  = (sys?.cpu  ?? 0) >= 90 ? '🔴' : (sys?.cpu  ?? 0) >= 75 ? '🟡' : '🟢'
  const memIcon  = (sys?.memPct ?? 0) >= 90 ? '🔴' : (sys?.memPct ?? 0) >= 75 ? '🟡' : '🟢'
  const heapIcon = (sys?.heapPct ?? 0) >= 85 ? '🔴' : (sys?.heapPct ?? 0) >= 70 ? '🟡' : '🟢'
  const rateIcon = (db?.successRate ?? 100) >= 95 ? '✅' : (db?.successRate ?? 100) >= 80 ? '⚠️' : '❌'
  const redisIcon = conn?.redisOk ? '🟢' : '🔴'
  const dbIcon    = conn?.dbOk    ? '🟢' : '🔴'
  const supaIcon  = conn?.supabaseOk ? '🟢' : '⚫'
  const queueWarn = (q?.waiting ?? 0) > 20 ? ' ⚠️' : ''
  const failWarn  = fails.last5m > 5 ? ` ⚠️ ${fails.last5m} in 5m` : fails.total > 0 ? ` (${fails.total} total)` : ''

  // ⚡ Last updated stamp — key UX improvement over "⏳"
  const sysAge  = ageLabel(sys)
  const qAge    = ageLabel(q)

  return [
    ar ? '📊 *لوحة التحكم المباشرة*' : '📊 *Live Dashboard*',
    '',
    ar ? `*📈 الإحصائيات:*` : `*📈 Statistics:*`,
    `• ${ar ? 'مهام اليوم' : 'Today'}: \`${db?.jobsToday ?? 0}\`  •  ${ar ? 'إجمالي' : 'Total'}: \`${db?.totalJobs ?? 0}\``,
    `• ${rateIcon} ${ar ? 'نجاح' : 'Success'}: \`${db?.successRate ?? 100}%\`  •  ❌ ${ar ? 'فاشل' : 'Failed'}: \`${db?.failedCount ?? 0}\`${failWarn}`,
    `• ⏱ ${ar ? 'متوسط' : 'Avg'}: \`${ms(db?.avgDurationMs ?? 0)}\`  •  👥 ${ar ? 'مستخدمون' : 'Users'}: \`${db?.activeUsers ?? 0}\``,
    '',
    ar ? `*⚙️ صحة النظام:* _⚡ ${sysAge}_` : `*⚙️ System Health:* _⚡ ${sysAge}_`,
    `• ${cpuIcon} CPU:  ${bar(sys?.cpu ?? 0)} \`${sys?.cpu ?? 0}%\``,
    `• ${memIcon} RAM:  ${bar(sys?.memPct ?? 0)} \`${sys?.memPct ?? 0}%\``,
    `• ${heapIcon} Heap: ${bar(sys?.heapPct ?? 0)} \`${sys?.heapPct ?? 0}%\`  •  ⏰ \`${sys?.uptime ?? '—'}\``,
    '',
    ar ? `*📦 قائمة الانتظار:*${queueWarn} _⚡ ${qAge}_` : `*📦 Queue:*${queueWarn} _⚡ ${qAge}_`,
    `• ⚡ \`${q?.active ?? 0}\` ${ar ? 'نشط' : 'active'}  ⏳ \`${q?.waiting ?? 0}\` ${ar ? 'انتظار' : 'waiting'}  ✅ \`${q?.completed ?? 0}\` ${ar ? 'مكتمل' : 'done'}  ❌ \`${q?.failed ?? 0}\` ${ar ? 'فاشل' : 'failed'}`,
    '',
    ar ? `*🔌 الاتصالات:*` : `*🔌 Connections:*`,
    `• ${redisIcon} Redis  •  ${dbIcon} DB  •  ${supaIcon} Supabase`,
    '',
    `_⚡ System: ${sysAge} | Queue: ${qAge}_`,
  ].join('\n')
}

// ── Trigger immediate snapshot (for first dashboard load) ─────────────────────

export async function triggerImmediateSnapshot(): Promise<void> {
  await triggerAllCollectors()
}

// ── Backwards-compat snapshot type (used by other files that import this) ────

export interface DashboardSnapshot {
  cpu:            number
  memPct:         number
  memUsed:        number
  memTotal:       number
  heapPct:        number
  heapUsed:       number
  heapTotal:      number
  uptime:         string
  redisOk:        boolean
  dbOk:           boolean
  queueActive:    number
  queueWaiting:   number
  queueCompleted: number
  queueFailed:    number
  queueDelayed:   number
  totalJobs:      number
  jobsToday:      number
  successRate:    number
  failedCount:    number
  avgDurationMs:  number
  activeUsers:    number
  recentJobs:     number
  updatedAt:      number
}

export function getSnapshot(): DashboardSnapshot | null {
  const sys  = getSystemSnapshot()
  const q    = getQueueSnapshot()
  const conn = getConnectivitySnapshot()
  const db   = getDbSnapshot()
  if (!sys && !q && !db) return null
  return {
    cpu:            sys?.cpu            ?? 0,
    memPct:         sys?.memPct         ?? 0,
    memUsed:        sys?.memUsed        ?? 0,
    memTotal:       sys?.memTotal       ?? 0,
    heapPct:        sys?.heapPct        ?? 0,
    heapUsed:       sys?.heapUsed       ?? 0,
    heapTotal:      sys?.heapTotal      ?? 0,
    uptime:         sys?.uptime         ?? '—',
    redisOk:        conn?.redisOk       ?? false,
    dbOk:           conn?.dbOk          ?? false,
    queueActive:    q?.active           ?? 0,
    queueWaiting:   q?.waiting          ?? 0,
    queueCompleted: q?.completed        ?? 0,
    queueFailed:    q?.failed           ?? 0,
    queueDelayed:   q?.delayed          ?? 0,
    totalJobs:      db?.totalJobs       ?? 0,
    jobsToday:      db?.jobsToday       ?? 0,
    successRate:    db?.successRate     ?? 100,
    failedCount:    db?.failedCount     ?? 0,
    avgDurationMs:  db?.avgDurationMs   ?? 0,
    activeUsers:    db?.activeUsers     ?? 0,
    recentJobs:     db?.recentJobs      ?? 0,
    updatedAt:      Math.max(
      sys?.collectedAt  ?? 0,
      q?.collectedAt    ?? 0,
      db?.collectedAt   ?? 0,
    ),
  }
}

// ── Auto-refresh live sessions ─────────────────────────────────────────────────

interface LiveSession {
  chatId:    number
  msgId:     number
  userId:    number
  cmd:       string
  startedAt: number
}

const SESSION_TTL_MS   = 15 * 60 * 1000
const REFRESH_INTERVAL = 12_000

const SESSIONS_KEY = Symbol.for('toolify.dashboard.sessions')

function getSessions(): Map<string, LiveSession> {
  const g = globalThis as Record<symbol, Map<string, LiveSession>>
  if (!g[SESSIONS_KEY]) g[SESSIONS_KEY] = new Map()
  return g[SESSIONS_KEY]
}

export function registerLiveSession(chatId: number, msgId: number, userId: number, cmd: string): void {
  getSessions().set(`${chatId}:${msgId}`, { chatId, msgId, userId, cmd, startedAt: Date.now() })
  console.log(`[Dashboard] Live session: chatId=${chatId} msgId=${msgId} cmd=${cmd}`)
}

export function unregisterLiveSession(chatId: number, msgId: number): void {
  getSessions().delete(`${chatId}:${msgId}`)
}

export function clearLiveSessionsForChat(chatId: number): void {
  for (const [key, s] of getSessions()) {
    if (s.chatId === chatId) getSessions().delete(key)
  }
}

export function hasLiveSession(chatId: number, msgId: number): boolean {
  return getSessions().has(`${chatId}:${msgId}`)
}

function dashboardKeyboard(lang: Lang, isLive: boolean) {
  const ar = lang === 'ar'
  return {
    inline_keyboard: [
      [
        { text: ar ? '🔄 تحديث' : '🔄 Refresh',  callback_data: 'refresh:dashboard' },
        {
          text:          isLive
            ? (ar ? '🔴 إيقاف المباشر' : '🔴 Stop Live')
            : (ar ? '🟢 بث مباشر' : '🟢 Go Live'),
          callback_data: isLive ? 'live:stop' : 'live:start',
        },
      ],
      [{ text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:main' }],
    ],
  }
}

async function pushRefreshes(): Promise<void> {
  const sessions = getSessions()
  const now      = Date.now()
  const toDelete: string[] = []

  for (const [key, s] of sessions) {
    if (now - s.startedAt > SESSION_TTL_MS) { toDelete.push(key); continue }
    if (s.cmd !== 'dashboard') continue
    try {
      const lang = dbGetLanguage(s.userId)
      const text = formatDashboard(lang)
      await editMessageText(s.chatId, s.msgId, text, {
        reply_markup: dashboardKeyboard(lang, true),
      })
    } catch {
      toDelete.push(key)
    }
  }

  for (const k of toDelete) sessions.delete(k)
}

// ── Engine lifecycle (globalThis for HMR safety) ───────────────────────────────

const TIMERS_KEY = Symbol.for('toolify.dashboard.timers')

interface Timers {
  refresher: ReturnType<typeof setInterval> | null
  started:   boolean
}

function getTimers(): Timers {
  const g = globalThis as Record<symbol, Timers>
  if (!g[TIMERS_KEY]) g[TIMERS_KEY] = { refresher: null, started: false }
  return g[TIMERS_KEY]
}

export function startDashboardEngine(): void {
  const t = getTimers()
  if (t.started) return

  // Analytics cache must be started first (done in instrumentation.ts)
  t.refresher = setInterval(() => { void pushRefreshes() }, REFRESH_INTERVAL)
  if (t.refresher?.unref) t.refresher.unref()
  t.started = true

  console.log('[Dashboard] Engine started — live session push every 12s')
}

export function stopDashboardEngine(): void {
  const t = getTimers()
  if (t.refresher) { clearInterval(t.refresher); t.refresher = null }
  t.started = false
}
