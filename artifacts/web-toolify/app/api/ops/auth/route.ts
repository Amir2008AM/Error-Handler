import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'

export const runtime = 'nodejs'

const COOKIE_NAME = 'ops_session'
const COOKIE_MAX_AGE = 8 * 60 * 60 // 8 hours

function makeToken(key: string): string {
  return createHmac('sha256', key).update('ops-session-v1').digest('hex')
}

/** POST /api/ops/auth  { key: string } → { ok: true } or 404 */
export async function POST(request: NextRequest) {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  if (!adminKey) return new NextResponse('Not Found', { status: 404 })

  let body: { key?: string } = {}
  try { body = await request.json() } catch { /* empty body */ }
  const key = (body.key ?? '').trim()

  if (!key || key !== adminKey) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const token = makeToken(adminKey)
  const response = NextResponse.json({ ok: true, token })
  // Also set cookie as a convenience (works in same-site contexts)
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
  return response
}

/** GET /api/ops/auth?key=... → redirect to /ops (kept for backwards-compat) */
export async function GET(request: NextRequest) {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  const key = request.nextUrl.searchParams.get('key') ?? ''

  if (!adminKey || !key || key !== adminKey) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const token = makeToken(adminKey)
  const response = NextResponse.redirect(new URL('/ops', request.url))
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  })
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
