import { NextRequest, NextResponse } from 'next/server'

// ── IndexerNow analytics (AI-crawler + AI-citation + human pageview) ─────────
//
// Three non-blocking, fire-and-forget pings per qualifying GET:
//
//  1. AI BOT CRAWL   — UA matches a known AI-crawler token.
//                      GET ?u=<path>&ua=<ua>
//                      Bots never run JS — server is the only place to detect them.
//
//  2. AI CITATION    — Human whose Referer host is an AI answer engine.
//                      GET ?u=<path>&ref=<referer>
//
//  3. HUMAN PAGEVIEW — Every non-bot, non-prefetch GET on a page document.
//                      POST {path, referrer, utm:{source,medium,campaign}}
//                      Real visitor UA MUST be forwarded — IndexerNow silently
//                      drops pings whose UA looks like a server/bot (the default
//                      fetch UA is treated as a bot and discarded).
//
// Steps 2 + 3 both fire for an AI-referred human visit (different signals).
// A bot fires step 1 only — never steps 2 or 3.
// All errors are swallowed — the visitor's request is never affected.

const AI_BOTS =
  /(GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|PerplexityBot|Google-Extended|GoogleOther|Applebot-Extended|Applebot|Bytespider|Amazonbot|Meta-ExternalAgent|Meta-ExternalFetcher|CCBot|Diffbot|YouBot|MistralAI-User|cohere-ai|DuckAssistBot)/i

const AI_REFERRERS =
  /(chatgpt\.com|chat\.openai\.com|copilot\.microsoft\.com|copilot\.com|perplexity\.ai|gemini\.google\.com|claude\.ai|you\.com|poe\.com|phind\.com)/i

const PIXEL = 'https://www.indexernow.com/api/pixel/TlVi67OnA6oZ0cLtJ6InXjbx'

/**
 * Returns true when the path looks like a page document.
 * Excludes API routes and any path that has a file-extension segment
 * (static assets like .js, .css, .png, .xml, .txt …).
 */
function isPagePath(pathname: string): boolean {
  return !pathname.startsWith('/api/') && !/\.[^/]+$/.test(pathname)
}
// ─────────────────────────────────────────────────────────────────────────────

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
      originHostname === 'replit.com' ||
      originHostname.endsWith('.replit.com') ||
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

const CATEGORY_TO_SLUG: Record<string, string> = {
  'PDF Tools':      'pdf-tools',
  'Security Tools': 'security-tools',
  'Converters':     'converters',
  'Image Tools':    'image-tools',
  'Text Tools':     'text-tools',
  'Calculators':    'calculators',
}

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // ── IndexerNow: fire pings on qualifying GET page-document requests ──────────
  if (request.method === 'GET' && isPagePath(pathname)) {
    const ua  = request.headers.get('user-agent')  ?? ''
    const ref = request.headers.get('referer')     ?? ''
    const enc = encodeURIComponent

    if (AI_BOTS.test(ua)) {
      // 1. AI bot crawl — bots never execute JS; this is the only detection point
      fetch(`${PIXEL}?u=${enc(pathname)}&ua=${enc(ua)}`).catch(() => {})
    } else {
      // Skip link-prefetch requests (not real navigations)
      const isPrefetch =
        request.headers.get('next-router-prefetch') !== null ||
        (request.headers.get('sec-purpose') ?? '').includes('prefetch')

      if (!isPrefetch) {
        // 2. AI citation click — human arriving from an AI answer engine
        if (ref && AI_REFERRERS.test(ref)) {
          fetch(`${PIXEL}?u=${enc(pathname)}&ref=${enc(ref)}`).catch(() => {})
        }

        // 3. Human pageview — forward the real UA or IndexerNow drops it
        const sp = request.nextUrl.searchParams
        fetch(PIXEL, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'user-agent': ua },
          body: JSON.stringify({
            path:     pathname,
            referrer: ref,
            utm: {
              source:   sp.get('utm_source')   ?? '',
              medium:   sp.get('utm_medium')   ?? '',
              campaign: sp.get('utm_campaign') ?? '',
            },
          }),
        }).catch(() => {})
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── ?category= → /category/slug permanent redirect (301, no param leak) ──────
  if (pathname === '/') {
    const category = searchParams.get('category')
    if (category && CATEGORY_TO_SLUG[category]) {
      const url = request.nextUrl.clone()
      url.pathname = `/category/${CATEGORY_TO_SLUG[category]}`
      url.search = ''
      return NextResponse.redirect(url, { status: 301 })
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────

  // ── www → non-www redirect (301) ────────────────────────────────────────────
  // Behind Railway + Cloudflare the real public host arrives in
  // x-forwarded-host; fall back to the Host header.  We never touch
  // request.nextUrl here because it carries the *internal* port (e.g. :8080)
  // and would produce https://www.toolifypdf.online:8080/…
  if (process.env.NODE_ENV === 'production') {
    const publicHost =
      request.headers.get('x-forwarded-host')?.split(',')[0].trim() ??
      request.headers.get('host') ??
      ''
    if (publicHost.startsWith('www.')) {
      const bareHost    = publicHost.slice(4)           // strip "www."
      const destination = `https://${bareHost}${pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`
      return NextResponse.redirect(destination, { status: 301 })
    }
  }

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
