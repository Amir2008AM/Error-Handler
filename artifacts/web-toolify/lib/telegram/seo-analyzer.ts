/**
 * SEO Article Analyzer — Self-contained fetcher + HTML parser
 *
 * Fetches any URL directly, parses the HTML, evaluates 6 SEO factors,
 * scores them out of 100, and returns ranked improvement suggestions.
 *
 * No external APIs — pure fetch + regex HTML parsing.
 *
 * Scoring breakdown (100 pts):
 *   Title             20 pts
 *   Meta Description  15 pts
 *   Headings H1/H2/H3 15 pts
 *   Keyword Density   15 pts  (only if keyword is provided)
 *   Content Length    15 pts
 *   Internal Links    20 pts
 *
 * When no keyword supplied, /85 is scaled to /100.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeoFactor {
  label:  string
  score:  number
  max:    number
  note:   string
  icon:   '✅' | '⚠️' | '❌'
}

export interface SeoResult {
  ok:          boolean
  error?:      string
  url:         string
  domain:      string
  total:       number          // 0-100
  grade:       string          // A+ / A / B / C / D / F
  factors:     SeoFactor[]
  suggestions: string[]
  // raw data (useful for deeper reports)
  title:       string
  metaDesc:    string
  wordCount:   number
  h1:          number
  h2:          number
  h3:          number
  internalLinks: number
  keyword?:    string
  keyDensity?: number          // percentage
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 18_000

const UAS = [
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

function randomUA(): string {
  return UAS[Math.floor(Math.random() * UAS.length)]
}

// ── HTML utilities ────────────────────────────────────────────────────────────

function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function stripHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractTag(html: string, tag: string): string {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(html)
  return m ? decodeEntities(stripHtml(m[1])).trim() : ''
}

function extractTitle(html: string): string {
  return extractTag(html, 'title')
}

function extractMetaDesc(html: string): string {
  // Try name="description" content="..."
  let m = /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i.exec(html)
  if (m) return decodeEntities(m[1].trim())
  // Try reversed attribute order
  m = /<meta[^>]+content=["']([^"']*)[^>]+name=["']description["']/i.exec(html)
  if (m) return decodeEntities(m[1].trim())
  return ''
}

function countHeadings(html: string): { h1: number; h2: number; h3: number } {
  return {
    h1: (html.match(/<h1[\s>]/gi) ?? []).length,
    h2: (html.match(/<h2[\s>]/gi) ?? []).length,
    h3: (html.match(/<h3[\s>]/gi) ?? []).length,
  }
}

/** Count words in plain text (tokens > 1 char). */
function countWords(text: string): number {
  return text.split(/\s+/).filter(w => w.length > 1).length
}

/** Count keyword occurrences (case-insensitive, whole-word). */
function countKeyword(text: string, kw: string): number {
  const escaped = kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  try {
    return (text.match(new RegExp(escaped, 'gi')) ?? []).length
  } catch {
    return 0
  }
}

