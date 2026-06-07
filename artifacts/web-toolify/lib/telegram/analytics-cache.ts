/**
 * Analytics Cache Service
 *
 * Four fully isolated background collectors that pre-aggregate all metrics.
 * Every bot command reads from these cached snapshots instantly —
 * zero live DB or queue queries on any button click.
 *
 *   Collector        Interval   Source
 *   ─────────────── ────────── ─────────────────────────────────────────
 *   system          8 s        os.cpus(), os.totalmem(), process.memoryUsage()
 *   queue           6 s        BullMQ job counts via Redis
 *   connectivity    20 s       Redis PING, SQLite SELECT 1, Supabase HEAD
 *   db-stats        15 s       SQLite aggregates (jobs, tools, users)
 *
 * Additionally:
 *   Failure tracker  — ring buffer of last 100 failures written on every
 *                      failed job; sends immediate Telegram alert to all admins.
 *
 * Safety rules:
 *   • Every collector is wrapped in try/catch — one crash never kills another.
 *   • All intervals use .unref() so they never block Node exit.
 *   • All state is on globalThis to survive Next.js HMR hot-reloads.
 *   • Zero coupling to the main website request path.
 */

import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { Queue } from 'bullmq'
import { Redis } from 'ioredis'
import { fmtBytes, fmtUptime } from './metrics'
import { dbReadGlobalStats, dbReadToolStats, dbReadUserStats } from './db'
import { getLiveActivity } from './analytics'
import { pingSupabase } from '../monitoring/queries'
import { sendAlert } from './api'
import { getAdminIds, ALERT_COOLDOWN_MS } from './config'
import { pushSseEvent } from '../monitoring/sse-bus'

const execFileAsync = promisify(execFile)

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SystemSnapshot {
  cpu:        number
  memPct:     number
  memUsed:    number
  memTotal:   number
  heapPct:    number
  heapUsed:   number
  heapTotal:  number
  uptime:     string
  uptimeS:    number
  collectedAt: number
}

export interface QueueSnapshot {
  waiting:    number
  active:     number
  completed:  number
  failed:     number
  delayed:    number
  byQueue:    Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number }>
  collectedAt: number
}

export interface ConnectivitySnapshot {
  redisOk:     boolean
  dbOk:        boolean
  supabaseOk:  boolean
  collectedAt: number
}

export interface DbSnapshot {
  totalJobs:     number
  jobsToday:     number
  successRate:   number
  failedCount:   number
  avgDurationMs: number
  totalUsers:    number
  activeUsers:   number
  recentJobs:    number
  topTools:      Array<{ name: string; count: number; successRate: number; avgMs: number }>
  collectedAt:   number
}

export interface FailureRecord {
  tool:       string
  error:      string
  jobId?:     string
  severity:   'low' | 'medium' | 'high' | 'critical'
  ts:         number
}

// ── State (globalThis for HMR safety) ────────────────────────────────────────

const KEY_SYS      = Symbol.for('toolify.ac.system')
const KEY_QUEUE    = Symbol.for('toolify.ac.queue')
const KEY_CONNECT  = Symbol.for('toolify.ac.connect')
const KEY_DB       = Symbol.for('toolify.ac.db')
const KEY_FAILURES = Symbol.for('toolify.ac.failures')
const KEY_TIMERS   = Symbol.for('toolify.ac.timers')
const KEY_COOLDOWN = Symbol.for('toolify.ac.alert_cooldown')

type G = Record<symbol, unknown>

function gs<T>(key: symbol, init: T): { value: T } {
  const g = globalThis as G
  if (g[key] === undefined) g[key] = { value: init }
  return g[key] as { value: T }
}

const _sys      = gs<SystemSnapshot | null>(KEY_SYS, null)
const _queue    = gs<QueueSnapshot | null>(KEY_QUEUE, null)
const _connect  = gs<ConnectivitySnapshot | null>(KEY_CONNECT, null)
const _db       = gs<DbSnapshot | null>(KEY_DB, null)
const _failures = gs<FailureRecord[]>(KEY_FAILURES, [])
const _cooldown = gs<Map<string, number>>(KEY_COOLDOWN, new Map())

