/**
 * Analytics Store
 *
 * Two-layer architecture:
 *  1. In-memory ring buffer  → /live (last 10s). Fast, ephemeral.
 *  2. SQLite (db.ts)         → persistent history. Fire-and-forget writes.
 *  3. Supabase (monitoring/) → cross-restart observability. Fire-and-forget.
 *
 * SCOPE: bot analytics ONLY — no core system data lives here.
 */

import { dbWriteJob, dbWriteError, dbWriteFileStat } from './db'
import { emitEvent, emitError } from '../monitoring/emitter'

export interface JobRecord {
  type:       string
  success:    boolean
  durationMs: number
  fileSizeB:  number
  format:     string
  userId:     string
  ts:         number
}

export interface ErrorRecord {
  tool:    string
  message: string
  ts:      number
}

// ── In-memory ring buffer (live view only) ────────────────────────────────────
const LIVE_WINDOW_MS = 10_000
const MAX_LIVE_JOBS  = 2_000

const liveJobs: JobRecord[] = []

// ── Write API ─────────────────────────────────────────────────────────────────

export function recordJob(record: JobRecord): void {
  // 1. In-memory (sync, for /live)
  liveJobs.push(record)
  if (liveJobs.length > MAX_LIVE_JOBS) liveJobs.shift()

  // 2. SQLite (fire-and-forget)
  dbWriteJob(
    record.userId,
    record.type,
    record.success ? 'success' : 'failed',
    record.durationMs,
    record.fileSizeB,
    record.format,
  )

  // 3. File stat
  if (record.fileSizeB > 0) dbWriteFileStat(record.fileSizeB, record.format)

  // 4. Supabase monitoring (fire-and-forget — never blocks)
  emitEvent({
    event_type:  record.success ? 'job_completed' : 'job_failed',
    tool:        record.type,
    status:      record.success ? 'completed' : 'failed',
    duration_ms: record.durationMs,
    file_size:   record.fileSizeB,
    session_id:  record.userId,
    metadata:    { format: record.format },
  })
}

export function recordError(tool: string, message: string): void {
  dbWriteError(tool, message)

  // Supabase enriched error (fire-and-forget)
  const severity = message.toLowerCase().includes('timeout')   ? 'high'
                 : message.toLowerCase().includes('crash')     ? 'critical'
                 : message.toLowerCase().includes('memory')    ? 'high'
                 : message.toLowerCase().includes('enoent')    ? 'medium'
                 : 'medium'

  emitError({
    tool,
    error_type:    'job_error',
    error_message: message.slice(0, 500),
    severity,
  })
}

// ── Live read API (in-memory only) ────────────────────────────────────────────

export function getLiveActivity() {
  const cutoff = Date.now() - LIVE_WINDOW_MS
  const recent = liveJobs.filter((j) => j.ts >= cutoff)
  const byTool = new Map<string, number>()
  for (const j of recent) byTool.set(j.type, (byTool.get(j.type) ?? 0) + 1)
  return {
    recentJobs:  recent.length,
    activePeriod: '10s',
    byTool:      [...byTool.entries()].map(([tool, count]) => ({ tool, count })),
    activeUsers: new Set(recent.map((j) => j.userId)).size,
  }
}
