/**
 * Monitoring — Fire-and-Forget Event Emitter
 *
 * Architecture rules (MUST NOT violate):
 *  • Never blocks file processing — all writes are async (setImmediate)
 *  • Never throws — every call is wrapped in try/catch
 *  • Never crashes the server — monitoring failures are silently swallowed
 *  • Batched writes — events are queued and flushed every 500ms (max 20/batch)
 *    to reduce Supabase API call volume during burst traffic
 */

import { getMonitoringClient } from './client'
import type { MonitoringEvent, MetricSnapshot, WorkerStatusUpdate } from './types'

// ── Batch buffer ──────────────────────────────────────────────────────────────
const BATCH_INTERVAL_MS = 500
const MAX_BATCH_SIZE    = 20

const pending: MonitoringEvent[] = []
let   flushTimer: NodeJS.Timeout | null = null

function schedule(): void {
  if (flushTimer !== null) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    flush().catch(() => {})
  }, BATCH_INTERVAL_MS)
}

async function flush(): Promise<void> {
  if (pending.length === 0) return
  const client = getMonitoringClient()
  if (!client) { pending.length = 0; return }
  const batch = pending.splice(0, MAX_BATCH_SIZE)
  try {
    await client.from('mon_events').insert(batch)
  } catch {
    // Silently discard — monitoring must never affect core processing
  }
}

// ── Public write API ──────────────────────────────────────────────────────────

/** Enqueue an event for batch writing. Fire-and-forget — never throws. */
export function emitEvent(event: MonitoringEvent): void {
  if (!getMonitoringClient()) return
  pending.push(event)
  if (pending.length >= MAX_BATCH_SIZE) {
    if (flushTimer !== null) { clearTimeout(flushTimer); flushTimer = null }
    setImmediate(() => flush().catch(() => {}))
  } else {
    schedule()
  }
}

/** Write a structured error to mon_errors. Fire-and-forget — never throws. */
export function emitError(opts: {
  tool?:          string
  error_type?:    string
  error_message?: string
  severity?:      'low' | 'medium' | 'high' | 'critical'
  session_id?:    string
  request_id?:    string
  metadata?:      Record<string, unknown>
}): void {
  const client = getMonitoringClient()
  if (!client) return
  setImmediate(() => {
    client.from('mon_errors').insert({
      tool:          opts.tool          ?? null,
      error_type:    opts.error_type    ?? null,
      error_message: opts.error_message ?? null,
      severity:      opts.severity      ?? 'medium',
      session_id:    opts.session_id    ?? null,
      request_id:    opts.request_id    ?? null,
      metadata:      opts.metadata      ?? {},
    }).then(null, () => {})
  })
}

/** Write a system metrics snapshot. Fire-and-forget — never throws. */
export function emitMetrics(snapshot: MetricSnapshot): void {
  const client = getMonitoringClient()
  if (!client) return
  setImmediate(() => {
    client.from('mon_metrics').insert(snapshot).then(null, () => {})
  })
}

/** Upsert worker status. Fire-and-forget — never throws. */
export function emitWorkerStatus(update: WorkerStatusUpdate): void {
  const client = getMonitoringClient()
  if (!client) return
  setImmediate(() => {
    client.from('mon_worker_status').upsert({
      ...update,
      last_seen: new Date().toISOString(),
    }, { onConflict: 'worker_id' }).then(null, () => {})
  })
}

/** Upsert live session with incremented request_count. Fire-and-forget — never throws. */
export function upsertSession(sessionId: string, tool?: string | null): void {
  const client = getMonitoringClient()
  if (!client) return
  setImmediate(() => {
    client.rpc('mon_upsert_session', {
      p_session_id: sessionId,
      p_tool:       tool ?? null,
    }).then(null, () => {})
  })
}

// ── Periodic system metrics collector ─────────────────────────────────────────
// Started from instrumentation.ts — runs every 30s to snapshot CPU/RAM.

let metricsInterval: NodeJS.Timeout | null = null

export function startMetricsCollector(): void {
  if (metricsInterval) return
  if (!getMonitoringClient()) {
    console.log('[Monitoring] Metrics collector skipped — Supabase not configured')
    return
  }

  const collect = async () => {
    try {
      const { getCpuPercent, getMemoryInfo, getQueueCounts } = await import('../telegram/metrics')
      const [cpu, queue] = await Promise.all([getCpuPercent(), getQueueCounts()])
      const mem   = getMemoryInfo()
      const jsHeap = process.memoryUsage()
      const snapshot: MetricSnapshot = {
        cpu_usage:    cpu,
        memory_used:  mem.used,
        memory_total: mem.total,
        memory_pct:   mem.pct,
        heap_used:    jsHeap.heapUsed,
        heap_total:   jsHeap.heapTotal,
        active_jobs:  queue.active,
        queue_depth:  queue.waiting,
        uptime_s:     Math.floor(process.uptime()),
      }
      emitMetrics(snapshot)

      const heapPct = Math.round((jsHeap.heapUsed / jsHeap.heapTotal) * 100)
      if (heapPct > 85) {
        emitEvent({
          event_type:   'memory_warning',
          cpu_usage:    cpu,
          memory_usage: jsHeap.heapUsed,
          metadata:     { heap_pct: heapPct, heap_used: jsHeap.heapUsed, heap_total: jsHeap.heapTotal },
        })
      }

      if (queue.waiting > 50) {
        emitEvent({
          event_type: 'queue_stalled',
          metadata:   { waiting: queue.waiting, active: queue.active },
        })
      }
    } catch {
      // Silently ignored — metrics collection must never crash
    }
  }

  metricsInterval = setInterval(() => { void collect() }, 30_000)
  if (metricsInterval.unref) metricsInterval.unref()
  console.log('[Monitoring] System metrics collector started (30s interval)')
}

export function stopMetricsCollector(): void {
  if (metricsInterval) { clearInterval(metricsInterval); metricsInterval = null }
}