/** Count <a href> tags that link internally (relative or same domain). */
function countInternalLinks(html: string, domain: string): number {
  const hrefs = html.match(/href=["']([^"'#]+)["']/gi) ?? []
  let count = 0
  for (const h of hrefs) {
    const url = h.replace(/^href=["']/i, '').replace(/["']$/, '')
    if (url.startsWith('/') || url.startsWith('#') || url.includes(domain)) {
      count++
    }
  }
  return count
}

// ── Scoring helpers ───────────────────────────────────────────────────────────

function icon(score: number, max: number): '✅' | '⚠️' | '❌' {
  const ratio = score / max
  if (ratio >= 0.8) return '✅'
  if (ratio >= 0.5) return '⚠️'
  return '❌'
}

function grade(total: number): string {
  if (total >= 90) return 'A+'
  if (total >= 80) return 'A'
  if (total >= 70) return 'B'
  if (total >= 60) return 'C'
  if (total >= 50) return 'D'
  return 'F'
}

// ── Factor scorers ────────────────────────────────────────────────────────────

function scoreTitle(title: string): SeoFactor {
  const max = 20
  const len = title.length
  let score: number
  let note: string

  if (!title)           { score = 0;  note = 'العنوان مفقود' }
  else if (len < 20)    { score = 5;  note = `قصير جداً (${len} حرف)` }
  else if (len < 40)    { score = 12; note = `قصير نسبياً (${len} حرف)` }
  else if (len <= 60)   { score = 20; note = `مناسب الطول (${len} حرف)` }
  else if (len <= 70)   { score = 16; note = `مقبول (${len} حرف)` }
  else if (len <= 80)   { score = 10; note = `طويل قليلاً (${len} حرف)` }
  else                  { score = 6;  note = `طويل جداً (${len} حرف)` }

  return { label: 'العنوان', score, max, note, icon: icon(score, max) }
}

function scoreMetaDesc(desc: string): SeoFactor {
  const max = 15
  const len = desc.length
  let score: number
  let note: string

  if (!desc)            { score = 0;  note = 'مفقودة' }
  else if (len < 70)    { score = 4;  note = `قصيرة جداً (${len} حرف)` }
  else if (len < 120)   { score = 9;  note = `قصيرة (${len} حرف)` }
  else if (len <= 160)  { score = 15; note = `مثالية (${len} حرف)` }
  else if (len <= 180)  { score = 11; note = `طويلة قليلاً (${len} حرف)` }
  else                  { score = 7;  note = `طويلة جداً (${len} حرف)` }

  return { label: 'Meta Description', score, max, note, icon: icon(score, max) }
}

function scoreHeadings(h1: number, h2: number, h3: number): SeoFactor {
  const max = 15
  let score = 0
  const parts: string[] = []

  if (h1 > 0)  { score += 6; parts.push('H1') }
  if (h2 > 0)  { score += 5; parts.push('H2') }
  if (h3 > 0)  { score += 4; parts.push('H3') }

  // Penalty: multiple H1s
  if (h1 > 1) { score -= 3; }

  score = Math.max(0, Math.min(max, score))

  const note = score === max
    ? `H1, H2, H3 موجودين`
    : h1 === 0
      ? 'H1 مفقود!'
      : `موجود: ${parts.join(', ')}` + (h1 > 1 ? ` — تحذير: ${h1} H1` : '')

  return { label: 'هيكل العناوين', score, max, note, icon: icon(score, max) }
}

function scoreKeywordDensity(wordCount: number, occurrences: number): SeoFactor {
  const max = 15
  const density = wordCount > 0 ? (occurrences / wordCount) * 100 : 0
  const d = Math.round(density * 10) / 10
  let score: number
  let note: string

  if (occurrences === 0) { score = 0;  note = 'غير موجودة في المحتوى' }
  else if (density < 0.3){ score = 4;  note = `ضعيفة جداً (${d}%)` }
  else if (density < 0.8){ score = 8;  note = `أقل من المثالي (${d}%)` }
  else if (density <= 2.5){ score = 15; note = `مثالية (${d}%)` }
  else if (density <= 4) { score = 10; note = `أعلى قليلاً (${d}%)` }
  else                   { score = 4;  note = `حشو مفرط (${d}%)` }

  return { label: 'كثافة الكلمة المفتاحية', score, max, note, icon: icon(score, max) }
}

function scoreContentLength(wordCount: number): SeoFactor {
  const max = 15
  let score: number
  let note: string

  if (wordCount < 100)        { score = 1;  note = `ضعيف جداً (${wordCount} كلمة)` }
  else if (wordCount < 300)   { score = 4;  note = `قصير جداً (${wordCount} كلمة)` }
  else if (wordCount < 600)   { score = 7;  note = `${wordCount} كلمة` }
  else if (wordCount < 1000)  { score = 10; note = `${wordCount} كلمة` }
  else if (wordCount < 1500)  { score = 12; note = `+1000 كلمة` }
  else if (wordCount < 2000)  { score = 14; note = `+1500 كلمة` }
  else                        { score = 15; note = `+2000 كلمة` }

  return { label: 'طول المحتوى', score, max, note, icon: icon(score, max) }
}

function scoreInternalLinks(count: number): SeoFactor {
  const max = 20
  let score: number
  let note: string

  if (count === 0)       { score = 0;  note = 'لا روابط داخلية' }
  else if (count === 1)  { score = 6;  note = 'رابط واحد فقط' }
  else if (count === 2)  { score = 9;  note = 'رابطان فقط' }
  else if (count <= 4)   { score = 13; note = `${count} روابط داخلية` }
  else if (count <= 8)   { score = 18; note = `${count} روابط داخلية` }
  else                   { score = 20; note = `${count} رابط داخلي — ممتاز` }

  return { label: 'الروابط الداخلية', score, max, note, icon: icon(score, max) }
}

// ── Suggestions generator ─────────────────────────────────────────────────────

function buildSuggestions(
  factors:     SeoFactor[],
  title:       string,
  metaDesc:    string,
  h1:          number,
  h2:          number,
  h3:          number,
  wordCount:   number,
  internalLinks: number,
  keyword?:    string,
  keyDensity?: number,
): string[] {
  // Sort factors by worst score ratio first
  const sorted = [...factors].sort((a, b) => (a.score / a.max) - (b.score / b.max))
  const suggestions: string[] = []

  for (const f of sorted) {
    if (f.score / f.max >= 0.85) continue  // already great — skip

    if (f.label === 'العنوان') {
      if (!title)             suggestions.push('أضف عنوان <title> للصفحة فوراً')
      else if (title.length < 40) suggestions.push(`وسّع العنوان — الحالي ${title.length} حرف، المثالي 50-60 حرف`)
      else if (title.length > 70) suggestions.push(`قلّص العنوان — الحالي ${title.length} حرف، المثالي 50-60 حرف`)
    }

    if (f.label === 'Meta Description') {
      if (!metaDesc)             suggestions.push('أضف meta description للصفحة (140-160 حرف)')
      else if (metaDesc.length < 120) suggestions.push(`وسّع الـ meta description — الحالي ${metaDesc.length} حرف، المثالي 140-160 حرف`)
      else if (metaDesc.length > 170) suggestions.push(`اختصر الـ meta description — الحالي ${metaDesc.length} حرف، المثالي 140-160 حرف`)
    }

    if (f.label === 'هيكل العناوين') {
      if (h1 === 0) suggestions.push('أضف عنوان H1 واحد يحتوي على الكلمة المفتاحية الرئيسية')
      if (h2 === 0) suggestions.push('أضف عناوين H2 لتقسيم المحتوى إلى أقسام (3-6 عناوين)')
      if (h3 === 0 && h2 > 0) suggestions.push('أضف عناوين H3 تحت كل قسم H2 للتنظيم الأعمق')
      if (h1 > 1)  suggestions.push(`قلّل H1 إلى واحد فقط — حالياً ${h1} عناوين H1`)
    }

    if (f.label === 'طول المحتوى') {
      const needed = wordCount < 1500 ? 1500 - wordCount : 2000 - wordCount
      suggestions.push(`زد المحتوى ~${needed} كلمة للوصول إلى ${wordCount < 1500 ? '1500' : '2000'} كلمة`)
    }

    if (f.label === 'الروابط الداخلية') {
      const needed = Math.max(0, 5 - internalLinks)
      if (needed > 0) suggestions.push(`أضف ${needed} روابط داخلية لمقالات ذات صلة`)
    }

    if (f.label === 'كثافة الكلمة المفتاحية' && keyword) {
      if (!keyDensity || keyDensity < 0.8) {
        const wNeeded = Math.max(1, Math.round(wordCount * 0.015))
        suggestions.push(`زد ذكر "${keyword}" ${wNeeded} مرة إضافية في المحتوى`)
      } else if (keyDensity && keyDensity > 4) {
        suggestions.push(`قلّل تكرار "${keyword}" — نسبة ${keyDensity.toFixed(1)}% كثيرة`)
      }
    }
  }

  return suggestions.slice(0, 5)  // top 5 suggestions
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyzeSeo(url: string, keyword?: string): Promise<SeoResult> {
  // Normalize URL
  if (!url.startsWith('http')) url = 'https://' + url

  let domain = ''
  try {
    domain = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return { ok: false, error: 'رابط غير صالح', url, domain: '', total: 0, grade: 'F', factors: [], suggestions: [], title: '', metaDesc: '', wordCount: 0, h1: 0, h2: 0, h3: 0, internalLinks: 0 }
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  let html = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':      randomUA(),
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control':   'no-cache',
      },
      signal:   AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    })

    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status} — فشل تحميل الصفحة`, url, domain, total: 0, grade: 'F', factors: [], suggestions: [], title: '', metaDesc: '', wordCount: 0, h1: 0, h2: 0, h3: 0, internalLinks: 0 }
    }

    html = await res.text()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const friendly = msg.includes('timeout') ? 'انتهت مهلة الاتصال' : 'فشل الاتصال بالموقع'
    return { ok: false, error: friendly, url, domain, total: 0, grade: 'F', factors: [], suggestions: [], title: '', metaDesc: '', wordCount: 0, h1: 0, h2: 0, h3: 0, internalLinks: 0 }
  }

  // ── Parse ──────────────────────────────────────────────────────────────────
  const title         = extractTitle(html)
  const metaDesc      = extractMetaDesc(html)
  const { h1, h2, h3 } = countHeadings(html)
  const plainText     = stripHtml(html)
  const wordCount     = countWords(plainText)
  const internalLinks = countInternalLinks(html, domain)

  let keyOccurrences = 0
  let keyDensity: number | undefined
  if (keyword) {
    keyOccurrences = countKeyword(plainText, keyword)
    keyDensity = wordCount > 0 ? (keyOccurrences / wordCount) * 100 : 0
  }

  // ── Score ──────────────────────────────────────────────────────────────────
  const fTitle    = scoreTitle(title)
  const fMeta     = scoreMetaDesc(metaDesc)
  const fHeadings = scoreHeadings(h1, h2, h3)
  const fContent  = scoreContentLength(wordCount)
  const fLinks    = scoreInternalLinks(internalLinks)

  const factors: SeoFactor[] = [fTitle, fMeta, fHeadings]
  if (keyword) factors.push(scoreKeywordDensity(wordCount, keyOccurrences))
  factors.push(fContent, fLinks)

  // Compute total (scale to 100 when no keyword)
  const rawTotal  = factors.reduce((s, f) => s + f.score, 0)
  const rawMax    = factors.reduce((s, f) => s + f.max, 0)
  const total     = Math.round((rawTotal / rawMax) * 100)

  // ── Suggestions ───────────────────────────────────────────────────────────
  const suggestions = buildSuggestions(
    factors, title, metaDesc, h1, h2, h3,
    wordCount, internalLinks, keyword, keyDensity,
  )

  return {
    ok: true, url, domain, total,
    grade: grade(total),
    factors, suggestions,
    title, metaDesc, wordCount,
    h1, h2, h3, internalLinks,
    keyword, keyDensity,
  }
}