interface Timers {
  system?:      ReturnType<typeof setInterval>
  queue?:       ReturnType<typeof setInterval>
  connectivity?: ReturnType<typeof setInterval>
  db?:          ReturnType<typeof setInterval>
  started:      boolean
}
const _timers = gs<Timers>(KEY_TIMERS, { started: false })

// ── Getters ───────────────────────────────────────────────────────────────────

export const getSystemSnapshot      = (): SystemSnapshot | null       => _sys.value
export const getQueueSnapshot       = (): QueueSnapshot | null        => _queue.value
export const getConnectivitySnapshot = (): ConnectivitySnapshot | null => _connect.value
export const getDbSnapshot          = (): DbSnapshot | null           => _db.value
export const getRecentFailures      = (limit = 20): FailureRecord[]  => _failures.value.slice(-limit).reverse()

export function getFailureStats(): { total: number; byTool: Record<string, number>; last5m: number } {
  const cutoff5m = Date.now() - 5 * 60_000
  const byTool: Record<string, number> = {}
  let last5m = 0
  for (const f of _failures.value) {
    byTool[f.tool] = (byTool[f.tool] ?? 0) + 1
    if (f.ts >= cutoff5m) last5m++
  }
  return { total: _failures.value.length, byTool, last5m }
}

/** How many seconds ago was a snapshot collected? -1 if never. */
export function snapshotAge(snap: { collectedAt: number } | null): number {
  if (!snap) return -1
  return Math.round((Date.now() - snap.collectedAt) / 1000)
}

// ── Redis singleton for queue metrics ─────────────────────────────────────────

let _redis: Redis | null = null
function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null
  if (!_redis) {
    _redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect:          true,
      enableReadyCheck:     false,
      connectTimeout:       3_000,
    })
    _redis.on('error', () => {})
  }
  return _redis
}

const QUEUE_NAMES = ['toolify-pdf-fast', 'toolify-pdf-heavy', 'toolify-image', 'toolify-ocr', 'toolify-document']

// ── System collector ──────────────────────────────────────────────────────────

export async function collectSystem(): Promise<void> {
  try {
    // CPU: 200ms sample — lightweight
    const cpu = await new Promise<number>((resolve) => {
      const t1 = os.cpus()
      setTimeout(() => {
        const t2 = os.cpus()
        let idle = 0, total = 0
        for (let i = 0; i < t1.length; i++) {
          const d1 = t1[i].times, d2 = t2[i].times
          const dIdle  = d2.idle - d1.idle
          const dTotal =
            (d2.user + d2.nice + d2.sys + d2.idle + d2.irq) -
            (d1.user + d1.nice + d1.sys + d1.idle + d1.irq)
          idle  += dIdle
          total += dTotal
        }
        resolve(total === 0 ? 0 : Math.round((1 - idle / total) * 100))
      }, 200)
    })

    const totMem  = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totMem - freeMem
    const heap    = process.memoryUsage()
    const uptimeS = Math.floor(process.uptime())

    _sys.value = {
      cpu,
      memPct:   Math.round((usedMem / totMem) * 100),
      memUsed:  usedMem,
      memTotal: totMem,
      heapPct:  Math.round((heap.heapUsed / heap.heapTotal) * 100),
      heapUsed:  heap.heapUsed,
      heapTotal: heap.heapTotal,
      uptime:   fmtUptime(uptimeS),
      uptimeS,
      collectedAt: Date.now(),
    }

    // Trigger alerts for high CPU / heap
    void checkSystemAlerts(cpu, Math.round((heap.heapUsed / heap.heapTotal) * 100))
  } catch (err) {
    console.warn('[AC:system] Error (non-fatal):', (err as Error).message)
  }
}

// ── Queue collector ───────────────────────────────────────────────────────────

