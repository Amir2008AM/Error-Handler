/**
 * Central Ops State Manager
 *
 * Single source of truth for all /ops dashboard data.
 *
 * Architecture:
 *
 *   ┌──────────────────────────────────────────────────────────────────┐
 *   │                   DATA SOURCES (write side)                      │
 *   │                                                                  │
 *   │  job-processor.ts ──► recordJob()  ──► csWriteJobResult()        │
 *   │  job-processor.ts ──► recordError()──► csWriteError()            │
 *   │  error-monitor.ts ──► reportError()──► csWriteError()            │
 *   │  route-analytics.ts ─────────────────► csWriteError()            │
 *   │  analytics-cache.ts (bg timer) ──────► central store             │
 *   │  active-users.ts ────────────────────► (read in snapshot)        │
 *   │  security-monitor.ts ────────────────► (read in snapshot)        │
 *   └──────────────────────────────────────────────────────────────────┘
 *                                 │
 *                         ┌───────▼────────┐
 *                         │  central store │  (globalThis-safe)
 *                         └───────┬────────┘
 *                                 │
 *                   ┌─────────────▼──────────────┐
 *                   │  getOpsSnapshot()           │
 *                   │  SSE reads ONLY from here   │
 *                   └─────────────────────────────┘
 *
 * Rules:
 *  - All write functions are synchronous and never throw
 *  - getOpsSnapshot() is synchronous — reads pre-cached data only
 *  - Background timer (2 s) snapshots analytics-cache → central store
 *  - SQLite seed runs on startup + every 5 min (to pick up stale data)
 *  - HMR-safe: all state lives on globalThis via Symbol key
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type OpsErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface OpsErrorEntry {
  id:        string
  type:      string
  tool:      string
  severity:  OpsErrorSeverity | string
  msg:       string
  createdAt: number
  diagnosis?: { cause: string; fix: string; confidence: number }
}

export interface OpsResolvedEntry {
  id:        string
  tool:      string
  msg:       string
  severity:  string
  errorType: string
  createdAt: number
  resolvedAt: number
}

export interface OpsToolStat {
  name:          string
  count:         number
  successRate:   number
  avgDurationMs: number
  failureRate:   number
}

export interface SecurityStatsShape {
  failedAuthLast24h:   number
  rateLimitHitsLast1h: number
  topOffendingIps:     Array<{ ip: string; count: number }>
  threatLevel:         'none' | 'low' | 'medium' | 'high'
  recentEvents:        Array<{ type: string; ip: string; ts: number; detail?: string }>
}

export interface OpsSnapshot {
  // ── Core counters ───────────────────────────────────────────────────────────
  activeJobs:     number
  totalJobs:      number
  successCount:   number
  failedCount:    number
  successRate:    number
  usersToday:     number
  uptimeSeconds:  number
  pid:            number
  cpu:            number
  ram:            number
  memoryMB:       number
  snapshotAge:    number
  queue:          { waiting: number; active: number; completed: number; failed: number }
  redisOk:        boolean
  sqliteOk:       boolean
  supabaseOk:     boolean
  // ── Error / event lists ─────────────────────────────────────────────────────
  errors:         OpsErrorEntry[]
  resolvedErrors: OpsResolvedEntry[]
  liveTools:      Array<{ id: number; tool: string; ok: boolean; ts: number }>
  // ── Per-entity maps ─────────────────────────────────────────────────────────
  activeUsers:    Array<{ id: string; ip: string; tool: string | null; since: number; lastSeen: number; status: string }>
  toolStats:      Record<string, { calls: number; success: number; fail: number; durations: number[]; enabled: boolean }>
  securityStats:  SecurityStatsShape
  disabledTools:  string[]
  // ── Alias fields (new dashboard) ────────────────────────────────────────────
  uptime:      number
  failCount:   number
  memMB:       number
  snapAge:     number
  secFailed:   number
  secRateHits: number
  events:      Array<{ id: string; ts: number; type: string; tool: string; msg: string }>
  alerts:      Array<{ type: string; msg: string }>
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ToolAccumulator {
  calls:   number
  success: number
  fail:    number
  totalMs: number
}

interface SysCache {
  cpu:        number
  ram:        number
  memoryMB:   number
  age:        number
  activeJobs: number
  waiting:    number
  completed:  number
  failedQ:    number
  redisOk:    boolean
  sqliteOk:   boolean
  supabaseOk: boolean
}

interface CSStore {
  success:    number
  fail:       number
  total:      number
  usersToday: number
  tools:      Map<string, ToolAccumulator>
  errors:     OpsErrorEntry[]
  resolved:   OpsResolvedEntry[]
  events:     Array<{ tool: string; ok: boolean; ts: number }>
  sys:        SysCache
  seeded:     boolean
  started:    boolean
}

const MAX_ERRORS   = 200
const MAX_RESOLVED = 50
const MAX_EVENTS   = 500

const KEY = Symbol.for('toolify.central-state.v1')
type G = Record<symbol, CSStore>

function defaultSys(): SysCache {
  return {
    cpu: 0, ram: 0, memoryMB: 0, age: 0,
    activeJobs: 0, waiting: 0, completed: 0, failedQ: 0,
    redisOk: false, sqliteOk: false, supabaseOk: false,
  }
}

function getStore(): CSStore {
  const g = globalThis as G
  if (!g[KEY]) {
    g[KEY] = {
      success: 0, fail: 0, total: 0, usersToday: 0,
      tools: new Map(),
      errors: [], resolved: [], events: [],
      sys: defaultSys(),
      seeded: false, started: false,
    }
  }
  return g[KEY]
}

// ── Write API ─────────────────────────────────────────────────────────────────

/**
 * Record a completed job result (success or failure).
 * Increments live counters, updates tool stats, auto-resolves matching errors.
 * Called by analytics.ts → recordJob()
 */
