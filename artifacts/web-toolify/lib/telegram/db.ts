/**
 * Analytics SQLite Database
 *
 * Uses the built-in `node:sqlite` module (Node.js 24, SQLite 3.51.2).
 * No native compilation required.
 *
 * SCOPE: Telegram Bot analytics ONLY.
 * ✅ jobs_history, user_activity, errors_log, file_stats
 * ❌ NOT used by: core processing, job queue, workers, or website logic.
 *
 * Design:
 *  - WAL mode for concurrent reads
 *  - Lazy singleton — DB opens on first write/read
 *  - Public write functions dispatch via setImmediate so callers
 *    (job-processor.ts) are never blocked by disk I/O
 *  - Auto-cleanup removes rows older than 30 days (runs hourly)
 */

import { DatabaseSync, StatementSync } from 'node:sqlite'
import { join } from 'node:path'

const DB_PATH = process.env.ANALYTICS_DB_PATH ?? join(process.cwd(), 'analytics.db')

// ── Singleton ────────────────────────────────────────────────────────────────

let _db: DatabaseSync | null = null

export function getDb(): DatabaseSync | null {
  if (_db) return _db
  try {
    _db = new DatabaseSync(DB_PATH)

    // WAL mode + performance tuning (exec is the API for pragmas)
    _db.exec('PRAGMA journal_mode = WAL')
    _db.exec('PRAGMA synchronous  = NORMAL')
    _db.exec('PRAGMA cache_size   = -8000')   // 8 MB page cache
    _db.exec('PRAGMA temp_store   = MEMORY')
    _db.exec('PRAGMA mmap_size    = 67108864') // 64 MB mmap

    // Schema
    _db.exec(`
      CREATE TABLE IF NOT EXISTS jobs_history (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id              TEXT    NOT NULL,
        tool                TEXT    NOT NULL,
        status              TEXT    NOT NULL,
        processing_time_ms  INTEGER NOT NULL DEFAULT 0,
        file_size_bytes     INTEGER NOT NULL DEFAULT 0,
        format              TEXT    NOT NULL DEFAULT '',
        created_at          INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_jh_created_at ON jobs_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_jh_tool       ON jobs_history(tool);

      CREATE TABLE IF NOT EXISTS user_activity (
        user_id         TEXT    PRIMARY KEY,
        requests_count  INTEGER NOT NULL DEFAULT 1,
        last_active     INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_ua_last_active ON user_activity(last_active DESC);

      CREATE TABLE IF NOT EXISTS errors_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        error_type  TEXT    NOT NULL DEFAULT 'processing',
        tool        TEXT    NOT NULL,
        message     TEXT    NOT NULL,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_el_created_at ON errors_log(created_at DESC);

      CREATE TABLE IF NOT EXISTS file_stats (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        file_size_bytes  INTEGER NOT NULL DEFAULT 0,
        file_type        TEXT    NOT NULL,
        created_at       INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_fs_created_at ON file_stats(created_at DESC);
    `)

    console.log(`[Analytics DB] node:sqlite ready (WAL) → ${DB_PATH}`)
    _scheduleCleanup(_db)
    return _db
  } catch (err) {
    console.error('[Analytics DB] Init failed — in-memory fallback active:', (err as Error).message)
    return null
  }
}

// ── Auto-cleanup (hourly, non-blocking) ─────────────────────────────────────

function _scheduleCleanup(db: DatabaseSync): void {
  const THIRTY_DAYS = 30 * 86_400_000
  const interval = setInterval(() => {
    try {
      const cutoff = Date.now() - THIRTY_DAYS
      db.exec(`DELETE FROM jobs_history WHERE created_at < ${cutoff}`)
      db.exec(`DELETE FROM errors_log   WHERE created_at < ${cutoff}`)
      db.exec(`DELETE FROM file_stats   WHERE created_at < ${cutoff}`)
      db.exec(`
        DELETE FROM errors_log WHERE id NOT IN (
          SELECT id FROM errors_log ORDER BY created_at DESC LIMIT 5000
        )
      `)
    } catch { /* never crash the server */ }
  }, 3_600_000)
  if (interval.unref) interval.unref()
}

// ── Prepared statement cache ──────────────────────────────────────────────────
// Prepared once per singleton lifetime, reused on every call (fast).

let _stmtInsertJob: StatementSync | null = null
let _stmtUpsertUser: StatementSync | null = null
let _stmtInsertError: StatementSync | null = null
let _stmtInsertFile: StatementSync | null = null

