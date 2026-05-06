/**
 * System & Queue Metrics
 *
 * All functions are async and non-blocking.
 * Heavy OS calls (cpuUsage, freemem) are fast enough to be inline.
 */

import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

const execFileAsync = promisify(execFile)

// ── Redis singleton (read-only consumer, separate from worker pool) ──────────
let _redis: Redis | null = null
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false,
      connectTimeout: 3_000,
    })
    _redis.on('error', () => {})
  }
  return _redis
}

const QUEUE_NAMES = ['toolify-pdf', 'toolify-image', 'toolify-ocr', 'toolify-document']

// ── CPU Usage (sampled over 200 ms) ─────────────────────────────────────────
export async function getCpuPercent(): Promise<number> {
  return new Promise((resolve) => {
    const t1 = os.cpus()
    setTimeout(() => {
      const t2 = os.cpus()
      let idle = 0, total = 0
      for (let i = 0; i < t1.length; i++) {
        const d1 = t1[i].times, d2 = t2[i].times
        const dIdle  = d2.idle  - d1.idle
        const dTotal = (d2.user + d2.nice + d2.sys + d2.idle + d2.irq)
                     - (d1.user + d1.nice + d1.sys + d1.idle + d1.irq)
        idle  += dIdle
        total += dTotal
      }
      resolve(total === 0 ? 0 : Math.round((1 - idle / total) * 100))
    }, 200)
  })
}

// ── Disk usage via `df` ──────────────────────────────────────────────────────
export async function getDiskUsage(): Promise<{ used: number; total: number; pct: number }> {
  try {
    const { stdout } = await execFileAsync('df', ['-k', '--output=used,size', '/'], { timeout: 3000 })
    const lines = stdout.trim().split('\n')
    const [used, total] = lines[1].trim().split(/\s+/).map(Number)
    return { used: used * 1024, total: total * 1024, pct: Math.round((used / total) * 100) }
  } catch {
    return { used: 0, total: 0, pct: 0 }
  }
}

// ── Memory ───────────────────────────────────────────────────────────────────
export function getMemoryInfo() {
  const total = os.totalmem()
  const free  = os.freemem()
  const used  = total - free
  return { total, free, used, pct: Math.round((used / total) * 100) }
}

// ── Queue counts via BullMQ ──────────────────────────────────────────────────
export interface QueueCounts {
  waiting:   number
  active:    number
  completed: number
  failed:    number
  delayed:   number
}

export async function getQueueCounts(): Promise<QueueCounts & { byQueue: Record<string, QueueCounts> }> {
  const r = getRedis()
  if (!r) {
    return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, byQueue: {} }
  }

  const totals: QueueCounts = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
  const byQueue: Record<string, QueueCounts> = {}

  await Promise.all(QUEUE_NAMES.map(async (name) => {
    try {
      const q = new Queue(name, { connection: r })
      const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
      await q.close()
      const qc: QueueCounts = {
        waiting:   counts.waiting   ?? 0,
        active:    counts.active    ?? 0,
        completed: counts.completed ?? 0,
        failed:    counts.failed    ?? 0,
        delayed:   counts.delayed   ?? 0,
      }
      byQueue[name] = qc
      for (const k of Object.keys(totals) as (keyof QueueCounts)[]) totals[k] += qc[k]
    } catch {
      byQueue[name] = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    }
  }))

  return { ...totals, byQueue }
}

// ── Connectivity probes ──────────────────────────────────────────────────────

export async function pingRedis(): Promise<boolean> {
  const r = getRedis()
  if (!r) return false
  try {
    const reply = await r.ping()
    return reply === 'PONG'
  } catch {
    return false
  }
}

export async function pingDb(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false
  try {
    const { Pool } = await import('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3_000 })
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    await pool.end()
    return true
  } catch {
    return false
  }
}

// ── Format helpers ───────────────────────────────────────────────────────────
export function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(1)} GB`
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} KB`
  return `${b} B`
}

export function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return [d && `${d}d`, h && `${h}h`, `${m}m`].filter(Boolean).join(' ')
}
