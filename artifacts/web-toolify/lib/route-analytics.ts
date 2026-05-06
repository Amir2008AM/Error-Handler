/**
 * Route Analytics Tracker
 *
 * Inspired by the Google Analytics beacon pattern:
 * - Fires asynchronously (setImmediate) so it NEVER blocks the HTTP response
 * - Silent — errors are swallowed so a tracking bug can't crash a route
 * - Single call site: trackRoute({ tool, file, success, durationMs, error })
 *
 * Call this from every API route after processing completes (success or failure).
 * It bridges the gap between direct-route processing and the Telegram bot's
 * analytics pipeline (recordJob / recordError → SQLite → bot commands).
 */

import { recordJob, recordError } from '@/lib/telegram/analytics'

export interface RouteTrackOptions {
  tool:        string
  fileSizeB?:  number
  format?:     string
  success:     boolean
  durationMs:  number
  errorMsg?:   string
  requestId?:  string
}

/**
 * Fire-and-forget analytics event.
 * Always safe to call — never throws, never blocks.
 */
export function trackRoute(opts: RouteTrackOptions): void {
  setImmediate(() => {
    try {
      const format = (opts.format ?? 'unknown').toLowerCase().replace(/^\./, '')

      recordJob({
        type:       opts.tool,
        success:    opts.success,
        durationMs: opts.durationMs,
        fileSizeB:  opts.fileSizeB ?? 0,
        format,
        userId:     opts.requestId ?? `route-${Date.now().toString(36)}`,
        ts:         Date.now(),
      })

      if (!opts.success && opts.errorMsg) {
        recordError(opts.tool, opts.errorMsg)
      }
    } catch {
      // Intentionally silent — analytics must never affect the user experience
    }
  })
}

/**
 * Extract the file extension from a filename, defaulting to a fallback.
 * e.g. 'document.pdf' → 'pdf', 'photo.JPEG' → 'jpeg', 'file' → fallback
 */
export function extOf(filename: string | undefined, fallback = 'unknown'): string {
  if (!filename) return fallback
  const dot = filename.lastIndexOf('.')
  if (dot === -1 || dot === filename.length - 1) return fallback
  return filename.slice(dot + 1).toLowerCase()
}
