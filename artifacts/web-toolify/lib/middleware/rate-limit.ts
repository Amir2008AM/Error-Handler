/**
 * In-process sliding-window rate limiter.
 *
 * Design goals:
 *  - No external dependencies (no Redis required)
 *  - O(1) check + record using a ring-buffer per key
 *  - Automatic cleanup so memory doesn't grow with unique IPs
 *  - Returns enough context for proper 429 + Retry-After headers
 *
 * When you add Redis/BullMQ, replace `windows` with a Redis ZSET and the
 * check + trim becomes a Lua script — the API surface here stays identical.
 */

import { NextRequest, NextResponse } from 'next/server'

interface Window {
  timestamps: number[]
  lastSeen: number
}

const windows = new Map<string, Window>()
let cleanupScheduled = false

/** Remove keys that haven't been seen for > 5 minutes. */
function scheduleCleanup(): void {
  if (cleanupScheduled) return
  cleanupScheduled = true
  setTimeout(() => {
    const stale = Date.now() - 5 * 60 * 1000
    for (const [key, win] of windows) {
      if (win.lastSeen < stale) windows.delete(key)
    }
    cleanupScheduled = false
  }, 60_000).unref?.()
}

export interface RateLimitConfig {
  /** Max requests allowed per window. */
  limit: number
  /** Sliding window duration in ms. */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInMs: number
}

/**
 * Check (and record) a request for `key`.
 * Returns `allowed: false` when the limit is exceeded.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  scheduleCleanup()

  let win = windows.get(key)
  if (!win) {
    win = { timestamps: [], lastSeen: now }
    windows.set(key, win)
  }
  win.lastSeen = now

  // Trim timestamps outside the current window.
  const cutoff = now - config.windowMs
  let start = 0
  while (start < win.timestamps.length && win.timestamps[start] < cutoff) start++
  if (start > 0) win.timestamps.splice(0, start)

  const count = win.timestamps.length
  if (count >= config.limit) {
    const oldestInWindow = win.timestamps[0]
    return {
      allowed: false,
      remaining: 0,
      resetInMs: config.windowMs - (now - oldestInWindow),
    }
  }

  win.timestamps.push(now)
  return {
    allowed: true,
    remaining: config.limit - count - 1,
    resetInMs: config.windowMs,
  }
}

/**
 * Extract the best available IP identifier from a Next.js request.
 * Handles Cloudflare, Vercel, and plain TCP.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  )
}

// ── Pre-defined profiles ──────────────────────────────────────────────────

/** For job creation: 20 jobs per minute per IP. */
export const JOB_CREATE_LIMIT: RateLimitConfig = { limit: 20, windowMs: 60_000 }

/** For status polling: 120 polls per minute per IP. */
export const JOB_STATUS_LIMIT: RateLimitConfig = { limit: 120, windowMs: 60_000 }

/** For file downloads: 60 per minute per IP. */
export const FILE_DOWNLOAD_LIMIT: RateLimitConfig = { limit: 60, windowMs: 60_000 }

/**
 * Tool-class rate limit tiers.
 *
 * HEAVY  — LibreOffice, OCR, Tesseract, Python Excel converter
 *          5 requests / minute / IP
 * MEDIUM — Ghostscript compress, pdfjs rendering, PDF→Excel
 *          15 requests / minute / IP
 * LIGHT  — pdf-lib operations, Sharp image ops
 *          30 requests / minute / IP
 */
export const HEAVY_TOOL_LIMIT:  RateLimitConfig = { limit: 5,  windowMs: 60_000 }
export const MEDIUM_TOOL_LIMIT: RateLimitConfig = { limit: 15, windowMs: 60_000 }
export const LIGHT_TOOL_LIMIT:  RateLimitConfig = { limit: 30, windowMs: 60_000 }

/** Map from registry tier name to config. */
export const TIER_CONFIGS: Record<string, RateLimitConfig> = {
  heavy:  HEAVY_TOOL_LIMIT,
  medium: MEDIUM_TOOL_LIMIT,
  light:  LIGHT_TOOL_LIMIT,
}

/**
 * Apply rate limiting inside an API route handler.
 * Returns a 429 NextResponse when the limit is exceeded, or `null` when ok.
 *
 * Usage:
 *   const limited = applyRateLimit(request, JOB_CREATE_LIMIT)
 *   if (limited) return limited
 */
export function applyRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  keyPrefix = 'rl'
): NextResponse | null {
  const ip = getClientIp(req)
  const key = `${keyPrefix}:${ip}`
  const result = checkRateLimit(key, config)

  if (!result.allowed) {
    const retryAfterSec = Math.ceil(result.resetInMs / 1000)
    return NextResponse.json(
      {
        error: 'Too many requests. Please slow down.',
        retryAfterSeconds: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(config.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Date.now() + result.resetInMs),
        },
      }
    )
  }

  return null
}

/**
 * Apply tool-aware rate limiting using the tool registry tier.
 * Looks up the tier from the registry; falls back to MEDIUM if slug unknown.
 *
 * Usage:
 *   const limited = applyToolRateLimit(request, 'excel-to-pdf')
 *   if (limited) return limited
 */
export function applyToolRateLimit(req: NextRequest, toolSlug: string): NextResponse | null {
  // Lazy import to avoid circular deps (registry → rate-limit → registry)
  // We use TIER_CONFIGS directly keyed by the tier string.
  const { getToolMeta } = require('@/lib/tool-registry') as typeof import('@/lib/tool-registry')
  const meta = getToolMeta(toolSlug)
  const config = meta ? (TIER_CONFIGS[meta.rateTier] ?? MEDIUM_TOOL_LIMIT) : MEDIUM_TOOL_LIMIT
  return applyRateLimit(req, config, `tool:${toolSlug}`)
}
