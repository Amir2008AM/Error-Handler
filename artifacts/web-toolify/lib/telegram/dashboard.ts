/**
 * Live Dashboard Engine
 *
 * Responsibilities:
 *  1. Background snapshot collector — runs every 15 s, stores aggregated
 *     system metrics in cache so every bot command reads from memory, never
 *     hitting the database directly on each button press.
 *
 *  2. Compact dashboard formatter — produces a single multi-metric message
 *     suitable for the bot's main dashboard view.
 *
 *  3. Auto-refresh live sessions — tracks (chatId, msgId) pairs and pushes
 *     updated dashboard content via editMessageText every 12 s.
 *
 * Safety:
 *  - All intervals use .unref() so they never block Node exit.
 *  - Every async operation is wrapped in try/catch — failures are logged,
 *    never propagated to the main server.
 *  - State is stored on globalThis so it survives Next.js HMR hot reloads.
 */

import { editMessageText } from './api'
import { dbGetLanguage } from './db'
import {
  getCpuPercent, getMemoryInfo, getQueueCounts,
  pingRedis, pingDb, fmtBytes, fmtUptime,
} from './metrics'
import { dbReadGlobalStats } from './db'
import { getLiveActivity } from './analytics'
import { cacheGet, cacheSet } from './cache'
import type { Lang } from './i18n'

// ── Snapshot ──────────────────────────────────────────────────────────────────

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

const SNAPSHOT_KEY = 'dashboard:snapshot'
const SNAPSHOT_TTL = 25_000

async function collectSnapshot(): Promise<void> {
  try {
    const [cpu, queue, redisOk, dbOk] = await Promise.all([
      getCpuPercent(),
      getQueueCounts(),
      pingRedis(),
      pingDb(),
    ])

    const mem    = getMemoryInfo()
    const jsHeap = process.memoryUsage()
    const heapPct = Math.round((jsHeap.heapUsed / jsHeap.heapTotal) * 100)
    const stats   = dbReadGlobalStats()
    const live    = getLiveActivity()

    const snap: DashboardSnapshot = {
      cpu,
      memPct:         mem.pct,
      memUsed:        mem.used,
      memTotal:       mem.total,
      heapPct,
      heapUsed:       jsHeap.heapUsed,
      heapTotal:      jsHeap.heapTotal,
      uptime:         fmtUptime(Math.floor(process.uptime())),
      redisOk,
      dbOk,
      queueActive:    queue.active,
      queueWaiting:   queue.waiting,
      queueCompleted: queue.completed,
      queueFailed:    queue.failed,
      queueDelayed:   queue.delayed,
      totalJobs:      stats?.totalJobs     ?? 0,
      jobsToday:      stats?.jobsToday     ?? 0,
      successRate:    stats?.successRate   ?? 100,
      failedCount:    stats?.failedCount   ?? 0,
      avgDurationMs:  stats?.avgDurationMs ?? 0,
      activeUsers:    live.activeUsers,
      recentJobs:     live.recentJobs,
      updatedAt:      Date.now(),
    }

    cacheSet(SNAPSHOT_KEY, snap, SNAPSHOT_TTL)
  } catch (err) {
    console.warn('[Dashboard] Collect error (non-fatal):', (err as Error).message)
  }
}

export function getSnapshot(): DashboardSnapshot | null {
  return cacheGet<DashboardSnapshot>(SNAPSHOT_KEY) ?? null
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
  const s  = getSnapshot()
  const ar = lang === 'ar'

  if (!s) {
    return ar
      ? '📊 *لوحة التحكم المباشرة*\n\n⏳ جاري جمع البيانات...\n\nاضغط 🔄 للتحديث.'
      : '📊 *Live Dashboard*\n\n⏳ Collecting data...\n\nPress 🔄 Refresh in a moment.'
  }

  const ts          = new Date(s.updatedAt).toISOString().replace('T', ' ').slice(11, 19) + ' UTC'
  const redisIcon   = s.redisOk ? '🟢' : '🔴'
  const dbIcon      = s.dbOk    ? '🟢' : '🔴'
  const rateIcon    = s.successRate >= 95 ? '✅' : s.successRate >= 80 ? '⚠️' : '❌'
  const cpuIcon     = s.cpu  >= 90 ? '🔴' : s.cpu  >= 75 ? '🟡' : '🟢'
  const memIcon     = s.memPct >= 90 ? '🔴' : s.memPct >= 75 ? '🟡' : '🟢'
  const heapIcon    = s.heapPct >= 85 ? '🔴' : s.heapPct >= 70 ? '🟡' : '🟢'
  const queueAlert  = s.queueWaiting > 20 ? ' ⚠️' : ''

  return [
    ar ? '📊 *لوحة التحكم المباشرة*' : '📊 *Live Dashboard*',
    '',
    ar ? '*📈 الإحصائيات:*' : '*📈 Statistics:*',
    `• ${ar ? 'مهام اليوم' : 'Today'}: \`${s.jobsToday}\`  •  ${ar ? 'إجمالي' : 'Total'}: \`${s.totalJobs}\``,
    `• ${rateIcon} ${ar ? 'نجاح' : 'Success'}: \`${s.successRate}%\`  •  ❌ ${ar ? 'فاشل' : 'Failed'}: \`${s.failedCount}\``,
    `• ⏱ ${ar ? 'متوسط' : 'Avg'}: \`${ms(s.avgDurationMs)}\`  •  👥 ${ar ? 'مستخدمون' : 'Users'}: \`${s.activeUsers}\``,
    '',
    ar ? '*⚙️ صحة النظام:*' : '*⚙️ System Health:*',
    `• ${cpuIcon} CPU:  ${bar(s.cpu)} \`${s.cpu}%\``,
    `• ${memIcon} RAM:  ${bar(s.memPct)} \`${s.memPct}%\` (${fmtBytes(s.memUsed)} / ${fmtBytes(s.memTotal)})`,
    `• ${heapIcon} Heap: ${bar(s.heapPct)} \`${s.heapPct}%\`  •  ⏰ \`${s.uptime}\``,
    '',
    ar ? '*📦 قائمة الانتظار:*' : `*📦 Queue:*${queueAlert}`,
    `• ⚡ \`${s.queueActive}\` ${ar ? 'نشط' : 'active'}  ⏳ \`${s.queueWaiting}\` ${ar ? 'انتظار' : 'waiting'}  ✅ \`${s.queueCompleted}\` ${ar ? 'مكتمل' : 'done'}  ❌ \`${s.queueFailed}\` ${ar ? 'فاشل' : 'failed'}`,
    '',
    ar ? '*🔌 الاتصالات:*' : '*🔌 Connections:*',
    `• ${redisIcon} Redis  •  ${dbIcon} ${ar ? 'قاعدة البيانات' : 'Database'}`,
    '',
    `_🕐 ${ts}_`,
  ].join('\n')
}

