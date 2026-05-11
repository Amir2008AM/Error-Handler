import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding window rate limiter (no external dependencies)
const rateLimitStore = new Map<string, number[]>()

const WINDOW_MS    = 60 * 1000  // 1 minute
const MAX_REQUESTS = 120         // 2 per second average — generous for a tool site

function isRateLimited(ip: string): boolean {
  const now         = Date.now()
  const windowStart = now - WINDOW_MS
  const timestamps  = rateLimitStore.get(ip) ?? []
  const valid       = timestamps.filter((t) => t > windowStart)
  if (valid.length >= MAX_REQUESTS) {
    rateLimitStore.set(ip, valid)
    return true
  }
  valid.push(now)
  rateLimitStore.set(ip, valid)
  return false
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1'
  )
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true

  const host          = request.headers.get('host')
  const forwardedHost = request.headers.get('x-forwarded-host')

  try {
    const originUrl      = new URL(origin)
    const originHost     = originUrl.host
    const originHostname = originUrl.hostname
    if (originHost === host) return true
    if (forwardedHost && originHost === forwardedHost) return true
    if (
      originHostname.endsWith('.replit.dev') ||
      originHostname.endsWith('.repl.co') ||
      originHostname.endsWith('.replit.app')
    ) return true
    return false
  } catch {
    return false
  }
}

/**
 * Assign a persistent session UUID cookie to every visitor.
 * Uses Web Crypto `crypto.randomUUID()` — compatible with Edge runtime.
 */
function assignSessionCookie(request: NextRequest, response: NextResponse): void {
  const existing = request.cookies.get('toolify_sid')?.value
  if (!existing) {
    const sid = crypto.randomUUID()
    response.cookies.set('toolify_sid', sid, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   30 * 24 * 60 * 60,  // 30 days
      path:     '/',
    })
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Non-API routes: just assign session cookie and pass through ──────────────
  if (!pathname.startsWith('/api/')) {
    const response = NextResponse.next()
    assignSessionCookie(request, response)
    return response
  }

  // ── API routes: CORS + rate limiting ─────────────────────────────────────────

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    if (!isSameOrigin(request)) {
      return new NextResponse(null, { status: 403 })
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age':       '86400',
      },
    })
  }

  // Block cross-origin API requests
  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Cross-origin requests are not allowed.' },
      { status: 403 }
    )
  }

  // Rate limiting
  const ip = getClientIp(request)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests, please wait.' },
      { status: 429 }
    )
  }

  const response = NextResponse.next()
  assignSessionCookie(request, response)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|css|js|map)).*)',
  ],
}
