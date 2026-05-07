/**
 * Alert System
 *
 * Monitors CPU, queue size, error rate and memory on a periodic schedule.
 * Sends Telegram messages to all admins when thresholds are breached.
 * Also emits all alert conditions as Supabase monitoring events.
 *
 * Safe: checkAlerts() is fully wrapped in try/catch — metric errors never
 * kill the interval or propagate to the server.
 */

import { getAdminIds, ALERT_COOLDOWN_MS } from './config'
import { sendAlert } from './api'
import { getCpuPercent, getQueueCounts } from './metrics'
import { dbReadGlobalStats } from './db'
import { emitEvent, emitError } from '../monitoring/emitter'

const THRESHOLDS = {
  CPU_PCT:        90,
  QUEUE_WAITING:  50,
  ERROR_RATE_PCT: 20,
  HEAP_PCT:       85,
}

const lastAlertTs = new Map<string, number>()

function shouldAlert(key: string): boolean {
  const last = lastAlertTs.get(key) ?? 0
  if (Date.now() - last < ALERT_COOLDOWN_MS) return false
  lastAlertTs.set(key, Date.now())
  return true
}

async function checkAlerts(): Promise<void> {
  const adminIds = getAdminIds()
  if (adminIds.size === 0) return

  try {
    const [cpu, queue] = await Promise.all([getCpuPercent(), getQueueCounts()])
    const stats  = dbReadGlobalStats()
    const jsHeap = process.memoryUsage()
    const heapPct = Math.round((jsHeap.heapUsed / jsHeap.heapTotal) * 100)

    if (cpu >= THRESHOLDS.CPU_PCT && shouldAlert('cpu')) {
      const msg = `🚨 *HIGH CPU ALERT*\nCPU usage: \`${cpu}%\` (threshold: ${THRESHOLDS.CPU_PCT}%)`
      await sendAlert(adminIds, msg)
      emitEvent({ event_type: 'api_exception', metadata: { alert: 'high_cpu', cpu_pct: cpu } })
      emitError({ error_type: 'high_cpu', error_message: `CPU at ${cpu}%`, severity: 'high', metadata: { cpu } })
    }

    if (queue.waiting >= THRESHOLDS.QUEUE_WAITING && shouldAlert('queue')) {
      const msg = `⚠️ *QUEUE OVERLOAD*\nWaiting jobs: \`${queue.waiting}\` (threshold: ${THRESHOLDS.QUEUE_WAITING})`
      await sendAlert(adminIds, msg)
      emitEvent({ event_type: 'queue_stalled', metadata: { waiting: queue.waiting, active: queue.active } })
    }

    if (stats && stats.totalJobs > 10 && stats.successRate < (100 - THRESHOLDS.ERROR_RATE_PCT) && shouldAlert('errors')) {
      const msg = `❌ *HIGH ERROR RATE*\nSuccess rate: \`${stats.successRate}%\` (failed: ${stats.failedCount} jobs)`
      await sendAlert(adminIds, msg)
      emitEvent({ event_type: 'api_exception', metadata: { alert: 'high_error_rate', success_rate: stats.successRate } })
      emitError({ error_type: 'high_error_rate', error_message: `Success rate ${stats.successRate}%`, severity: 'high' })
    }

    if (heapPct >= THRESHOLDS.HEAP_PCT && shouldAlert('heap')) {
      const msg = `🧠 *HIGH MEMORY ALERT*\nJS Heap: \`${heapPct}%\` (${Math.round(jsHeap.heapUsed / 1e6)}MB / ${Math.round(jsHeap.heapTotal / 1e6)}MB)`
      await sendAlert(adminIds, msg)
      emitEvent({
        event_type:   'memory_warning',
        memory_usage: jsHeap.heapUsed,
        metadata:     { heap_pct: heapPct, heap_used: jsHeap.heapUsed, heap_total: jsHeap.heapTotal },
      })
    }
  } catch (err) {
    console.warn('[TelegramBot] Alert check failed (non-fatal):', (err as Error).message)
  }
}

let alertInterval: ReturnType<typeof setInterval> | null = null

export function startAlertMonitor(): void {
  if (alertInterval) return
  alertInterval = setInterval(() => { void checkAlerts() }, 60_000)
  if (alertInterval.unref) alertInterval.unref()
  console.log('[TelegramBot] Alert monitor started (60s interval)')
}

export function stopAlertMonitor(): void {
  if (alertInterval) { clearInterval(alertInterval); alertInterval = null }
}

/** Send a worker-crash alert immediately and emit to Supabase. */
export async function alertWorkerCrash(group: string, message: string): Promise<void> {
  try {
    if (!shouldAlert(`worker-${group}`)) return
    await sendAlert(getAdminIds(), `💥 *WORKER CRASH*\nGroup: \`${group}\`\nError: ${message.slice(0, 300)}`)
    emitEvent({
      event_type:    'worker_crashed',
      worker_id:     group,
      error_message: message.slice(0, 500),
      metadata:      { group },
    })
    emitError({
      tool:          group,
      error_type:    'worker_crash',
      error_message: message.slice(0, 500),
      severity:      'critical',
    })
  } catch (err) {
    console.warn('[TelegramBot] alertWorkerCrash failed (non-fatal):', (err as Error).message)
  }
}
