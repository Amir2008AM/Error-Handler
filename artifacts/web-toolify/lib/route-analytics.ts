/**
 * Route Analytics Tracker
 *
 * Bridges direct-route processing (synchronous API routes) with both
 * the Telegram bot's SQLite analytics pipeline AND the Supabase
 * monitoring layer.
 *
 * Also maintains the live active-user map for the ops dashboard:
 *  - On each tool invocation: upsertActiveUser (status = 'processing')
 *  - On completion:           setUserIdle
 *
 * Rules:
 *  - Fires asynchronously (setImmediate) — never blocks the HTTP response
 *  - Silent — errors are swallowed so a tracking bug can't crash a route
 *  - Single call site: trackRouteRequest(request, { tool, ... })
 */

import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { recordJob, recordError } from '@/lib/telegram/analytics'
import { emitEvent, upsertSession } from '@/lib/monitoring/emitter'
import { upsertActiveUser, setUserIdle } from '@/lib/monitoring/active-users'
import { csWriteError } from '@/lib/monitoring/central-state'

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
 * Uses the toolify_sid cookie first, then falls back to a SHA-256 of the IP.
 */
export function getClientId(request: NextRequest): string {
  const sid = request.cookies.get('toolify_sid')?.value
  if (sid) return sid

  const forwarded = request.headers.get('x-forwarded-for')
  const realIp    = request.headers.get('x-real-ip')
  const ip        = (forwarded?.split(',')[0] ?? realIp ?? '').trim()
  if (!ip) return `anon-${Math.random().toString(36).slice(2, 10)}`
  return createHash('sha256').update(ip).digest('hex').slice(0, 16)
}

/**
 * Extract the raw client IP without hashing (used for active-user display).
 */
function getRawIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp    = request.headers.get('x-real-ip')
  return (forwarded?.split(',')[0] ?? realIp ?? '').trim() || '0.0.0.0'
}

/**
 * Preferred call site — automatically derives a stable client ID from the
 * request cookies / IP so repeated calls by the same user are de-duplicated.
 */
export function trackRouteRequest(
  request: NextRequest,
  opts: Omit<RouteTrackOptions, 'requestId'>,
): void {
  const clientId = getClientId(request)
  const rawIp    = getRawIp(request)

  // Mark user as processing immediately (before async hop)
  try {
    upsertActiveUser(clientId, rawIp, opts.tool, 'processing')
  } catch {}

  trackRoute({ ...opts, requestId: clientId }, rawIp)
}

/**
 * Fire-and-forget analytics event.
 * Writes to in-memory ring buffer + SQLite + Supabase + active-user map.
 * Always safe to call — never throws, never blocks.
 */
export function trackRoute(opts: RouteTrackOptions, rawIp = '0.0.0.0'): void {
  setImmediate(() => {
    try {
      const format   = (opts.format ?? 'unknown').toLowerCase().replace(/^\./, '')
      const clientId = opts.requestId ?? `anon-${Math.random().toString(36).slice(2, 10)}`

      // 1. SQLite + in-memory (existing pipeline)
      recordJob({
        type:       opts.tool,
        success:    opts.success,
        durationMs: opts.durationMs,
        fileSizeB:  opts.fileSizeB ?? 0,
        format,
        userId:     clientId,
        ts:         Date.now(),
      })

      if (!opts.success && opts.errorMsg) {
        recordError(opts.tool, opts.errorMsg)
        // Also write to central state so errors appear in the dashboard immediately
        csWriteError(opts.tool, opts.errorMsg, 'medium', 'route-error')
      }

      // 2. Supabase — emit upload_received event + upsert session
      emitEvent({
        event_type:    'upload_received',
        tool:          opts.tool,
        status:        opts.success ? 'completed' : 'failed',
        duration_ms:   opts.durationMs,
        file_size:     opts.fileSizeB ?? null,
        session_id:    clientId,
        error_message: opts.success ? null : (opts.errorMsg?.slice(0, 500) ?? null),
        metadata:      { format },
      })

      upsertSession(clientId, opts.tool)

      // 3. Active user map — mark idle after job finishes
      upsertActiveUser(clientId, rawIp, opts.tool, opts.success ? 'idle' : 'idle')
      setUserIdle(clientId)
    } catch {
      // Intentionally silent
    }
  })
}

/**
 * Extract the file extension from a filename.
 */
export function extOf(filename: string | undefined, fallback = 'unknown'): string {
  if (!filename) return fallback
  const dot = filename.lastIndexOf('.')
  if (dot === -1 || dot === filename.length - 1) return fallback
  return filename.slice(dot + 1).toLowerCase()
}
