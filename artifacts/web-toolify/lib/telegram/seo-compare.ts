/**
 * SEO Competitor Analyzer
 *
 * Fetches the top Google results for a keyword, scrapes each page,
 * and returns structured competitor data used to generate contextual
 * title / meta / keyword suggestions.
 */

const UA = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
]
const rUA = () => UA[Math.floor(Math.random() * UA.length)]

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompetitorPage {
  url:       string
  domain:    string
  title:     string
  metaDesc:  string
  h1:        string
  h2s:       string[]
  wordCount: number
  ok:        boolean
}

export interface CompetitorAnalysis {
  pages:          CompetitorPage[]
  avgTitleLen:    number
  avgMetaLen:     number
  avgWordCount:   number
  kwInTitle:      number   // how many competitors include keyword in title
  kwAtTitleStart: number   // how many start title with keyword
  kwInMeta:       number
  topWords:       string[] // most common words across competitor titles+h2s
  topPhrases:     string[] // most common 2-3 word phrases
  titleExamples:  string[]
  metaExamples:   string[]
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function strip(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function getTag(html: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(html)
  if (!m) return ''
  return strip(m[1])
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim()
}

function getAllTags(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) out.push(strip(m[1]).trim())
  return out.filter(Boolean)
}

function getMeta(html: string): string {
  const m = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i.exec(html)
    ?? /<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i.exec(html)
  return m ? m[1].replace(/&amp;/g,'&').trim() : ''
}

// ── Google SERP for competitor URLs ──────────────────────────────────────────

async function getCompetitorUrls(keyword: string, ownDomain: string, limit = 5): Promise<string[]> {
  const params = new URLSearchParams({
    q: keyword, num: '10', hl: 'en', gl: 'us', pws: '0', nfpr: '1',
  })
  try {
    const res = await fetch(`https://www.google.com/search?${params}`, {
      headers: {
        'User-Agent': rUA(),
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    })
    const html = await res.text()

    if (html.includes('recaptcha') || html.includes('/sorry/')) return []

    const urls: string[] = []
    const seen = new Set<string>()

    // Extract result URLs
    const re = /\/url\?q=(https?(?:%3A|:)\/\/[^&"]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      try {
        const url = decodeURIComponent(m[1])
        const host = new URL(url).hostname.replace(/^www\./, '')
        if (host === ownDomain || host.endsWith('.' + ownDomain)) continue
        if (['google.com','youtube.com','wikipedia.org','reddit.com'].some(d => host.endsWith(d))) continue
        if (!seen.has(host)) { seen.add(host); urls.push(url) }
        if (urls.length >= limit) break
      } catch {}
    }
    return urls
  } catch { return [] }
}

// ── Fetch + parse a single competitor page ────────────────────────────────────

async function fetchCompetitorPage(url: string): Promise<CompetitorPage> {
  const domain = (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } })()
  const empty: CompetitorPage = { url, domain, title: '', metaDesc: '', h1: '', h2s: [], wordCount: 0, ok: false }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': rUA(),
        'Accept': 'text/html,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    })
    if (!res.ok) return empty

    const html = await res.text()
    const title    = getTag(html, 'title')
    const metaDesc = getMeta(html)
    const h1       = getAllTags(html, 'h1')[0] ?? ''
    const h2s      = getAllTags(html, 'h2').slice(0, 12)
    const text     = strip(html)
    const wordCount = text.split(/\s+/).filter(w => w.length > 1).length

    return { url, domain, title, metaDesc, h1, h2s, wordCount, ok: true }
  } catch { return empty }
}

// ── N-gram extractor ──────────────────────────────────────────────────────────

const STOP = new Set([
  'the','a','an','and','or','for','to','of','in','on','at','is','are','by',
  'with','that','this','it','as','from','was','be','has','have','we','you',
  'your','our','how','what','when','why','all','get','can','will','more',
  'best','free','top','most','new','its','use','using','used',
])

function extractNgrams(text: string, n: 1 | 2 | 3): string[] {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
  const grams: string[] = []
  for (let i = 0; i <= words.length - n; i++) {
    const g = words.slice(i, i + n)
    if (n === 1 || g.every(w => !STOP.has(w))) grams.push(g.join(' '))
  }
  return grams
}

function topN(items: string[], n: number): string[] {
  const freq = new Map<string, number>()
  for (const s of items) freq.set(s, (freq.get(s) ?? 0) + 1)
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k)
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyzeCompetitors(
  keyword:   string,
  ownDomain: string,
  limit = 5,
): Promise<CompetitorAnalysis> {
  const empty: CompetitorAnalysis = {
    pages: [], avgTitleLen: 55, avgMetaLen: 150, avgWordCount: 1200,
    kwInTitle: 0, kwAtTitleStart: 0, kwInMeta: 0,
    topWords: [], topPhrases: [], titleExamples: [], metaExamples: [],
  }

  // Step 1: get competitor URLs from Google
  const urls = await getCompetitorUrls(keyword, ownDomain, limit)
  if (urls.length === 0) return empty

  // Step 2: fetch all competitor pages in parallel (with small delay)
  await sleep(800)
  const pages = await Promise.all(urls.map(u => fetchCompetitorPage(u)))
  const good  = pages.filter(p => p.ok && p.title)

  if (good.length === 0) return empty

  // Step 3: calculate averages
  const kwLower        = keyword.toLowerCase()
  const avgTitleLen    = Math.round(good.reduce((s, p) => s + p.title.length, 0) / good.length)
  const avgMetaLen     = Math.round(good.filter(p=>p.metaDesc).reduce((s, p) => s + p.metaDesc.length, 0) / (good.filter(p=>p.metaDesc).length||1))
  const avgWordCount   = Math.round(good.reduce((s, p) => s + p.wordCount, 0) / good.length)
  const kwInTitle      = good.filter(p => p.title.toLowerCase().includes(kwLower)).length
  const kwAtTitleStart = good.filter(p => p.title.toLowerCase().startsWith(kwLower)).length
  const kwInMeta       = good.filter(p => p.metaDesc.toLowerCase().includes(kwLower)).length

  // Step 4: extract common words & phrases from titles + h2s
  const allText = good.flatMap(p => [p.title, ...p.h2s]).join(' ')
  const topWords   = topN(extractNgrams(allText, 1), 15).filter(w => !kwLower.split(' ').includes(w))
  const topPhrases = topN([
    ...extractNgrams(allText, 2),
    ...extractNgrams(allText, 3),
  ], 12).filter(ph => !ph.includes(kwLower))

  return {
    pages: good,
    avgTitleLen, avgMetaLen, avgWordCount,
    kwInTitle, kwAtTitleStart, kwInMeta,
    topWords, topPhrases,
    titleExamples: good.map(p => p.title).slice(0, 3),
    metaExamples:  good.map(p => p.metaDesc).filter(Boolean).slice(0, 2),
  }
}