export async function collectQueue(): Promise<void> {
  const r = getRedis()
  if (!r) {
    _queue.value = {
      waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0,
      byQueue: {}, collectedAt: Date.now(),
    }
    return
  }

  try {
    let waiting = 0, active = 0, completed = 0, failed = 0, delayed = 0
    const byQueue: QueueSnapshot['byQueue'] = {}

    await Promise.all(QUEUE_NAMES.map(async (name) => {
      try {
        const q      = new Queue(name, { connection: r as never })
        const counts = await q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')
        await q.close()
        const qc = {
          waiting:   counts.waiting   ?? 0,
          active:    counts.active    ?? 0,
          completed: counts.completed ?? 0,
          failed:    counts.failed    ?? 0,
          delayed:   counts.delayed   ?? 0,
        }
        byQueue[name] = qc
        waiting   += qc.waiting
        active    += qc.active
        completed += qc.completed
        failed    += qc.failed
        delayed   += qc.delayed
      } catch {
        byQueue[name] = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
      }
    }))

    _queue.value = { waiting, active, completed, failed, delayed, byQueue, collectedAt: Date.now() }

    // Check for queue stuck alert
    void checkQueueAlerts(waiting)
  } catch (err) {
    console.warn('[AC:queue] Error (non-fatal):', (err as Error).message)
  }
}

// ── Connectivity collector ────────────────────────────────────────────────────

export async function collectConnectivity(): Promise<void> {
  try {
    const r = getRedis()

    const [redisOk, dbOk, supabaseOk] = await Promise.all([
      r
        ? r.ping().then((res) => res === 'PONG').catch(() => false)
        : Promise.resolve(false),
      import('./db').then(({ getDb }) => {
        try { getDb()?.prepare('SELECT 1').get(); return true } catch { return false }
      }).catch(() => false),
      pingSupabase().catch(() => false),
    ])

    const prev = _connect.value
    _connect.value = { redisOk, dbOk, supabaseOk, collectedAt: Date.now() }

    // Alert on transitions: OK → FAIL
    if (prev) {
      if (prev.redisOk && !redisOk)     void sendAlertThrottled('redis-down',    '🔴 *REDIS DISCONNECTED*\nBot queue backend is unreachable. Jobs will fail.')
      if (!prev.redisOk && redisOk)     void sendAlertThrottled('redis-up',      '🟢 *REDIS RECONNECTED*\nQueue backend is back online.')
      if (prev.supabaseOk && !supabaseOk) void sendAlertThrottled('supa-down',   '🔴 *SUPABASE UNREACHABLE*\nMonitoring data may be stale.')
    }
  } catch (err) {
    console.warn('[AC:connectivity] Error (non-fatal):', (err as Error).message)
  }
}

// ── DB stats collector ────────────────────────────────────────────────────────

export async function collectDbStats(): Promise<void> {
  try {
    const stats = dbReadGlobalStats()
    const tools = dbReadToolStats()
    const users = dbReadUserStats()
    const live  = getLiveActivity()

    _db.value = {
      totalJobs:     stats?.totalJobs     ?? 0,
      jobsToday:     stats?.jobsToday     ?? 0,
      successRate:   stats?.successRate   ?? 100,
      failedCount:   stats?.failedCount   ?? 0,
      avgDurationMs: stats?.avgDurationMs ?? 0,
      totalUsers:    users?.total         ?? 0,
      activeUsers:   live.activeUsers,
      recentJobs:    live.recentJobs,
      topTools:      tools.slice(0, 10).map((t) => ({
        name:        t.name,
        count:       t.count,
        successRate: t.successRate,
        avgMs:       t.avgDurationMs,
      })),
      collectedAt: Date.now(),
    }
  } catch (err) {
    console.warn('[AC:db-stats] Error (non-fatal):', (err as Error).message)
  }
}

// ── Failure tracker ───────────────────────────────────────────────────────────

const MAX_FAILURES = 100
const FAILURE_ALERT_COOLDOWN_MS = 2 * 60_000  // 2 min per tool

function failureCooldownKey(tool: string): string { return `fail:${tool}` }

function shouldSendFailureAlert(tool: string): boolean {
  const key  = failureCooldownKey(tool)
  const last = _cooldown.value.get(key) ?? 0
  if (Date.now() - last < FAILURE_ALERT_COOLDOWN_MS) return false
  _cooldown.value.set(key, Date.now())
  return true
}

/**
 * Record a failed job — adds to ring buffer and immediately sends a
 * Telegram alert to all admins (rate-limited: 1 alert per tool per 2 min).
 */