// ── Auto-refresh live sessions ────────────────────────────────────────────────

interface LiveSession {
  chatId:    number
  msgId:     number
  userId:    number
  cmd:       string
  startedAt: number
}

const SESSION_TTL_MS   = 15 * 60 * 1000  // 15 min max
const REFRESH_INTERVAL = 12_000          // push update every 12 s

const SESSIONS_KEY = Symbol.for('toolify.dashboard.sessions')

function getSessions(): Map<string, LiveSession> {
  const g = globalThis as Record<symbol, Map<string, LiveSession>>
  if (!g[SESSIONS_KEY]) g[SESSIONS_KEY] = new Map()
  return g[SESSIONS_KEY]
}

export function registerLiveSession(
  chatId: number,
  msgId:  number,
  userId: number,
  cmd:    string,
): void {
  getSessions().set(`${chatId}:${msgId}`, { chatId, msgId, userId, cmd, startedAt: Date.now() })
  console.log(`[Dashboard] Live session registered: chatId=${chatId} msgId=${msgId} cmd=${cmd}`)
}

export function unregisterLiveSession(chatId: number, msgId: number): void {
  getSessions().delete(`${chatId}:${msgId}`)
  console.log(`[Dashboard] Live session removed: chatId=${chatId} msgId=${msgId}`)
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
        { text: '🔄 Refresh',         callback_data: 'refresh:dashboard' },
        {
          text:          isLive ? (ar ? '🔴 إيقاف التحديث' : '🔴 Stop Live') : (ar ? '🟢 مباشر' : '🟢 Go Live'),
          callback_data: isLive ? 'live:stop' : 'live:start',
        },
      ],
      [{ text: ar ? '◀️ رجوع' : '◀️ Back', callback_data: 'menu:main' }],
    ],
  }
}

async function pushRefreshes(): Promise<void> {
  const sessions  = getSessions()
  const now       = Date.now()
  const toDelete: string[] = []

  for (const [key, s] of sessions) {
    if (now - s.startedAt > SESSION_TTL_MS) { toDelete.push(key); continue }

    try {
      if (s.cmd !== 'dashboard') continue
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

// ── Lifecycle — stored on globalThis to survive HMR ──────────────────────────

const TIMERS_KEY = Symbol.for('toolify.dashboard.timers')

interface Timers {
  collector: ReturnType<typeof setInterval> | null
  refresher: ReturnType<typeof setInterval> | null
}

function getTimers(): Timers {
  const g = globalThis as Record<symbol, Timers>
  if (!g[TIMERS_KEY]) g[TIMERS_KEY] = { collector: null, refresher: null }
  return g[TIMERS_KEY]
}

export function startDashboardEngine(): void {
  const timers = getTimers()
  if (timers.collector) return  // already running (HMR guard)

  void collectSnapshot()  // immediate first snapshot

  timers.collector = setInterval(() => { void collectSnapshot() }, 15_000)
  timers.refresher = setInterval(() => { void pushRefreshes() }, REFRESH_INTERVAL)

  if (timers.collector.unref) timers.collector.unref()
  if (timers.refresher?.unref) timers.refresher.unref()

  console.log('[Dashboard] Engine started — snapshot every 15s, push every 12s')
}

export function stopDashboardEngine(): void {
  const timers = getTimers()
  if (timers.collector) { clearInterval(timers.collector); timers.collector = null }
  if (timers.refresher) { clearInterval(timers.refresher); timers.refresher = null }
}
