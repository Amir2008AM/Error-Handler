/**
 * Route Analytics Tracker
 *
 * Inspired by the Google Analytics beacon pattern:
 * - Fires asynchronously (setImmediate) so it NEVER blocks the HTTP response
 * - Silent — errors are swallowed so a tracking bug can't crash a route
 * - Single call site: trackRouteRequest(request, { tool, ... })
 *
 * Call this from every API route after processing completes (success or failure).
 * It bridges the gap between direct-route processing and the Telegram bot's
 * analytics pipeline (recordJob / recordError → SQLite → bot commands).
 */

import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
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
 * Derive a stable, anonymised client fingerprint from the HTTP request.
 * Uses the client IP address hashed with SHA-256 — no PII is stored.
 * The same IP always maps to the same ID so the user_activity UPSERT
 * correctly increments requests_count instead of inserting a new row.
 */
export function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp    = request.headers.get('x-real-ip')
  const ip        = (forwarded?.split(',')[0] ?? realIp ?? '').trim()
  if (!ip) return `anon-${Math.random().toString(36).slice(2, 10)}`
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

/**
 * Preferred call site — automatically derives a stable client ID from the
 * request IP so repeated calls by the same user are de-duplicated in the
 * user_activity table (UPSERT increments requests_count, not a new row).
 */
export function trackRouteRequest(
  request: NextRequest,
  opts: Omit<RouteTrackOptions, 'requestId'>,
): void {
  const clientId = getClientId(request)
  trackRoute({ ...opts, requestId: clientId })
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
        userId:     opts.requestId ?? `anon-${Math.random().toString(36).slice(2, 10)}`,
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
