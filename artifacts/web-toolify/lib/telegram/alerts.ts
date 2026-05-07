/**
 * Alert System
 *
 * Monitors system health on a 30-second schedule.
 * Reads from analytics-cache (no live queries) for zero overhead.
 * Sends Telegram messages to all admins when thresholds are breached.
 *
 * Public API:
 *   startAlertMonitor()          — starts 30s interval
 *   stopAlertMonitor()           — stops interval
 *   alertWorkerCrash(group, msg) — immediate crash alert
 *   alertJobTimeout(tool, jobId) — immediate timeout alert
 *   alertQueueStuck()            — immediate stuck-queue alert
 *
 * Failure/tool alerts are handled in analytics-cache.ts (recordFailure)
 * to keep the hot path as direct as possible.
 *
 * Safe: everything is try/catch — errors never propagate to the server.
 */

import { getAdminIds, ALERT_COOLDOWN_MS } from './config'
import { sendAlert } from './api'
import { emitEvent, emitError } from '../monitoring/emitter'
import {
  getSystemSnapshot, getQueueSnapshot, getDbSnapshot,
} from './analytics-cache'

const THRESHOLDS = {
  CPU_PCT:         90,
  QUEUE_WAITING:   50,
  ERROR_RATE_PCT:  20,
  HEAP_PCT:        85,
  MEM_PCT:         92,
} as const

const lastAlertTs = new Map<string, number>()

function shouldAlert(key: string): boolean {
  const last = lastAlertTs.get(key) ?? 0
  if (Date.now() - last < ALERT_COOLDOWN_MS) return false
  lastAlertTs.set(key, Date.now())
  return true
}

async function dispatch(adminIds: Set<number>, msg: string): Promise<void> {
  await sendAlert(adminIds, msg)
}

async function checkAlerts(): Promise<void> {
  const adminIds = getAdminIds()
  if (adminIds.size === 0) return

  try {
    // Read from analytics-cache — instant, no I/O
    const sys   = getSystemSnapshot()
    const queue = getQueueSnapshot()
    const db    = getDbSnapshot()

    if (!sys && !queue) return  // collectors not started yet

    if (sys) {
      if (sys.cpu >= THRESHOLDS.CPU_PCT && shouldAlert('cpu')) {
        await dispatch(adminIds, `🔴 *HIGH CPU ALERT*\nCPU: \`${sys.cpu}%\` (threshold: ${THRESHOLDS.CPU_PCT}%)`)
        emitEvent({ event_type: 'api_exception', metadata: { alert: 'high_cpu', cpu: sys.cpu } })
        emitError({ error_type: 'high_cpu', error_message: `CPU at ${sys.cpu}%`, severity: 'high', metadata: { cpu: sys.cpu } })
      }

      if (sys.heapPct >= THRESHOLDS.HEAP_PCT && shouldAlert('heap')) {
        const usedMB  = Math.round(sys.heapUsed  / 1e6)
        const totalMB = Math.round(sys.heapTotal / 1e6)
        await dispatch(adminIds, `🧠 *HIGH HEAP MEMORY*\nJS Heap: \`${sys.heapPct}%\` (${usedMB}MB / ${totalMB}MB)`)
        emitEvent({ event_type: 'memory_warning', memory_usage: sys.heapUsed, metadata: { heap_pct: sys.heapPct } })
      }

      if (sys.memPct >= THRESHOLDS.MEM_PCT && shouldAlert('mem')) {
        await dispatch(adminIds, `💾 *HIGH RAM USAGE*\nSystem RAM: \`${sys.memPct}%\``)
      }
    }

    if (queue) {
      if (queue.waiting >= THRESHOLDS.QUEUE_WAITING && shouldAlert('queue')) {
        await dispatch(adminIds, `⚠️ *QUEUE OVERLOAD*\nWaiting: \`${queue.waiting}\` jobs (threshold: ${THRESHOLDS.QUEUE_WAITING})`)
        emitEvent({ event_type: 'queue_stalled', metadata: { waiting: queue.waiting, active: queue.active } })
      }

      // Detect stuck queue: jobs active for too long
      const prevActive = _prevActive
      _prevActive = queue.active
      if (queue.active > 0 && queue.active === prevActive && shouldAlert('queue-stuck')) {
        await dispatch(adminIds, `🔄 *QUEUE POSSIBLY STUCK*\nSame \`${queue.active}\` active jobs for 30s. Check workers.`)
      }
    }

    if (db && db.totalJobs > 10) {
      if (db.successRate < (100 - THRESHOLDS.ERROR_RATE_PCT) && shouldAlert('errors')) {
        await dispatch(adminIds, `❌ *HIGH ERROR RATE*\nSuccess: \`${db.successRate}%\` | Failed: \`${db.failedCount}\` jobs`)
        emitEvent({ event_type: 'api_exception', metadata: { alert: 'high_error_rate', success_rate: db.successRate } })
        emitError({ error_type: 'high_error_rate', error_message: `Success rate ${db.successRate}%`, severity: 'high' })
      }
    }
  } catch (err) {
    console.warn('[TelegramBot] Alert check failed (non-fatal):', (err as Error).message)
  }
}

