/**
 * POST /api/internal/auth   { key: string }  → { ok: true, token: string }
 * GET  /api/internal/auth?key=...            → redirect to dashboard
 *
 * Security:
 *  • Returns 404 (not 401/403) on invalid key — hides the route's existence
 *  • Rate limits: 5 failed attempts per IP per 10 minutes
 *  • Optional IP allowlist via OPS_ALLOWED_IPS env var (comma-separated CIDRs/IPs)
 *  • HMAC-signed session cookie (8h expiry)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'

export const runtime = 'nodejs'

const COOKIE_NAME   = 'ops_session_v2'
const COOKIE_MAX_AGE = 8 * 60 * 60   // 8 hours
const DASHBOARD_PATH = '/internal/system-monitor-v2'

// ── Rate Limiting ─────────────────────────────────────────────────────────────

const KEY_RL = Symbol.for('toolify.ops.ratelimit')
type RlMap = Map<string, { count: number; resetAt: number }>
type G = Record<symbol, RlMap>

function getRlMap(): RlMap {
  const g = globalThis as G
  if (!g[KEY_RL]) g[KEY_RL] = new Map()
  return g[KEY_RL]
}

const MAX_ATTEMPTS   = 5
const WINDOW_MS      = 10 * 60 * 1_000  // 10 minutes

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  )
}

function isRateLimited(ip: string): boolean {
  const map = getRlMap()
  const now = Date.now()
  const entry = map.get(ip)
  if (!entry || now > entry.resetAt) {
    // Don't reset yet — wait until there IS a failure
    return false
  }
  return entry.count >= MAX_ATTEMPTS
}

function recordFailedAttempt(ip: string): void {
  const map = getRlMap()
  const now = Date.now()
  const entry = map.get(ip)
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  } else {
    entry.count++
  }
}

function clearAttempts(ip: string): void {
  getRlMap().delete(ip)
}

// ── IP Allowlist ──────────────────────────────────────────────────────────────

function isIpAllowed(ip: string): boolean {
  const raw = process.env.OPS_ALLOWED_IPS ?? ''
  if (!raw.trim()) return true   // allowlist disabled
  const allowed = raw.split(',').map(s => s.trim()).filter(Boolean)
  return allowed.some(a => ip === a || ip.startsWith(a))
}

// ── HMAC token ────────────────────────────────────────────────────────────────

export function makeOpsToken(adminKey: string): string {
  return createHmac('sha256', adminKey).update('ops-v2-session').digest('hex')
}

export function verifyOpsV2Session(request: NextRequest): boolean {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  if (!adminKey) return false
  const expected = makeOpsToken(adminKey)

  // Authorization: Bearer <token> or raw key
  const auth = request.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim()
    if (bearer === adminKey || bearer === expected) return true
  }

  // Cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value ?? ''
  if (cookie === expected) return true

  // Query param ?key=... (for direct URL access)
  const qKey = request.nextUrl.searchParams.get('key') ?? ''
  if (qKey === adminKey || qKey === expected) return true

  return false
}

// ── Handlers ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  if (!adminKey) return new NextResponse(null, { status: 404 })

  const ip = getClientIp(request)

  if (!isIpAllowed(ip)) return new NextResponse(null, { status: 404 })
  if (isRateLimited(ip)) return new NextResponse(null, { status: 404 })

  let body: { key?: string } = {}
  try { body = await request.json() } catch { /* empty body */ }
  const key = (body.key ?? '').trim()

  if (!key || key !== adminKey) {
    recordFailedAttempt(ip)
    return new NextResponse(null, { status: 404 })
  }

  clearAttempts(ip)
  const token = makeOpsToken(adminKey)
  const res   = NextResponse.json({ ok: true, token })
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })
  return res
}

export async function GET(request: NextRequest) {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  const ip       = getClientIp(request)
  const qKey     = request.nextUrl.searchParams.get('key') ?? ''

  if (!adminKey || !qKey) return new NextResponse(null, { status: 404 })
  if (!isIpAllowed(ip))   return new NextResponse(null, { status: 404 })
  if (isRateLimited(ip))  return new NextResponse(null, { status: 404 })

  if (qKey !== adminKey) {
    recordFailedAttempt(ip)
    return new NextResponse(null, { status: 404 })
  }

  clearAttempts(ip)
  const token = makeOpsToken(adminKey)
  const res   = NextResponse.redirect(new URL(DASHBOARD_PATH, request.url))
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   COOKIE_MAX_AGE,
    path:     '/',
  })
  return res
}
