/**
 * Analytics Store
 *
 * Three-layer write architecture:
 *  1. In-memory ring buffer  → /live (last 10s). Instant.
 *  2. SQLite (db.ts)         → persistent history. Fire-and-forget.
 *  3. Supabase monitoring    → cross-restart observability. Fire-and-forget.
 *
 * On failure: also writes to analytics-cache.ts failure tracker and
 * sends an immediate Telegram alert to all admins (rate-limited: 2 min/tool).
 */

import { dbWriteJob, dbWriteError, dbWriteFileStat } from './db'
import { emitEvent, emitError } from '../monitoring/emitter'
import { recordFailure } from './analytics-cache'
import { pushSseEvent } from '../monitoring/sse-bus'
import { csWriteJobResult, csWriteError } from '../monitoring/central-state'

export interface JobRecord {
  type:       string
  success:    boolean
  durationMs: number
  fileSizeB:  number
  format:     string
  userId:     string
  jobId?:     string
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
  // 1. In-memory (sync — for /live)
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
    metadata:    { format: record.format, ...(record.jobId ? { jobId: record.jobId } : {}) },
  })

  // 5. Central state — immediate in-memory update (single source of truth)
  csWriteJobResult(record.type, record.success, record.durationMs)

  // 6. SSE push — instant dashboard update (fire-and-forget)
  try {
    pushSseEvent({
      type: record.success ? 'job_success' : 'job_failed',
      ts:   record.ts,
      data: { tool: record.type, durationMs: record.durationMs, format: record.format, jobId: record.jobId },
    })
  } catch {}

  // 6. Failure fast-path — immediate Telegram alert (fire-and-forget)
  if (!record.success) {
    const severity =
      record.durationMs > 60_000          ? 'high'
      : record.format === 'crash'         ? 'critical'
      : record.type.includes('timeout')   ? 'high'
      : 'medium'

    recordFailure({
      tool:     record.type,
      error:    `Job failed after ${record.durationMs}ms (format: ${record.format})`,
      jobId:    record.jobId,
      severity,
      ts:       record.ts,
    })
  }
}

export function recordError(tool: string, message: string, jobId?: string): void {
  dbWriteError(tool, message)

  // Severity classification
  const severity: 'low' | 'medium' | 'high' | 'critical' =
    message.toLowerCase().includes('timeout')  ? 'high'
    : message.toLowerCase().includes('crash')  ? 'critical'
    : message.toLowerCase().includes('memory') ? 'high'
    : message.toLowerCase().includes('enoent') ? 'medium'
    : 'medium'

  // Write to central state — makes error immediately visible in dashboard
  csWriteError(tool, message, severity, 'processing')

  // Supabase (fire-and-forget)
  emitError({
    tool,
    error_type:    'job_error',
    error_message: message.slice(0, 500),
    severity,
  })

  // Immediate Telegram alert (rate-limited)
  recordFailure({
    tool,
    error:    message,
    jobId,
    severity: severity as 'low' | 'medium' | 'high' | 'critical',
    ts:       Date.now(),
  })
}

// ── Live read API (in-memory only) ────────────────────────────────────────────

/** Return raw recent job events, newest first — for live feeds. */
export function getLiveEvents(limit = 50): JobRecord[] {
  return liveJobs.slice(-limit).reverse()
}

export function getLiveActivity() {
  const cutoff = Date.now() - LIVE_WINDOW_MS
  const recent = liveJobs.filter((j) => j.ts >= cutoff)
  const byTool = new Map<string, number>()
  for (const j of recent) byTool.set(j.type, (byTool.get(j.type) ?? 0) + 1)
  return {
    recentJobs:   recent.length,
    activePeriod: '10s',
    byTool:       [...byTool.entries()].map(([tool, count]) => ({ tool, count })),
    activeUsers:  new Set(recent.map((j) => j.userId)).size,
  }
}
