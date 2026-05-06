/**
 * Bot Command Handlers
 *
 * Each handler receives a chatId and returns a Markdown string.
 * All I/O is async. No blocking calls.
 */

import {
  getGlobalStats, getToolStats, getUserStats,
  getRecentErrors, getLiveActivity, getFileStats, getInsights,
} from './analytics'
import {
  getCpuPercent, getDiskUsage, getMemoryInfo,
  getQueueCounts, fmtBytes, fmtUptime,
} from './metrics'
import { pauseAllQueues, resumeAllQueues, clearAllQueues } from './worker-control'

function ms(ms: number): string {
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`
  if (ms >= 1_000)  return `${(ms / 1_000).toFixed(1)}s`
  return `${ms}ms`
}

// ── /stats ───────────────────────────────────────────────────────────────────
export async function handleStats(): Promise<string> {
  const s = getGlobalStats()
  return [
    '📈 *Global Statistics*',
    '',
    `👥 Total users: \`${s.totalUsers}\``,
    `🟢 Active (24h): \`${s.activeUsers24h}\``,
    `📁 Files processed: \`${s.totalFilesProcessed}\``,
    `📦 Jobs today: \`${s.jobsToday}\``,
    `✅ Success rate: \`${s.successRate}%\``,
    `❌ Failed jobs: \`${s.failedCount}\``,
    `⏱ Avg processing: \`${ms(s.avgDurationMs)}\``,
  ].join('\n')
}

// ── /health ──────────────────────────────────────────────────────────────────
export async function handleHealth(): Promise<string> {
  const [cpu, disk, queue] = await Promise.all([
    getCpuPercent(),
    getDiskUsage(),
    getQueueCounts(),
  ])
  const mem = getMemoryInfo()
  const uptime = fmtUptime(Math.floor(process.uptime()))

  const cpuBar  = bar(cpu)
  const memBar  = bar(mem.pct)
  const diskBar = bar(disk.pct)

  const activeWorkers = queue.active
  const queueWaiting  = queue.waiting

  return [
    '⚙️ *System Health*',
    '',
    `🖥 CPU:    ${cpuBar} \`${cpu}%\``,
    `🧠 Memory: ${memBar} \`${mem.pct}%\` (${fmtBytes(mem.used)} / ${fmtBytes(mem.total)})`,
    `💾 Disk:   ${diskBar} \`${disk.pct}%\` (${fmtBytes(disk.used)} / ${fmtBytes(disk.total)})`,
    `⏰ Uptime: \`${uptime}\``,
    '',
    `⚡ Active jobs: \`${activeWorkers}\``,
    `🕐 Waiting jobs: \`${queueWaiting}\``,
    `✅ Completed: \`${queue.completed}\``,
    `❌ Failed: \`${queue.failed}\``,
  ].join('\n')
}

function bar(pct: number): string {
  const filled = Math.round(pct / 10)
  return '█'.repeat(filled) + '░'.repeat(10 - filled)
}

// ── /tools ───────────────────────────────────────────────────────────────────
export async function handleTools(): Promise<string> {
  const stats = getToolStats()
  if (!stats.length) return '🧰 *Tool Analytics*\n\nNo data yet.'
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
  const u = getUserStats()
  const topLines = u.top.slice(0, 5).map((x, i) =>
    `${i + 1}. \`${x.userId.slice(0, 8)}…\` — ${x.count} requests`
  )
  return [
    '👤 *User Analytics*',
    '',
    `📊 Total users: \`${u.total}\``,
    `🆕 New today:   \`${u.newToday}\``,
    '',
    '*Top users (by requests):*',
    ...(topLines.length ? topLines : ['No data yet.']),
  ].join('\n')
}

// ── /errors ──────────────────────────────────────────────────────────────────
export async function handleErrors(): Promise<string> {
  const errs = getRecentErrors(10)
  if (!errs.length) return '❌ *Error Tracking*\n\nNo errors recorded.'
  const lines = errs.map((e) => {
    const t = new Date(e.ts).toISOString().slice(11, 19)
    return `• \`${t}\` [${e.tool}] ${e.message.slice(0, 120)}`
  })
  return ['❌ *Last 10 Errors*', '', ...lines].join('\n')
}

// ── /live ────────────────────────────────────────────────────────────────────
export async function handleLive(): Promise<string> {
  const live  = getLiveActivity()
  const queue = await getQueueCounts()
  const byTool = live.byTool.map((x) => `• \`${x.tool}\`: ${x.count} jobs`)
  return [
    '🚀 *Live Activity (last 60s)*',
    '',
    `📦 Jobs processed: \`${live.recentJobs}\``,
    `👥 Active users: \`${live.activeUsers}\``,
    `⚡ Currently active in queue: \`${queue.active}\``,
    '',
    '*Tools in use:*',
    ...(byTool.length ? byTool : ['None right now.']),
  ].join('\n')
}

// ── /files ───────────────────────────────────────────────────────────────────
export async function handleFiles(): Promise<string> {
  const f = getFileStats()
  return [
    '📁 *File Statistics*',
    '',
    `📊 Total uploaded: \`${f.total}\``,
    `📏 Avg file size:  \`${fmtBytes(f.avgSizeB)}\``,
    `🏋️ Largest file:   \`${fmtBytes(f.maxSizeB)}\``,
    `🏆 Most used format: \`${f.topFormat.toUpperCase()}\``,
  ].join('\n')
}

// ── /insights ────────────────────────────────────────────────────────────────
export async function handleInsights(): Promise<string> {
  const i = getInsights()
  return [
    '🧠 *Performance Insights*',
    '',
    `🐢 Slowest tool: \`${i.slowest?.name ?? 'n/a'}\` (${ms(i.slowest?.avgDurationMs ?? 0)} avg)`,
    `💥 Most failing: \`${i.mostFailing?.name ?? 'n/a'}\` (${i.mostFailing?.failureRate ?? 0}% fail rate)`,
    `🧠 Heap usage:   \`${i.memPct}%\``,
    '',
    '*Suggestions:*',
    ...(i.slowest?.avgDurationMs ?? 0) > 30_000
      ? [`• \`${i.slowest!.name}\` is slow — consider increasing worker concurrency`]
      : ['• No critical bottlenecks detected ✅'],
    ...(i.mostFailing?.failureRate ?? 0) > 10
      ? [`• \`${i.mostFailing!.name}\` has high failure rate — check logs`]
      : [],
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
    '',
    '*Analytics:*',
    '`/stats` — Global platform statistics',
    '`/health` — CPU, memory, disk, uptime',
    '`/tools` — Per-tool usage & success rates',
    '`/queue` — Queue depths per worker group',
    '`/users` — User counts & top users',
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