let _prevActive = 0

let alertInterval: ReturnType<typeof setInterval> | null = null

export function startAlertMonitor(): void {
  if (alertInterval) return
  alertInterval = setInterval(() => { void checkAlerts() }, 30_000)  // 30s, down from 60s
  if (alertInterval.unref) alertInterval.unref()
  console.log('[TelegramBot] Alert monitor started (30s interval)')
}

export function stopAlertMonitor(): void {
  if (alertInterval) { clearInterval(alertInterval); alertInterval = null }
}

// ── Immediate alert APIs ───────────────────────────────────────────────────────

/** Send an immediate worker-crash alert. */
export async function alertWorkerCrash(group: string, message: string): Promise<void> {
  try {
    if (!shouldAlert(`worker-${group}`)) return
    const adminIds = getAdminIds()
    await sendAlert(adminIds, `💥 *WORKER CRASH*\nGroup: \`${group}\`\nError: ${message.slice(0, 300)}`)
    emitEvent({ event_type: 'worker_crashed', worker_id: group, error_message: message.slice(0, 500), metadata: { group } })
    emitError({ tool: group, error_type: 'worker_crash', error_message: message.slice(0, 500), severity: 'critical' })
  } catch (err) {
    console.warn('[TelegramBot] alertWorkerCrash failed:', (err as Error).message)
  }
}

/** Send an immediate job-timeout alert. */
export async function alertJobTimeout(tool: string, jobId: string, durationMs: number): Promise<void> {
  try {
    if (!shouldAlert(`timeout-${tool}`)) return
    const adminIds = getAdminIds()
    const dStr = durationMs >= 60_000
      ? `${(durationMs / 60_000).toFixed(1)}m`
      : `${Math.round(durationMs / 1000)}s`
    await sendAlert(adminIds, `⏱ *JOB TIMEOUT*\nTool: \`${tool}\`\nJob ID: \`${jobId}\`\nDuration: \`${dStr}\``)
    emitError({ tool, error_type: 'job_timeout', error_message: `Timeout after ${dStr}`, severity: 'high', metadata: { durationMs } })
  } catch (err) {
    console.warn('[TelegramBot] alertJobTimeout failed:', (err as Error).message)
  }
}

/** Send an immediate queue-stuck alert. */
export async function alertQueueStuck(waiting: number): Promise<void> {
  try {
    if (!shouldAlert('queue-manual')) return
    const adminIds = getAdminIds()
    await sendAlert(adminIds, `🔄 *QUEUE STUCK*\n\`${waiting}\` jobs waiting — no progress detected.`)
  } catch (err) {
    console.warn('[TelegramBot] alertQueueStuck failed:', (err as Error).message)
  }
}

/** Send an immediate worker-offline alert. */
export async function alertWorkerOffline(workerId: string): Promise<void> {
  try {
    if (!shouldAlert(`offline-${workerId}`)) return
    const adminIds = getAdminIds()
    await sendAlert(adminIds, `📴 *WORKER OFFLINE*\nWorker \`${workerId}\` has not sent a heartbeat.`)
  } catch (err) {
    console.warn('[TelegramBot] alertWorkerOffline failed:', (err as Error).message)
  }
}
