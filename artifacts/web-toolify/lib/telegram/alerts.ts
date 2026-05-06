/**
 * Alert System
 *
 * Monitors CPU, queue size, and error rate on a periodic schedule.
 * Sends Telegram messages to all admins when thresholds are breached.
 * Alerts are de-duplicated per type within a cooldown window.
 *
 * Safe Bot-Sync Rule compliance:
 * - checkAlerts() is fully wrapped in try/catch — metric errors never
 *   kill the interval or propagate to the server
 * - sendAlert() already uses Promise.allSettled, so a failed delivery
 *   to one admin does not block others
 */

import { getAdminIds, ALERT_COOLDOWN_MS } from './config'
import { sendAlert } from './api'
import { getCpuPercent, getQueueCounts } from './metrics'
import { dbReadGlobalStats } from './db'

const THRESHOLDS = {
  CPU_PCT:        90,
  QUEUE_WAITING:  50,
  ERROR_RATE_PCT: 20,
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
    const stats = dbReadGlobalStats()

    if (cpu >= THRESHOLDS.CPU_PCT && shouldAlert('cpu')) {
      await sendAlert(adminIds, `🚨 *HIGH CPU ALERT*\nCPU usage: \`${cpu}%\` (threshold: ${THRESHOLDS.CPU_PCT}%)`)
    }

    if (queue.waiting >= THRESHOLDS.QUEUE_WAITING && shouldAlert('queue')) {
      await sendAlert(adminIds, `⚠️ *QUEUE OVERLOAD*\nWaiting jobs: \`${queue.waiting}\` (threshold: ${THRESHOLDS.QUEUE_WAITING})`)
    }

    if (stats && stats.totalJobs > 10 && stats.successRate < (100 - THRESHOLDS.ERROR_RATE_PCT) && shouldAlert('errors')) {
      await sendAlert(adminIds, `❌ *HIGH ERROR RATE*\nSuccess rate: \`${stats.successRate}%\` (failed: ${stats.failedCount} jobs)`)
    }
  } catch (err) {
    // Never let a metrics/alert error crash the interval or bubble up
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

/** Send a worker-crash alert immediately (called from worker error handler). */
export async function alertWorkerCrash(group: string, message: string): Promise<void> {
  try {
    if (!shouldAlert(`worker-${group}`)) return
    await sendAlert(getAdminIds(), `💥 *WORKER CRASH*\nGroup: \`${group}\`\nError: ${message.slice(0, 300)}`)
  } catch (err) {
    console.warn('[TelegramBot] alertWorkerCrash failed (non-fatal):', (err as Error).message)
  }
}
