/**
 * /api/web-preview?url=<encoded-url>
 *
 * Server-side HTML proxy — fetches the external page and serves it from OUR
 * domain.  Because the iframe src is same-origin, the browser never applies
 * the external site's X-Frame-Options / CSP frame-ancestors headers.
 *
 * This is the same technique used by ilovepdf and similar tools for live
 * website previews without relying on screenshots or user-facing iframes that
 * get blocked.
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime    = 'nodejs'
export const maxDuration = 30

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/138.0.0.0 Safari/537.36'

/** Domains we refuse to proxy (internal / private networks) */
const BLOCKED_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
])

function isBlockedHost(hostname: string): boolean {
  if (BLOCKED_HOSTS.has(hostname)) return true
  // Block RFC-1918 private ranges expressed as plain hostnames
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) return true
  return false
}

/**
 * Inject a <base> tag right after the opening <head> (or at the very start if
 * no head exists) so that all relative URLs in the proxied page resolve
 * correctly against the original origin.
 */
function injectBase(html: string, originUrl: string): string {
  const base = `<base href="${originUrl}" target="_blank">`

  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (m) => m + base)
  }
  if (/<html[^>]*>/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => m + `<head>${base}</head>`)
  }
  return base + html
}

/**
 * Strip security headers that would prevent the browser from using the
 * proxied page inside an iframe or that would cause mixed-content issues.
 */
const STRIPPED_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  // Don't forward cookies from external sites
  'set-cookie',
  // We set our own content-type
  'content-encoding',
  'transfer-encoding',
])

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url')
  if (!raw) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  // Validate
  let parsed: URL
  try {
    parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs allowed' }, { status: 400 })
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 403 })
  }

  // Fetch with timeout
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const upstream = await fetch(parsed.href, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':      BROWSER_UA,
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control':   'no-cache',
      },
    })

    const contentType = upstream.headers.get('content-type') ?? ''

    // Only proxy HTML responses
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) {
      return NextResponse.json(
        { error: 'URL did not return an HTML page' },
        { status: 422 }
      )
    }

    const html = await upstream.text()

    // Use the final URL (after redirects) as the base
    const finalUrl = upstream.url ?? parsed.href
    const modified = injectBase(html, finalUrl)

    // Build safe response headers
    const responseHeaders = new Headers({
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
      // Allow the page to be embedded in our iframe
      'X-Frame-Options': 'SAMEORIGIN',
    })

    return new NextResponse(modified, {
      status: upstream.status === 200 ? 200 : upstream.status,
      headers: responseHeaders,
    })
  } catch (err) {
    clearTimeout(timeout)
    const msg = err instanceof Error ? err.message : 'Failed to fetch URL'
    const isTimeout = msg.includes('abort') || msg.includes('timeout')
    console.error('[web-preview]', err)
    const userMsg = isTimeout
      ? 'The website took too long to respond.'
      : 'Could not reach this website.'
    const errorHtml = `<!doctype html><html><head><meta charset="utf-8">
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;
justify-content:center;height:100vh;margin:0;background:#f8f8f8;color:#555;}
.box{text-align:center;max-width:320px;}h2{font-size:1.1rem;color:#333;}
p{font-size:.85rem;opacity:.7;margin-top:.5rem;}</style></head>
<body><div class="box"><h2>⚠️ Preview unavailable</h2>
<p>${userMsg}</p><p style="opacity:.5;font-size:.75rem;">You can still convert this URL to PDF.</p>
</div></body></html>`
    return new NextResponse(errorHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } finally {
    clearTimeout(timeout)
  }
}
