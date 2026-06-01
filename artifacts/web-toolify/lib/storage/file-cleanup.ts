/**
 * Production-ready automatic file cleanup system
 *
 * Covers two storage locations used by this app:
 *
 * 1. /tmp/toolify/{uuid}/   — TempStorage processed/output files
 *    Handled by: TempStorage.cleanup() (every 60 s via setInterval) + startup scan here
 *
 * 2. /tmp/upload-{random}/  — busboy streaming upload staging dirs
 *    Handled by: API routes call cleanup() in finally blocks for normal flow.
 *    This module handles the remainder: dirs orphaned by crashes or server restarts.
 *
 * Safety invariant: NOTHING newer than SAFE_AGE_MS (60 min) is ever touched.
 * Even if the clock drifts or a file has no metadata, the mtime check prevents
 * accidental deletion of files that are still in use.
 */

import { readdir, stat, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/** Files younger than this are NEVER deleted, regardless of any other condition. */
const SAFE_AGE_MS = 60 * 60 * 1000 // 60 minutes

const TMP_DIR = tmpdir()
const TOOLIFY_DIR = join(TMP_DIR, 'toolify')
const UPLOAD_PREFIX = 'upload-'

interface CleanupResult {
  uploadDirsRemoved: number
  tempStorageRemoved: number
}

/* ── Orphaned busboy upload dirs (/tmp/upload-*/) ─────────────────────────
 *
 * busboy writes incoming uploads to mkdtemp dirs under /tmp/upload-{random}/.
 * Routes delete these in finally blocks. When a route crashes or the server
 * restarts mid-request the dir is left behind. We clean those up here.
 */
async function cleanOrphanedUploadDirs(): Promise<number> {
  const now = Date.now()
  let removed = 0

  let entries: string[]
  try {
    entries = await readdir(TMP_DIR)
  } catch {
    return 0
  }

  const candidates = entries.filter((e) => e.startsWith(UPLOAD_PREFIX))

  await Promise.all(
    candidates.map(async (entry) => {
      const dirPath = join(TMP_DIR, entry)
      try {
        const st = await stat(dirPath)
        if (!st.isDirectory()) return

        const ageMs = now - st.mtimeMs
        if (ageMs < SAFE_AGE_MS) return // too young — still potentially in use

        await rm(dirPath, { recursive: true, force: true })
        removed++
        console.log(
          `[FileCleanup] Removed orphaned upload dir: ${entry} ` +
          `(age: ${Math.round(ageMs / 60_000)} min)`
        )
      } catch {
        /* already gone, permission error, or concurrent deletion — ignore */
      }
    })
  )

  return removed
}

/* ── Expired/orphaned TempStorage entries (/tmp/toolify/{uuid}/) ──────────
 *
 * TempStorage already runs a setInterval every 60 s. This function is the
 * startup sweep that catches entries that expired while the server was down.
 * It also catches uuid dirs that have no meta.json (partial writes from a
 * crash) and are older than SAFE_AGE_MS.
 */
async function cleanExpiredTempStorageEntries(): Promise<number> {
  const now = Date.now()
  let removed = 0

  let entries: string[]
  try {
    entries = await readdir(TOOLIFY_DIR)
  } catch {
    return 0 // directory doesn't exist yet — nothing to clean
  }

  await Promise.all(
    entries.map(async (entry) => {
      const dirPath = join(TOOLIFY_DIR, entry)
      try {
        const st = await stat(dirPath)
        if (!st.isDirectory()) return

        let shouldDelete = false

        // Primary check: read meta.json expiresAt
        try {
          const raw = await readFile(join(dirPath, 'meta.json'), 'utf8')
          const meta = JSON.parse(raw) as { expiresAt: number }
          if (typeof meta.expiresAt === 'number' && now > meta.expiresAt) {
            shouldDelete = true
          }
        } catch {
          // No meta.json or corrupt — use directory mtime as conservative fallback.
          // Only delete if it's clearly old (> SAFE_AGE_MS).
          const ageMs = now - st.mtimeMs
          if (ageMs > SAFE_AGE_MS) {
            shouldDelete = true
          }
        }

        if (!shouldDelete) return

        // Final safety guard: never delete anything younger than SAFE_AGE_MS,
        // even if meta.json says expired (guards against clock skew).
        const ageMs = now - st.mtimeMs
        if (ageMs < SAFE_AGE_MS) return

        await rm(dirPath, { recursive: true, force: true })
        removed++
        console.log(`[FileCleanup] Removed expired TempStorage entry: ${entry}`)
      } catch {
        /* concurrent deletion or permission error — ignore */
      }
    })
  )

  return removed
}

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Run once at server startup.
 * Clears files that expired while the server was offline and any orphaned
 * upload dirs left behind by previous crashes.
 */
export async function runStartupCleanup(): Promise<void> {
  console.log('[FileCleanup] Starting startup sweep...')
  const start = Date.now()

  const [uploadDirsRemoved, tempStorageRemoved] = await Promise.all([
    cleanOrphanedUploadDirs(),
    cleanExpiredTempStorageEntries(),
  ])

  const elapsed = Date.now() - start
  console.log(
    `[FileCleanup] Startup sweep complete in ${elapsed}ms — ` +
    `removed ${uploadDirsRemoved} orphaned upload dir(s), ` +
    `${tempStorageRemoved} expired TempStorage entry(s)`
  )
}

let periodicSweepTimer: NodeJS.Timeout | null = null

/**
 * Start a background interval (default: every 10 minutes) that sweeps for
 * orphaned upload dirs. TempStorage already handles its own directory via its
 * internal 60-second interval — this covers the upload staging gap only.
 */
export function startPeriodicOrphanSweep(intervalMs = 10 * 60 * 1000): void {
  if (periodicSweepTimer) return

  periodicSweepTimer = setInterval(async () => {
    try {
      const removed = await cleanOrphanedUploadDirs()
      if (removed > 0) {
        console.log(`[FileCleanup] Periodic sweep: removed ${removed} orphaned upload dir(s)`)
      }
    } catch {
      /* non-fatal — next interval will retry */
    }
  }, intervalMs)

  // Don't hold the event loop open for cleanup alone
  if (periodicSweepTimer.unref) periodicSweepTimer.unref()

  console.log(
    `[FileCleanup] Periodic orphan sweep started — interval: ${intervalMs / 60_000} min`
  )
}

export function stopPeriodicOrphanSweep(): void {
  if (periodicSweepTimer) {
    clearInterval(periodicSweepTimer)
    periodicSweepTimer = null
  }
}

/** Exposed for the Telegram /health and /files commands. */
export async function getCleanupStats(): Promise<CleanupResult> {
  const [uploadDirsRemoved, tempStorageRemoved] = await Promise.all([
    cleanOrphanedUploadDirs(),
    cleanExpiredTempStorageEntries(),
  ])
  return { uploadDirsRemoved, tempStorageRemoved }
}