export function csWriteJobResult(
  tool:       string,
  success:    boolean,
  durationMs: number,
): void {
  try {
    const store = getStore()
    const ts    = Date.now()
    store.total++

    if (success) {
      store.success++
      // Auto-resolve active errors for this tool
      const still: OpsErrorEntry[] = []
      for (const err of store.errors) {
        if (err.tool === tool && err.createdAt <= ts) {
          store.resolved.unshift({
            id:        err.id,
            tool:      err.tool,
            msg:       err.msg,
            severity:  String(err.severity),
            errorType: err.type,
            createdAt: err.createdAt,
            resolvedAt: ts,
          })
          if (store.resolved.length > MAX_RESOLVED) store.resolved.pop()
        } else {
          still.push(err)
        }
      }
      store.errors = still
    } else {
      store.fail++
    }

    // Update tool stats
    const acc = store.tools.get(tool) ?? { calls: 0, success: 0, fail: 0, totalMs: 0 }
    acc.calls++
    if (success) acc.success++; else acc.fail++
    acc.totalMs += durationMs
    store.tools.set(tool, acc)

    // Append to live event log (newest first)
    store.events.unshift({ tool, ok: success, ts })
    if (store.events.length > MAX_EVENTS) store.events.pop()
  } catch {
    // Never propagate
  }
}

/**
 * Record an error event visible in the dashboard Errors tab.
 * Deduplicates identical tool+msg pairs within a 60-second window.
 * Called by: analytics.recordError(), error-monitor.reportError(), route-analytics.trackRoute()
 */
