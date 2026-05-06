/**
 * Bot Command Handlers
 *
 * Each handler is async and returns a Markdown string.
 * Historical data comes from SQLite (persistent across restarts).
 * Real-time /live data comes from the in-memory ring buffer.
 * All fallback gracefully to "No data yet" if the DB is unavailable.
 */

import { getLiveActivity } from './analytics'
import {
  dbReadGlobalStats, dbReadToolStats, dbReadRecentErrors,
  dbReadFileStats, dbReadUserStats, dbReadInsights,
} from './db'
import {
  getCpuPercent, getDiskUsage, getMemoryInfo,
  getQueueCounts, fmtBytes, fmtUptime,
} from './metrics'
import { pauseAllQueues, resumeAllQueues, clearAllQueues } from './worker-control'

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
export async function handleStats(): Promise<string> {
  const s = dbReadGlobalStats()
  if (!s) return '📈 *Global Statistics*\n\nNo data yet — process some files first.'
  return [
    '📈 *Global Statistics*',
    '',
    `👥 Total users:      \`${s.totalUsers}\``,
    `🟢 Active (24h):     \`${s.activeUsers24h}\``,
    `📁 Files processed:  \`${s.totalJobs}\``,
    `📦 Jobs today:       \`${s.jobsToday}\``,
    `✅ Success rate:     \`${s.successRate}%\``,
    `❌ Failed jobs:      \`${s.failedCount}\``,
    `⏱ Avg processing:   \`${ms(s.avgDurationMs)}\``,
  ].join('\n')
}

// ── /health ──────────────────────────────────────────────────────────────────
export async function handleHealth(): Promise<string> {
  const [cpu, disk, queue] = await Promise.all([
    getCpuPercent(),
    getDiskUsage(),
    getQueueCounts(),
  ])
  const mem    = getMemoryInfo()
  const uptime = fmtUptime(Math.floor(process.uptime()))

  return [
    '⚙️ *System Health*',
    '',
    `🖥 CPU:    ${bar(cpu)} \`${cpu}%\``,
    `🧠 Memory: ${bar(mem.pct)} \`${mem.pct}%\` (${fmtBytes(mem.used)} / ${fmtBytes(mem.total)})`,
    `💾 Disk:   ${bar(disk.pct)} \`${disk.pct}%\` (${fmtBytes(disk.used)} / ${fmtBytes(disk.total)})`,
    `⏰ Uptime: \`${uptime}\``,
    '',
    `⚡ Active jobs:  \`${queue.active}\``,
    `🕐 Waiting jobs: \`${queue.waiting}\``,
    `✅ Completed:    \`${queue.completed}\``,
    `❌ Failed:       \`${queue.failed}\``,
  ].join('\n')
}

// ── /tools ───────────────────────────────────────────────────────────────────
export async function handleTools(): Promise<string> {
  const stats = dbReadToolStats()
  if (!stats.length) return '🧰 *Tool Analytics*\n\nNo data yet — process some files first.'
  const lines = stats.slice(0, 15).map((t) =>
    `• \`${t.name}\` → ${t.count} uses | ${t.successRate}% success | ${ms(t.avgDurationMs)} avg`
  )
  return ['🧰 *Tool Analytics*', '', ...lines].join('\n')
}

// ── /queue ───────────────────────────────────────────────────────────────────
export async function handleQueue(): Promise<string> {
  const q = await getQueueCounts()
  const lines = Object.entries(q.byQueue).map(([name, c]) => {
    const short = name.replace('toolify-', '')
    return `• \`${short}\`: ⏳${c.waiting} ⚡${c.active} ✅${c.completed} ❌${c.failed}`
  })
  return [
    '📦 *Queue Status*',
    '',
    `⏳ Waiting:   \`${q.waiting}\``,
    `⚡ Active:    \`${q.active}\``,
    `✅ Completed: \`${q.completed}\``,
    `❌ Failed:    \`${q.failed}\``,
    `🔄 Delayed:   \`${q.delayed}\``,
    '',
    '*By worker group:*',
    ...lines,
  ].join('\n')
}

// ── /users ───────────────────────────────────────────────────────────────────
export async function handleUsers(): Promise<string> {
  const u = dbReadUserStats()
  if (!u) return '👤 *User Analytics*\n\nNo data yet.'
  const topLines = u.top.slice(0, 5).map((x, i) =>
    `${i + 1}. \`${x.userId.slice(0, 8)}…\` — ${x.count} requests`
  )
  return [
    '👤 *User Analytics*',
    '',
    `📊 Total sessions: \`${u.total}\``,
    `🆕 New today:      \`${u.newToday}\``,
    '',
    '*Top users (by requests):*',
    ...(topLines.length ? topLines : ['No data yet.']),
  ].join('\n')
}

