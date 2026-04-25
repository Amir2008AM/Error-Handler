import { NextRequest, NextResponse } from 'next/server'

// In-memory sliding window rate limiter (no external dependencies)
const rateLimitStore = new Map<string, number[]>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 10

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  const timestamps = rateLimitStore.get(ip) ?? []
  const valid = timestamps.filter((t) => t > windowStart)

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
  if (!origin) return true // No origin = same-origin (curl, server-to-server, etc.)

  const host = request.headers.get('host')
  try {
    const originHost = new URL(origin).host
    return originHost === host
  } catch {
    return false
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

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
        'Access-Control-Max-Age': '86400',
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

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
