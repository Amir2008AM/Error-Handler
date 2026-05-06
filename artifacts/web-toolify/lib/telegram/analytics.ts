/**
 * Analytics Store
 *
 * Two-layer architecture:
 *  1. In-memory ring buffer  → used ONLY for /live (last 60 s of activity).
 *     Fast, zero-latency, ephemeral.
 *  2. SQLite (db.ts)         → persistent store for all historical queries.
 *     Writes are fire-and-forget (setImmediate), never block the job pipeline.
 *
 * The rest of the app calls recordJob() / recordError().
 * Commands read from SQLite (see commands.ts + db.ts).
 *
 * SCOPE: bot analytics ONLY — no core system data lives here.
 */

import { dbWriteJob, dbWriteError, dbWriteFileStat } from './db'

export interface JobRecord {
  type:       string
  success:    boolean
  durationMs: number
  fileSizeB:  number
  format:     string   // e.g. 'pdf', 'jpg', 'png', 'docx'
  userId:     string   // anonymised session id — no PII
  ts:         number
}

export interface ErrorRecord {
  tool:    string
  message: string
  ts:      number
}

// ── In-memory ring buffer (live view only) ───────────────────────────────────
// Kept short intentionally — /live only needs last 60 s.
const LIVE_WINDOW_MS = 60_000
const MAX_LIVE_JOBS  = 2_000   // hard cap to bound memory

const liveJobs: JobRecord[] = []

// ── Write API (called from job-processor.ts) ─────────────────────────────────

export function recordJob(record: JobRecord): void {
  // 1. In-memory (sync, for /live)
  liveJobs.push(record)
  if (liveJobs.length > MAX_LIVE_JOBS) liveJobs.shift()

  // 2. SQLite persistence (non-blocking, fire-and-forget via setImmediate)
  console.log(
    `[Analytics] recordJob → type=${record.type} success=${record.success} ` +
    `duration=${record.durationMs}ms size=${record.fileSizeB}B format=${record.format}`
  )
  dbWriteJob(
    record.userId,
    record.type,
    record.success ? 'success' : 'failed',
    record.durationMs,
    record.fileSizeB,
    record.format,
  )

  // 3. File stat (separate table for file-level analytics)
  if (record.fileSizeB > 0) {
    dbWriteFileStat(record.fileSizeB, record.format)
  }
}

export function recordError(tool: string, message: string): void {
  console.log(`[Analytics] recordError → tool=${tool} message=${message.slice(0, 80)}`)
  dbWriteError(tool, message)
}


// ── Live read API (in-memory only — used by /live command) ───────────────────

export function getLiveActivity() {
  const cutoff = Date.now() - LIVE_WINDOW_MS
  const recent = liveJobs.filter((j) => j.ts >= cutoff)
  const byTool = new Map<string, number>()
  for (const j of recent) byTool.set(j.type, (byTool.get(j.type) ?? 0) + 1)
  return {
    recentJobs:  recent.length,
    activePeriod: '60s',
    byTool:      [...byTool.entries()].map(([tool, count]) => ({ tool, count })),
    activeUsers: new Set(recent.map((j) => j.userId)).size,
  }
}
