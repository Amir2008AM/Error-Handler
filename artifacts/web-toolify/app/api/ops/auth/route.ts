import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'
import { recordFailedAuth } from '@/lib/monitoring/security-monitor'

export const runtime = 'nodejs'

const COOKIE_NAME    = 'ops_session'
const COOKIE_NAME_V2 = 'ops_session_v2'
const COOKIE_MAX_AGE = 8 * 60 * 60 // 8 hours

function makeToken(key: string): string {
  return createHmac('sha256', key).update('ops-session-v1').digest('hex')
}

function makeTokenV2(key: string): string {
  return createHmac('sha256', key).update('ops-v2-session').digest('hex')
}

function setSessionCookies(response: NextResponse, adminKey: string): void {
  const cookieOpts = {
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  }
  response.cookies.set(COOKIE_NAME,    makeToken(adminKey),   cookieOpts)
  response.cookies.set(COOKIE_NAME_V2, makeTokenV2(adminKey), cookieOpts)
}

/** POST /api/ops/auth  { key: string } → { ok: true } or 404 */
export async function POST(request: NextRequest) {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  if (!adminKey) return new NextResponse('Not Found', { status: 404 })

  let body: { key?: string } = {}
  try { body = await request.json() } catch { /* empty body */ }
  const key = (body.key ?? '').trim()

  if (!key || key !== adminKey) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'
    recordFailedAuth(ip)
    return new NextResponse('Not Found', { status: 404 })
  }

  const token = makeToken(adminKey)
  const response = NextResponse.json({ ok: true, token })
  setSessionCookies(response, adminKey)
  return response
}

/** GET /api/ops/auth?key=... → redirect to /ops (kept for backwards-compat) */
export async function GET(request: NextRequest) {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  const key = request.nextUrl.searchParams.get('key') ?? ''

  if (!adminKey || !key || key !== adminKey) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const response = NextResponse.redirect(new URL('/ops', request.url))
  setSessionCookies(response, adminKey)
  return response
}

/** Verify session from cookie or Authorization header */
export function verifyOpsSession(request: NextRequest): boolean {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  if (!adminKey) return false
  const expected = makeToken(adminKey)

  // Check Authorization: Bearer <token>
  const auth = request.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) {
    const bearer = auth.slice(7).trim()
    // Accept either raw key or HMAC token
    if (bearer === adminKey || bearer === expected) return true
  }

  // Fallback: cookie
  const cookie = request.cookies.get(COOKIE_NAME)?.value ?? ''
  return cookie === expected
}