function _prepareStatements(db: DatabaseSync): void {
  if (_stmtInsertJob) return
  _stmtInsertJob = db.prepare(`
    INSERT INTO jobs_history
      (job_id, tool, status, processing_time_ms, file_size_bytes, format, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  _stmtUpsertUser = db.prepare(`
    INSERT INTO user_activity (user_id, requests_count, last_active)
    VALUES (?, 1, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      requests_count = requests_count + 1,
      last_active    = excluded.last_active
  `)
  _stmtInsertError = db.prepare(`
    INSERT INTO errors_log (error_type, tool, message, created_at)
    VALUES ('processing', ?, ?, ?)
  `)
  _stmtInsertFile = db.prepare(`
    INSERT INTO file_stats (file_size_bytes, file_type, created_at)
    VALUES (?, ?, ?)
  `)
}

// ── Public write API (non-blocking — each write deferred via setImmediate) ───

export function dbWriteJob(
  jobId: string, tool: string, status: 'success' | 'failed',
  processingTimeMs: number, fileSizeBytes: number, format: string,
): void {
  setImmediate(() => {
    const db = getDb()
    if (!db) return
    try {
      _prepareStatements(db)
      const now = Date.now()
      _stmtInsertJob!.run(jobId, tool, status, processingTimeMs, fileSizeBytes, format, now)
      _stmtUpsertUser!.run(jobId.slice(0, 16), now)
    } catch (err) {
      console.error('[Analytics DB] dbWriteJob failed:', (err as Error).message)
    }
  })
}

export function dbWriteError(tool: string, message: string): void {
  setImmediate(() => {
    const db = getDb()
    if (!db) return
    try {
      _prepareStatements(db)
      _stmtInsertError!.run(tool, message.slice(0, 500), Date.now())
    } catch (err) {
      console.error('[Analytics DB] dbWriteError failed:', (err as Error).message)
    }
  })
}

export function dbWriteFileStat(fileSizeBytes: number, fileType: string): void {
  setImmediate(() => {
    const db = getDb()
    if (!db) return
    try {
      _prepareStatements(db)
      _stmtInsertFile!.run(fileSizeBytes, fileType, Date.now())
    } catch (err) {
      console.error('[Analytics DB] dbWriteFileStat failed:', (err as Error).message)
    }
  })
}

// ── Public read API (synchronous, indexed queries — sub-millisecond) ─────────

export interface DbGlobalStats {
  totalJobs:      number
  jobsToday:      number
  successCount:   number
  failedCount:    number
  successRate:    number
  avgDurationMs:  number
  totalUsers:     number
  activeUsers24h: number
}

export function dbReadGlobalStats(): DbGlobalStats | null {
  const db = getDb()
  if (!db) return null
  try {
    const day24h = Date.now() - 86_400_000
    const row = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN created_at > ${day24h} THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)     AS success,
        SUM(CASE WHEN status = 'failed'  THEN 1 ELSE 0 END)     AS failed,
        AVG(CASE WHEN status = 'success' THEN processing_time_ms END) AS avg_ms
      FROM jobs_history
    `).get() as { total: number; today: number; success: number; failed: number; avg_ms: number | null }

    const usersRow = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN last_active > ${day24h} THEN 1 ELSE 0 END) AS active24h
      FROM user_activity
    `).get() as { total: number; active24h: number }

    const total   = row.total   ?? 0
    const success = row.success ?? 0
    return {
      totalJobs:      total,
      jobsToday:      row.today      ?? 0,
      successCount:   success,
      failedCount:    row.failed     ?? 0,
      successRate:    total > 0 ? Math.round((success / total) * 100) : 100,
      avgDurationMs:  Math.round(row.avg_ms ?? 0),
      totalUsers:     usersRow.total     ?? 0,
      activeUsers24h: usersRow.active24h ?? 0,
    }
  } catch (err) {
    console.error('[Analytics DB] dbReadGlobalStats failed:', (err as Error).message)
    return null
  }
}

export interface DbToolStat {
  name:          string
  count:         number
  successRate:   number
  avgDurationMs: number
  failureRate:   number
}

export function dbReadToolStats(): DbToolStat[] {
  const db = getDb()
  if (!db) return []
  try {
    const rows = db.prepare(`
      SELECT
        tool,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success,
        AVG(CASE WHEN status = 'success' THEN processing_time_ms END) AS avg_ms
      FROM jobs_history
      GROUP BY tool
      ORDER BY total DESC
      LIMIT 25
    `).all() as Array<{ tool: string; total: number; success: number; avg_ms: number | null }>

    return rows.map((r) => ({
      name:          r.tool,
      count:         r.total,
      successRate:   r.total > 0 ? Math.round((r.success / r.total) * 100) : 100,
      avgDurationMs: Math.round(r.avg_ms ?? 0),
      failureRate:   r.total > 0 ? Math.round(((r.total - r.success) / r.total) * 100) : 0,
    }))
  } catch (err) {
    console.error('[Analytics DB] dbReadToolStats failed:', (err as Error).message)
    return []
  }
}

export interface DbErrorRecord {
  tool:    string
  message: string
  ts:      number
}

export function dbReadRecentErrors(limit = 10): DbErrorRecord[] {
  const db = getDb()
  if (!db) return []
  try {
    return db.prepare(`
      SELECT tool, message, created_at AS ts
      FROM errors_log
      ORDER BY created_at DESC
      LIMIT ${limit}
    `).all() as unknown as DbErrorRecord[]
  } catch { return [] }
}

export interface DbFileStats {
  total:     number
  avgSizeB:  number
  maxSizeB:  number
  topFormat: string
}

export function dbReadFileStats(): DbFileStats | null {
  const db = getDb()
  if (!db) return null
  try {
    const agg = db.prepare(`
      SELECT COUNT(*) AS total, AVG(file_size_bytes) AS avg_sz, MAX(file_size_bytes) AS max_sz
      FROM file_stats
    `).get() as { total: number; avg_sz: number | null; max_sz: number | null }

    const fmt = db.prepare(`
      SELECT file_type, COUNT(*) AS cnt FROM file_stats
      GROUP BY file_type ORDER BY cnt DESC LIMIT 1
    `).get() as { file_type: string } | undefined

    return {
      total:     agg.total   ?? 0,
      avgSizeB:  Math.round(agg.avg_sz ?? 0),
      maxSizeB:  agg.max_sz  ?? 0,
      topFormat: fmt?.file_type ?? 'n/a',
    }
  } catch { return null }
}

export interface DbUserStats {
  total:    number
  newToday: number
  top: Array<{ userId: string; count: number }>
}

export function dbReadUserStats(): DbUserStats | null {
  const db = getDb()
  if (!db) return null
  try {
    const day24h = Date.now() - 86_400_000
    const agg = db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN last_active > ${day24h} THEN 1 ELSE 0 END) AS new_today
      FROM user_activity
    `).get() as { total: number; new_today: number }

    const top = db.prepare(`
      SELECT user_id, requests_count FROM user_activity
      ORDER BY requests_count DESC LIMIT 10
    `).all() as Array<{ user_id: string; requests_count: number }>

    return {
      total:    agg.total     ?? 0,
      newToday: agg.new_today ?? 0,
      top: top.map((r) => ({ userId: r.user_id, count: r.requests_count })),
    }
  } catch { return null }
}