// ── /errors ──────────────────────────────────────────────────────────────────
export async function handleErrors(): Promise<string> {
  const errs = dbReadRecentErrors(10)
  if (!errs.length) return '❌ *Error Tracking*\n\nNo errors recorded — great sign! ✅'
  const lines = errs.map((e) => {
    const t = new Date(e.ts).toISOString().slice(11, 19)
    return `• \`${t}\` [${e.tool}] ${e.message.slice(0, 120)}`
  })
  return ['❌ *Last 10 Errors* _(persistent across restarts)_', '', ...lines].join('\n')
}

// ── /live ────────────────────────────────────────────────────────────────────
export async function handleLive(): Promise<string> {
  // /live uses in-memory only — real-time last 60 s
  const live  = getLiveActivity()
  const queue = await getQueueCounts()
  const byTool = live.byTool.map((x) => `• \`${x.tool}\`: ${x.count} jobs`)
  return [
    '🚀 *Live Activity (last 60s)*',
    '',
    `📦 Jobs processed:          \`${live.recentJobs}\``,
    `👥 Active sessions:         \`${live.activeUsers}\``,
    `⚡ Currently active in queue: \`${queue.active}\``,
    '',
    '*Tools in use:*',
    ...(byTool.length ? byTool : ['None right now.']),
  ].join('\n')
}

// ── /files ───────────────────────────────────────────────────────────────────
export async function handleFiles(): Promise<string> {
  const f = dbReadFileStats()
  if (!f || f.total === 0) return '📁 *File Statistics*\n\nNo files processed yet.'
  return [
    '📁 *File Statistics* _(persistent)_',
    '',
    `📊 Total uploaded:    \`${f.total}\``,
    `📏 Avg file size:     \`${fmtBytes(f.avgSizeB)}\``,
    `🏋️ Largest file:      \`${fmtBytes(f.maxSizeB)}\``,
    `🏆 Most used format:  \`${f.topFormat.toUpperCase()}\``,
  ].join('\n')
}

// ── /insights ────────────────────────────────────────────────────────────────
export async function handleInsights(): Promise<string> {
  const i = dbReadInsights()
  const mem = process.memoryUsage()
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100)

  const suggestions: string[] = []
  if ((i.slowest?.avgDurationMs ?? 0) > 30_000) {
    suggestions.push(`• \`${i.slowest!.name}\` is slow — consider increasing worker concurrency`)
  }
  if ((i.mostFailing?.failureRate ?? 0) > 10) {
    suggestions.push(`• \`${i.mostFailing!.name}\` has high failure rate — check server logs`)
  }
  if (!suggestions.length) suggestions.push('• No critical bottlenecks detected ✅')

  return [
    '🧠 *Performance Insights* _(from full history)_',
    '',
    `🐢 Slowest tool:  \`${i.slowest?.name ?? 'n/a'}\` (${ms(i.slowest?.avgDurationMs ?? 0)} avg)`,
    `💥 Most failing:  \`${i.mostFailing?.name ?? 'n/a'}\` (${i.mostFailing?.failureRate ?? 0}% fail rate)`,
    `🧠 Heap usage:    \`${heapPct}%\``,
    '',
    '*Suggestions:*',
    ...suggestions,
  ].join('\n')
}

// ── /pause-workers ───────────────────────────────────────────────────────────
export async function handlePauseWorkers(): Promise<string> {
  await pauseAllQueues()
  return '🛑 *All queues paused.*\nNew jobs will wait. Use /resume-workers to continue.'
}

// ── /resume-workers ──────────────────────────────────────────────────────────
export async function handleResumeWorkers(): Promise<string> {
  await resumeAllQueues()
  return '▶️ *All queues resumed.*\nWorkers are processing jobs again.'
}

// ── /clear-queue ─────────────────────────────────────────────────────────────
export async function handleClearQueue(): Promise<string> {
  const removed = await clearAllQueues()
  return `🧹 *Queue cleared.*\nRemoved \`${removed}\` waiting jobs.`
}

// ── /help ────────────────────────────────────────────────────────────────────
export async function handleHelp(): Promise<string> {
  return [
    '🤖 *Toolify Admin Bot*',
    '_(All stats persist across server restarts via SQLite)_',
    '',
    '*Analytics:*',
    '`/stats` — Global platform statistics',
    '`/health` — CPU, memory, disk, uptime',
    '`/tools` — Per-tool usage & success rates',
    '`/queue` — Queue depths per worker group',
    '`/users` — User counts & top sessions',
    '`/errors` — Last 10 errors',
    '`/live` — Real-time activity (last 60s)',
    '`/files` — File upload statistics',
    '`/insights` — Bottleneck detection',
    '',
    '*Control:*',
    '`/pause-workers` — Pause all queues',
    '`/resume-workers` — Resume all queues',
    '`/clear-queue` — Remove all waiting jobs',
  ].join('\n')
}