export function recordFailure(failure: FailureRecord): void {
  _failures.value.push(failure)
  if (_failures.value.length > MAX_FAILURES) _failures.value.shift()

  // SSE push — instant dashboard update (fire-and-forget)
  try {
    pushSseEvent({ type: 'job_failed', ts: failure.ts, data: { tool: failure.tool, error: failure.error, severity: failure.severity, jobId: failure.jobId } })
  } catch {}

  // Immediate Telegram alert (fire-and-forget)
  if (shouldSendFailureAlert(failure.tool)) {
    const ts      = new Date(failure.ts).toISOString().replace('T', ' ').slice(11, 19) + ' UTC'
    const sevIcon = failure.severity === 'critical' ? '⛔'
                  : failure.severity === 'high'     ? '🔴'
                  : failure.severity === 'medium'   ? '🟡' : '🟢'
    const msg = [
      `🚨 *TOOL FAILURE ALERT*`,
      '',
      `${sevIcon} Severity: \`${failure.severity}\``,
      `🔧 Tool:   \`${failure.tool}\``,
      `💥 Error:  \`${failure.error.slice(0, 300)}\``,
      `🕐 Time:   \`${ts}\``,
      ...(failure.jobId ? [`🆔 Job ID: \`${failure.jobId}\``] : []),
    ].join('\n')
    void sendAlertToAdmins(msg)
  }
}

/** Record a job timeout — separate severity. */
export function recordTimeout(tool: string, jobId: string, durationMs: number): void {
  recordFailure({
    tool,
    error:    `Job timed out after ${Math.round(durationMs / 1000)}s`,
    jobId,
    severity: 'high',
    ts:       Date.now(),
  })
}

// ── Internal alert helpers ────────────────────────────────────────────────────

const alertCooldowns = new Map<string, number>()

async function sendAlertThrottled(key: string, msg: string): Promise<void> {
  const last = alertCooldowns.get(key) ?? 0
  if (Date.now() - last < ALERT_COOLDOWN_MS) return
  alertCooldowns.set(key, Date.now())
  await sendAlertToAdmins(msg)
}

async function sendAlertToAdmins(msg: string): Promise<void> {
  try {
    const ids = getAdminIds()
    if (ids.size === 0) return
    await sendAlert(ids, msg)
  } catch (err) {
    console.warn('[AC:alert] Failed to send (non-fatal):', (err as Error).message)
  }
}

async function checkSystemAlerts(cpu: number, heapPct: number): Promise<void> {
  if (cpu >= 90) {
    await sendAlertThrottled('cpu', `🔴 *HIGH CPU ALERT*\nCPU usage: \`${cpu}%\``)
    try { pushSseEvent({ type: 'cpu_alert', ts: Date.now(), data: { cpu } }) } catch {}
  }
  if (heapPct >= 85) await sendAlertThrottled('heap', `🧠 *HIGH MEMORY*\nJS Heap: \`${heapPct}%\``)
}

async function checkQueueAlerts(waiting: number): Promise<void> {
  if (waiting >= 50) {
    await sendAlertThrottled('queue', `⚠️ *QUEUE OVERLOAD*\nWaiting jobs: \`${waiting}\``)
    try { pushSseEvent({ type: 'queue_overflow', ts: Date.now(), data: { waiting } }) } catch {}
  }
  if (waiting === 0) alertCooldowns.delete('queue')  // reset when clear
}

// ── Run all collectors once (for first-call bootstrap) ────────────────────────

export async function triggerAllCollectors(): Promise<void> {
  await Promise.allSettled([
    collectSystem(),
    collectQueue(),
    collectConnectivity(),
    collectDbStats(),
  ])
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function startAnalyticsCache(): void {
  const t = _timers.value
  if (t.started) return

  // Immediate first collect (all in parallel)
  void triggerAllCollectors()

  t.system       = setInterval(() => { void collectSystem() },       30_000)
  t.queue        = setInterval(() => { void collectQueue() },        30_000)
  t.connectivity = setInterval(() => { void collectConnectivity() }, 60_000)
  t.db           = setInterval(() => { void collectDbStats() },      60_000)
  t.started      = true

  for (const iv of [t.system, t.queue, t.connectivity, t.db]) {
    if (iv && 'unref' in iv) (iv as NodeJS.Timeout).unref()
  }

  console.log('[AC] Analytics cache started — system:30s queue:30s connect:60s db:60s')
}

export function stopAnalyticsCache(): void {
  const t = _timers.value
  for (const key of ['system', 'queue', 'connectivity', 'db'] as const) {
    if (t[key]) { clearInterval(t[key]); t[key] = undefined }
  }
  t.started = false
}