export interface DbInsights {
  slowest:     DbToolStat | null
  mostFailing: DbToolStat | null
}

export function dbReadInsights(): DbInsights {
  const tools = dbReadToolStats()
  return {
    slowest:     tools.slice().sort((a, b) => b.avgDurationMs - a.avgDurationMs)[0] ?? null,
    mostFailing: tools.slice().sort((a, b) => b.failureRate - a.failureRate)[0] ?? null,
  }
}

// ── User Preferences (language per admin) ────────────────────────────────────

import type { Lang } from './i18n'

function _ensurePreferencesTable(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id   INTEGER PRIMARY KEY,
      language  TEXT    NOT NULL DEFAULT 'en'
    )
  `)
}

let _prefsTableReady = false
function _getPrefsDb(): DatabaseSync | null {
  const db = getDb()
  if (!db) return null
  if (!_prefsTableReady) {
    _ensurePreferencesTable(db)
    _prefsTableReady = true
  }
  return db
}

/** Get stored language for an admin user. Returns 'en' if not set or DB unavailable. */
export function dbGetLanguage(userId: number): Lang {
  try {
    const db = _getPrefsDb()
    if (!db) return 'en'
    const row = db.prepare(
      'SELECT language FROM user_preferences WHERE user_id = ?'
    ).get(userId) as { language: string } | undefined
    const lang = row?.language
    return (lang === 'en' || lang === 'ar') ? lang : 'en'
  } catch { return 'en' }
}

/** Persist language preference for an admin user (synchronous — user action, not hot path). */
export function dbSetLanguage(userId: number, lang: Lang): void {
  try {
    const db = _getPrefsDb()
    if (!db) return
    db.prepare(`
      INSERT INTO user_preferences (user_id, language) VALUES (?, ?)
      ON CONFLICT(user_id) DO UPDATE SET language = excluded.language
    `).run(userId, lang)
  } catch (err) {
    console.error('[Analytics DB] dbSetLanguage failed:', (err as Error).message)
  }
}
