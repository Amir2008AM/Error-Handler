/**
 * Google SERP Rank Checker — Self-contained scraper
 *
 * Paginates through Google results (up to 100 pages / 1000 results).
 * No external paid APIs — fetches directly from Google like a browser.
 *
 * Strategy:
 *   1. Rotate User-Agents on every request
 *   2. Add jitter delay between pages to avoid rate-limiting
 *   3. Detect CAPTCHA / block pages and stop gracefully
 *   4. Extract result URLs using multiple regex patterns (Google HTML changes)
 *   5. Match against the target domain at every position
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RankResult {
  found:           boolean
  rank:            number | null   // 1-based absolute position
  url:             string | null   // exact matching URL
  pagesSearched:   number          // pages fetched so far
  resultsSearched: number          // total result positions checked
  blocked:         boolean         // Google returned CAPTCHA/block
  blockedAtPage:   number | null
  noMoreResults:   boolean         // Google has no more results for query
  error:           string | null
}

export type OnProgress = (page: number) => void

// ── Config ────────────────────────────────────────────────────────────────────

const PER_PAGE     = 10
const DELAY_MS     = 2800   // base wait between pages
const JITTER_MS    = 1800   // max random extra wait
const TIMEOUT_MS   = 22_000 // per-fetch timeout

const USER_AGENTS: string[] = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
  'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
]

// Google/unwanted domains to exclude from results
const EXCLUDED_HOSTS = new Set([
  'google.com', 'www.google.com', 'accounts.google.com', 'support.google.com',
  'translate.google.com', 'maps.google.com', 'news.google.com', 'play.google.com',
  'googleadservices.com', 'googleusercontent.com', 'gstatic.com', 'googleapis.com',
  'webcache.googleusercontent.com', 'youtube.com', 'www.youtube.com',
  'amp.dev', 'google.co.sa', 'google.co.uk', 'google.com.eg',
])

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

function randomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
}

function randomJitter(): number {
  return Math.floor(Math.random() * JITTER_MS)
}

/** Strip protocol + www, lowercase, no trailing slash */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[/?#].*$/, '')
    .toLowerCase()
}

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return ''
  }
}

function isExcluded(url: string): boolean {
  const h = extractHostname(url)
  if (!h) return true
  if (EXCLUDED_HOSTS.has(h)) return true
  if (h.endsWith('.google.com') || h.endsWith('.gstatic.com')) return true
  return false
}

function domainMatches(url: string, target: string): boolean {
  const h = extractHostname(url)
  return h === target || h.endsWith('.' + target)
}

// ── URL extraction from raw Google HTML ───────────────────────────────────────
// Uses multiple patterns because Google's markup changes frequently.
// Returns URLs in document order (preserves ranking position).

function extractResultUrls(html: string): string[] {
  const urls: string[] = []
  const seen = new Set<string>()

  function push(raw: string) {
    let url = raw
    // Decode percent-encoded redirect: /url?q=https%3A...
    if (url.startsWith('http') === false && url.includes('%')) {
      try { url = decodeURIComponent(url) } catch { return }
    }
    if (!url.startsWith('http')) return
    if (isExcluded(url)) return
    // Normalize: strip fragment, collapse tracking params slightly
    const clean = url.split('#')[0].split('&sa=')[0].split('&ved=')[0]
    if (!seen.has(clean)) {
      seen.add(clean)
      urls.push(clean)
    }
  }

  // ── Pattern 1: /url?q=https://... (Google redirect — most reliable) ──────
  const re1 = /\/url\?q=(https?(?:%3A|:)\/\/[^&"' >]+)/g
  let m: RegExpExecArray | null
  while ((m = re1.exec(html)) !== null) push(m[1])

  // ── Pattern 2: data-url="https://..." attribute ──────────────────────────
  const re2 = /data-url="(https?:\/\/[^"]+)"/g
  while ((m = re2.exec(html)) !== null) push(m[1])

  // ── Pattern 3: Direct href — catch remaining non-Google URLs ────────────
  // Only run if patterns above found few results (HTML format may differ)
  if (urls.length < 5) {
    const re3 = /href="(https?:\/\/(?!(?:www\.)?(?:google|gstatic|googleapis|googleadservices|youtube)[./])[^"]+)"/g
    while ((m = re3.exec(html)) !== null) push(m[1])
  }

  return urls
}

// ── Google SERP fetcher ───────────────────────────────────────────────────────

