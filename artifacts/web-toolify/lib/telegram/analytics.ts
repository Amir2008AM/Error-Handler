/**
 * Analytics Store
 *
 * Lightweight in-memory analytics — persisted only for the lifetime of
 * the server process (no DB required). The bot reads from this store.
 * The rest of the app writes to it via recordJob() / recordError().
 */

export interface JobRecord {
  type:       string
  success:    boolean
  durationMs: number
  fileSizeB:  number
  format:     string   // e.g. 'pdf', 'jpg', 'png', 'docx'
  userId:     string   // hashed/anonymous session id
  ts:         number
}

export interface ErrorRecord {
  tool:    string
  message: string
  ts:      number
}

// ── In-memory ring buffers ───────────────────────────────────────────────────

const MAX_JOBS   = 10_000
const MAX_ERRORS = 500

const jobs:   JobRecord[]   = []
const errors: ErrorRecord[] = []

// Per-user counters: userId → count
const userCounts = new Map<string, number>()

// ── Write API (called from processing pipeline) ──────────────────────────────

export function recordJob(record: JobRecord): void {
  jobs.push(record)
  if (jobs.length > MAX_JOBS) jobs.splice(0, jobs.length - MAX_JOBS)
  userCounts.set(record.userId, (userCounts.get(record.userId) ?? 0) + 1)
}

export function recordError(tool: string, message: string): void {
  errors.push({ tool, message, ts: Date.now() })
  if (errors.length > MAX_ERRORS) errors.splice(0, errors.length - MAX_ERRORS)
}

// ── Read API (called from bot commands) ─────────────────────────────────────

export interface GlobalStats {
  totalJobs:    number
  jobsToday:    number
  successCount: number
  failedCount:  number
  successRate:  number
  avgDurationMs: number
  totalUsers:   number
  activeUsers24h: number
  totalFilesProcessed: number
}

export function getGlobalStats(): GlobalStats {
  const now    = Date.now()
  const day    = 86_400_000
  const today  = jobs.filter((j) => now - j.ts < day)
  const success = jobs.filter((j) => j.success)
  const failed  = jobs.filter((j) => !j.success)

  const activeUsers24h = new Set(today.map((j) => j.userId)).size

  const avgDurationMs = success.length
    ? Math.round(success.reduce((a, j) => a + j.durationMs, 0) / success.length)
    : 0

  return {
    totalJobs:           jobs.length,
    jobsToday:           today.length,
    successCount:        success.length,
    failedCount:         failed.length,
    successRate:         jobs.length ? Math.round((success.length / jobs.length) * 100) : 100,
    avgDurationMs,
    totalUsers:          userCounts.size,
    activeUsers24h,
    totalFilesProcessed: jobs.length,
  }
}

export interface ToolStat {
  name:         string
  count:        number
  successRate:  number
  avgDurationMs: number
  failureRate:  number
}

export function getToolStats(): ToolStat[] {
  const byTool = new Map<string, { total: number; success: number; durationSum: number }>()
  for (const j of jobs) {
    const s = byTool.get(j.type) ?? { total: 0, success: 0, durationSum: 0 }
    s.total++
    if (j.success) { s.success++; s.durationSum += j.durationMs }
    byTool.set(j.type, s)
  }
  return [...byTool.entries()]
    .map(([name, s]) => ({
      name,
      count:         s.total,
      successRate:   s.total ? Math.round((s.success / s.total) * 100) : 100,
      avgDurationMs: s.success ? Math.round(s.durationSum / s.success) : 0,
      failureRate:   s.total ? Math.round(((s.total - s.success) / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

export interface UserStat {
  userId: string
  count:  number
}

export function getUserStats(): { total: number; newToday: number; top: UserStat[] } {
  const now   = Date.now()
  const day   = 86_400_000
  const newIds = new Set(jobs.filter((j) => now - j.ts < day).map((j) => j.userId))
  const top    = [...userCounts.entries()]
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  return { total: userCounts.size, newToday: newIds.size, top }
}

export function getRecentErrors(n = 10): ErrorRecord[] {
  return errors.slice(-n).reverse()
}

export function getLiveActivity() {
  const now   = Date.now()
  const recent = jobs.filter((j) => now - j.ts < 60_000)
  const byTool = new Map<string, number>()
  for (const j of recent) byTool.set(j.type, (byTool.get(j.type) ?? 0) + 1)
  return {
    recentJobs:  recent.length,
    activePeriod: '60s',
    byTool:      [...byTool.entries()].map(([tool, count]) => ({ tool, count })),
    activeUsers: new Set(recent.map((j) => j.userId)).size,
  }
}

export function getFileStats() {
  if (!jobs.length) return { total: 0, avgSizeB: 0, maxSizeB: 0, topFormat: 'n/a' }
  const total    = jobs.length
  const avgSizeB = Math.round(jobs.reduce((a, j) => a + j.fileSizeB, 0) / total)
  const maxSizeB = Math.max(...jobs.map((j) => j.fileSizeB))
  const fmtCounts = new Map<string, number>()
  for (const j of jobs) fmtCounts.set(j.format, (fmtCounts.get(j.format) ?? 0) + 1)
  const topFormat = [...fmtCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'n/a'
  return { total, avgSizeB, maxSizeB, topFormat }
}

export function getInsights() {
  const toolStats   = getToolStats()
  const slowest     = [...toolStats].sort((a, b) => b.avgDurationMs - a.avgDurationMs)[0]
  const mostFailing = [...toolStats].sort((a, b) => b.failureRate - a.failureRate)[0]
  const { pct: memPct } = (() => {
    const total = process.memoryUsage().heapTotal
    const used  = process.memoryUsage().heapUsed
    return { pct: Math.round((used / total) * 100) }
  })()
  return { slowest, mostFailing, memPct }
}