export function csWriteError(
  tool:      string,
  msg:       string,
  severity:  OpsErrorSeverity = 'medium',
  errorType  = 'Error',
  diagnosis?: { cause: string; fix: string; confidence?: number },
): void {
  try {
    const store   = getStore()
    const now     = Date.now()
    const msgSlice = msg.slice(0, 500)

    // Deduplicate: same tool + message within 60 s → update timestamp only
    const dup = store.errors.find(
      (e) => e.tool === tool && e.msg === msgSlice && now - e.createdAt < 60_000,
    )
    if (dup) {
      dup.createdAt = now
      if (diagnosis) {
        dup.diagnosis = {
          cause:      diagnosis.cause,
          fix:        diagnosis.fix,
          confidence: diagnosis.confidence ?? 80,
        }
      }
      return
    }

    const id = `${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
    store.errors.unshift({
      id,
      type:     errorType,
      tool,
      severity,
      msg:      msgSlice,
      createdAt: now,
      ...(diagnosis ? {
        diagnosis: {
          cause:      diagnosis.cause,
          fix:        diagnosis.fix,
          confidence: diagnosis.confidence ?? 80,
        },
      } : {}),
    })
    if (store.errors.length > MAX_ERRORS) store.errors.pop()
  } catch {
    // Never propagate
  }
}

// ── Read API ──────────────────────────────────────────────────────────────────

/**
 * Build and return the full ops snapshot synchronously.
 * All data is pre-computed — this function never does I/O.
 */
export function getOpsSnapshot(): OpsSnapshot {
  const store = getStore()
  const sys   = store.sys
  const t     = store.total
  const s     = store.success

  // ── Disabled tools ──────────────────────────────────────────────────────────
  let disabledList: string[] = []
  try {
    const { getDisabledTools } = require('../tool-guard') as typeof import('../tool-guard')
    disabledList = getDisabledTools()
  } catch {}

  // ── Tool stats (Record format for new dashboard) ─────────────────────────────
  const toolStats: OpsSnapshot['toolStats'] = {}
  for (const [name, acc] of store.tools.entries()) {
    toolStats[name] = {
      calls:    acc.calls,
      success:  acc.success,
      fail:     acc.fail,
      durations: [], // individual durations not stored; use totalMs/calls for avg
      enabled:  !disabledList.includes(name),
    }
  }

  // ── Active users (IP-deduplicated) ───────────────────────────────────────────
  let activeUsers: OpsSnapshot['activeUsers'] = []
  try {
    const { getUniqueActiveUsersByIp } = require('./active-users') as typeof import('./active-users')
    activeUsers = getUniqueActiveUsersByIp().map((u) => ({
      id:       u.ip || u.id.slice(0, 12).toUpperCase(),
      ip:       u.ip || 'unknown',
      tool:     u.tool || null,
      since:    u.since,
      lastSeen: u.lastSeen,
      status:   u.status,
    }))
  } catch {}

  // ── Security stats ───────────────────────────────────────────────────────────
  let securityStats: SecurityStatsShape = {
    failedAuthLast24h: 0, rateLimitHitsLast1h: 0,
    topOffendingIps: [], threatLevel: 'none', recentEvents: [],
  }
  try {
    const { getSecurityStats } = require('./security-monitor') as typeof import('./security-monitor')
    securityStats = getSecurityStats()
  } catch {}

  // ── Live events ──────────────────────────────────────────────────────────────
  const events: OpsSnapshot['events'] = store.events.slice(0, 100).map((e, i) => ({
    id:   `${e.ts}-${i}`,
    ts:   e.ts,
    type: e.ok ? 'success' : 'error',
    tool: e.tool,
    msg:  e.ok ? `${e.tool} completed successfully` : `${e.tool} failed`,
  }))

  // ── System alerts ────────────────────────────────────────────────────────────
  const alerts: OpsSnapshot['alerts'] = []
  if (sys.cpu  > 90) alerts.push({ type: 'critical', msg: `High CPU usage: ${sys.cpu.toFixed(1)}%` })
  if (sys.ram  > 90) alerts.push({ type: 'critical', msg: `High memory usage: ${sys.ram.toFixed(1)}%` })
  if (t > 0 && (store.fail / t) > 0.2) alerts.push({ type: 'warning', msg: `High error rate: ${((store.fail / t) * 100).toFixed(1)}%` })
  if (sys.waiting > 50) alerts.push({ type: 'warning', msg: `Large queue backlog: ${sys.waiting} jobs waiting` })

  const uptimeSec = Math.round(process.uptime())

  return {
    // ── Original fields ──────────────────────────────────────────────────────
    activeJobs:     sys.activeJobs,
    totalJobs:      t,
    successCount:   s,
    failedCount:    store.fail,
    successRate:    t > 0 ? Math.round((s / t) * 100) : 100,
    usersToday:     store.usersToday,
    uptimeSeconds:  uptimeSec,
    pid:            process.pid,
    cpu:            sys.cpu,
    ram:            sys.ram,
    memoryMB:       sys.memoryMB,
    snapshotAge:    sys.age,
    queue: {
      waiting:   sys.waiting,
      active:    sys.activeJobs,
      completed: sys.completed,
      failed:    sys.failedQ,
    },
    redisOk:    sys.redisOk,
    sqliteOk:   sys.sqliteOk,
    supabaseOk: sys.supabaseOk,
    errors:         store.errors,
    resolvedErrors: store.resolved,
    liveTools: store.events.slice(0, 100).map((e, i) => ({
      id:   e.ts + i,
      tool: e.tool,
      ok:   e.ok,
      ts:   e.ts,
    })),
    activeUsers,
    toolStats,
    securityStats,
    disabledTools: disabledList,
    // ── Alias / new dashboard fields ─────────────────────────────────────────
    uptime:      uptimeSec,
    failCount:   store.fail,
    memMB:       sys.memoryMB,
    snapAge:     sys.age,
    secFailed:   securityStats.failedAuthLast24h,
    secRateHits: securityStats.rateLimitHitsLast1h,
    events,
    alerts,
  }
}

// ── Background refresh (system / queue / connectivity / SQLite seed) ──────────

async function refreshFromAnalyticsCache(): Promise<void> {
  try {
    // Dynamic import — avoids circular dep:
    //   analytics.ts → central-state → analytics-cache → analytics.ts
    const ac = await import('../telegram/analytics-cache')
    const sys  = ac.getSystemSnapshot()
    const q    = ac.getQueueSnapshot()
    const conn = ac.getConnectivitySnapshot()

    const store = getStore()
    if (sys) {
      store.sys.cpu      = sys.cpu
      store.sys.ram      = sys.memPct
      store.sys.memoryMB = Math.round(sys.memUsed / (1024 * 1024))
      store.sys.age      = ac.snapshotAge(sys)
    }
    if (q) {
      store.sys.activeJobs = q.active
      store.sys.waiting    = q.waiting
      store.sys.completed  = q.completed
      store.sys.failedQ    = q.failed
    }
    if (conn) {
      store.sys.redisOk    = conn.redisOk
      store.sys.sqliteOk   = conn.dbOk
      store.sys.supabaseOk = conn.supabaseOk
    }
  } catch {}
}

async function seedFromSqlite(): Promise<void> {
  try {
    const { dbReadGlobalStats, dbReadToolStats, dbReadUserStats } =
      await import('../telegram/db')

    const globalStats = dbReadGlobalStats()
    const toolRows    = dbReadToolStats()
    const userStats   = dbReadUserStats()

    const store = getStore()

    if (globalStats) {
      // Take max so we never regress if live increments raced ahead
      store.success    = Math.max(store.success, globalStats.successCount)
      store.fail       = Math.max(store.fail,    globalStats.failedCount)
      store.total      = Math.max(store.total,   globalStats.totalJobs)
      store.seeded     = true
    }

    store.usersToday = userStats?.newToday ?? store.usersToday

    // Seed tool stats only for tools NOT already seen live (preserves live increments)
    for (const row of toolRows) {
      if (!store.tools.has(row.name)) {
        const s = Math.round(row.count * row.successRate  / 100)
        const f = Math.round(row.count * row.failureRate  / 100)
        store.tools.set(row.name, {
          calls:   row.count,
          success: s,
          fail:    f,
          totalMs: row.avgDurationMs * row.count,
        })
      }
    }
  } catch {}
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

/**
 * Start the central state manager.
 * Call once from instrumentation.ts at server boot — safe to call multiple times.
 */
export function startCentralState(): void {
  const store = getStore()
  if (store.started) return
  store.started = true

  // Seed immediately from SQLite (gives historical baseline before first SSE tick)
  void seedFromSqlite()

  // Pull system/queue/connectivity snapshots from analytics-cache every 2 s
  const sysTimer = setInterval(() => { void refreshFromAnalyticsCache() }, 2_000)
  if (sysTimer.unref) sysTimer.unref()

  // Re-seed from SQLite every 5 min (picks up Telegram bot writes + usersToday)
  const seedTimer = setInterval(() => { void seedFromSqlite() }, 5 * 60_000)
  if (seedTimer.unref) seedTimer.unref()

  console.log('[CentralState] Started — seeded from SQLite, syncing analytics-cache every 2s')
}