interface PageFetch {
  urls:          string[]
  isBlocked:     boolean
  noMoreResults: boolean
  rawLength:     number
}

async function fetchSerpPage(
  keyword: string,
  start:   number,
  lang:    string,
  country: string,
): Promise<PageFetch> {
  const params = new URLSearchParams({
    q:      keyword,
    num:    String(PER_PAGE),
    start:  String(start),
    hl:     lang,
    gl:     country,
    pws:    '0',     // disable personalised results
    nfpr:   '1',     // disable spell correction
    filter: '0',     // disable duplicate clustering
  })

  const endpoint = `https://www.google.com/search?${params.toString()}`

  let html = ''
  try {
    const res = await fetch(endpoint, {
      headers: {
        'User-Agent':                randomUA(),
        'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language':           `${lang}-${country.toUpperCase()},${lang};q=0.9,en-US;q=0.7,en;q=0.5`,
        'Accept-Encoding':           'gzip, deflate, br',
        'DNT':                       '1',
        'Connection':                'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest':            'document',
        'Sec-Fetch-Mode':            'navigate',
        'Sec-Fetch-Site':            'none',
        'Cache-Control':             'no-cache',
        'Pragma':                    'no-cache',
      },
      signal:   AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
    })

    if (res.status === 429 || res.status === 503) {
      return { urls: [], isBlocked: true, noMoreResults: false, rawLength: 0 }
    }

    html = await res.text()
  } catch {
    return { urls: [], isBlocked: false, noMoreResults: true, rawLength: 0 }
  }

  // Detect CAPTCHA / unusual-traffic block
  const lc = html.toLowerCase()
  const isBlocked =
    lc.includes('g-recaptcha') ||
    lc.includes('/sorry/index') ||
    lc.includes('unusual traffic') ||
    lc.includes('automated queries') ||
    lc.includes('siteblock') ||
    (html.length < 5000 && lc.includes('captcha'))

  if (isBlocked) {
    return { urls: [], isBlocked: true, noMoreResults: false, rawLength: html.length }
  }

  const urls = extractResultUrls(html)

  // Google returns empty results page when start > available results
  const noMoreResults = urls.length === 0

  return { urls, isBlocked: false, noMoreResults, rawLength: html.length }
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface CheckRankOptions {
  keyword:    string
  domain:     string
  maxPages?:  number   // default 100 (1000 results — Google's hard limit)
  lang?:      string   // default 'ar'
  country?:   string   // default 'sa'
  onProgress?: OnProgress
}

export async function checkRank(opts: CheckRankOptions): Promise<RankResult> {
  const {
    keyword,
    domain,
    maxPages  = 100,
    lang      = 'ar',
    country   = 'sa',
    onProgress,
  } = opts

  const target = normalizeDomain(domain)
  const pages  = Math.min(maxPages, 100) // Google hard cap

  for (let page = 0; page < pages; page++) {
    const start = page * PER_PAGE

    onProgress?.(page + 1)

    const { urls, isBlocked, noMoreResults, rawLength } = await fetchSerpPage(
      keyword, start, lang, country,
    )

    if (isBlocked) {
      return {
        found: false, rank: null, url: null,
        pagesSearched: page + 1, resultsSearched: start,
        blocked: true, blockedAtPage: page + 1,
        noMoreResults: false, error: null,
      }
    }

    if (noMoreResults) {
      // Google has no more results for this query
      return {
        found: false, rank: null, url: null,
        pagesSearched: page + 1, resultsSearched: start,
        blocked: false, blockedAtPage: null,
        noMoreResults: true,
        error: rawLength < 1000 ? 'fetch_error' : null,
      }
    }

    // Check each URL in order — position = start + index + 1
    for (let i = 0; i < urls.length; i++) {
      if (domainMatches(urls[i], target)) {
        return {
          found: true,
          rank:  start + i + 1,
          url:   urls[i],
          pagesSearched:   page + 1,
          resultsSearched: start + i + 1,
          blocked: false, blockedAtPage: null,
          noMoreResults: false, error: null,
        }
      }
    }

    // Delay before next page (skip on last)
    if (page < pages - 1) {
      await sleep(DELAY_MS + randomJitter())
    }
  }

  return {
    found: false, rank: null, url: null,
    pagesSearched:   pages,
    resultsSearched: pages * PER_PAGE,
    blocked: false, blockedAtPage: null,
    noMoreResults: false, error: null,
  }
}
