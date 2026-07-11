/**
 * SEO Suggestion Generator
 *
 * Uses competitor analysis data to generate contextual, data-driven
 * suggestions for title, meta description, and keywords.
 * No external LLM — pure pattern analysis from real SERP data.
 */

import type { CompetitorAnalysis } from './seo-compare'
import type { SeoResult } from './seo-analyzer'

// ── Power word banks ──────────────────────────────────────────────────────────

const TITLE_OPENERS  = ['Best','Top','Free','Ultimate','Complete','Easy','Fast','Online','Simple','Professional']
const TITLE_CLOSERS  = ['Online','Free','in 2024','in 2025','— No Registration','Without Software','in Seconds','Easily','Instantly','for Free']
const TITLE_BRIDGERS = ['—',':','|','·']

const META_CTAWORDS  = ['Try it free','No registration required','100% free','Instant results','No software needed','Works on any device','Start now','Get started']
const META_INTROS    = [
  'Use our',
  'The easiest way to',
  'Convert, compress, and edit',
  'Discover the best',
  'Instantly',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase())
}

function countChars(s: string): number { return s.length }

function pickBridge(competitors: string[]): string {
  const counts: Record<string, number> = {}
  for (const b of TITLE_BRIDGERS) {
    counts[b] = competitors.filter(t => t.includes(b)).length
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}

function pickCTA(meta: string): string {
  // Try to reuse CTA pattern from competitor metas
  for (const cta of META_CTAWORDS) {
    if (meta.toLowerCase().includes(cta.toLowerCase())) return cta
  }
  return META_CTAWORDS[Math.floor(Math.random() * META_CTAWORDS.length)]
}

// ── Title Suggestion ──────────────────────────────────────────────────────────

export interface TitleSuggestion {
  suggested:    string
  charCount:    number
  score:        string   // "Excellent" | "Good" | ...
  reasoning:    string[]
  competitorEx: string[]
}

export function suggestTitle(
  current:     string,
  keyword:     string,
  comp:        CompetitorAnalysis,
): TitleSuggestion {
  const kw       = titleCase(keyword)
  const kwLower  = keyword.toLowerCase()
  const bridge   = pickBridge(comp.titleExamples)
  const useYear  = comp.titleExamples.some(t => /202[0-9]/.test(t))
  const useFree  = comp.titleExamples.some(t => /\bfree\b/i.test(t))
  const useOnline = comp.titleExamples.some(t => /\bonline\b/i.test(t))

  // Build benefit words from competitor topWords
  const benefits = comp.topWords
    .filter(w => !kwLower.split(' ').includes(w) && w.length > 3)
    .slice(0, 3)
    .map(titleCase)

  // Strategy 1: Keyword first + bridge + benefit
  const strategy1 = [
    kw,
    bridge,
    benefits[0] ?? (useFree ? 'Free' : 'Online'),
    useOnline && !kw.toLowerCase().includes('online') ? 'Online' : '',
    useYear ? '(2025)' : '',
  ].filter(Boolean).join(' ').slice(0, 65).trim()

  // Strategy 2: Best/Top + keyword + benefit
  const strategy2 = [
    useFree ? 'Free' : 'Best',
    kw,
    benefits.length > 1 ? bridge + ' ' + benefits[1] : '',
    useYear ? '— 2025' : '',
  ].filter(Boolean).join(' ').slice(0, 65).trim()

  // Pick best — prefer one closer to competitor avg length
  const target   = comp.avgTitleLen || 55
  const s1dist   = Math.abs(strategy1.length - target)
  const s2dist   = Math.abs(strategy2.length - target)
  const suggested = s1dist <= s2dist ? strategy1 : strategy2

  const len     = countChars(suggested)
  const score   = len >= 50 && len <= 60 ? 'Excellent' : len >= 40 && len <= 70 ? 'Good' : 'Fair'

  const reasoning: string[] = [
    `${comp.kwInTitle}/${comp.pages.length} competitors include keyword in title`,
    comp.kwAtTitleStart > 0
      ? `${comp.kwAtTitleStart} of them start with keyword (recommended)`
      : 'Most competitors place keyword mid-title',
    `Competitor avg title length: ${comp.avgTitleLen} chars — suggested: ${len} chars`,
    useFree  ? 'Word "Free" appears in most competitor titles' : '',
    useYear  ? 'Year marker seen in competitor titles (adds freshness)' : '',
  ].filter(Boolean)

  return {
    suggested,
    charCount: len,
    score,
    reasoning,
    competitorEx: comp.titleExamples,
  }
}

// ── Meta Description Suggestion ───────────────────────────────────────────────

export interface MetaSuggestion {
  suggested:    string
  charCount:    number
  score:        string
  reasoning:    string[]
  competitorEx: string[]
}

export function suggestMeta(
  currentMeta: string,
  keyword:     string,
  wordCount:   number,
  comp:        CompetitorAnalysis,
): MetaSuggestion {
  const kw  = titleCase(keyword)
  const cta = pickCTA(comp.metaExamples.join(' '))

  // Extract what the tool does from competitor metas (verbs)
  const verbs: string[] = []
  for (const m of comp.metaExamples) {
    const v = m.match(/\b(convert|compress|merge|split|edit|create|generate|remove|extract|resize|rotate|combine)\b/gi) ?? []
    verbs.push(...v.map(s => s.toLowerCase()))
  }
  const uniqueVerbs = [...new Set(verbs)].slice(0, 4).map(titleCase)
  const verbPhrase  = uniqueVerbs.length > 1 ? uniqueVerbs.slice(0, 3).join(', ') : kw

  // Build the meta: intro + what it does + features + CTA
  const targetLen = comp.avgMetaLen || 150
  let suggested = `Use our ${kw} to ${verbPhrase.toLowerCase() || 'process your files'} instantly online. ${cta}.`

  // Pad or trim to ideal length window (140-160)
  if (suggested.length < 130) {
    const extra = comp.topWords.slice(0, 2).map(titleCase).join(' and ')
    suggested = `Use our ${kw} to ${verbPhrase.toLowerCase() || 'process files'} online. ${extra ? `Supports ${extra}. ` : ''}${cta}.`
  }
  if (suggested.length > 160) {
    suggested = suggested.slice(0, 157) + '...'
  }

  const len   = countChars(suggested)
  const score = len >= 140 && len <= 160 ? 'Excellent' : len >= 110 && len <= 175 ? 'Good' : 'Fair'

  const reasoning: string[] = [
    `${comp.kwInMeta}/${comp.pages.length} competitors include keyword in meta description`,
    `Competitor avg meta length: ${comp.avgMetaLen} chars — suggested: ${len} chars`,
    'Includes a clear CTA (call to action)',
    uniqueVerbs.length > 0 ? `Key verbs from competitors: ${uniqueVerbs.slice(0,3).join(', ')}` : '',
  ].filter(Boolean)

  return {
    suggested,
    charCount: len,
    score,
    reasoning,
    competitorEx: comp.metaExamples.slice(0, 2),
  }
}

// ── Keyword Suggestions ───────────────────────────────────────────────────────

export interface KeywordSuggestion {
  primary:    string[]   // 1-2 word keywords
  secondary:  string[]   // 2-3 word phrases
  longtail:   string[]   // 3+ word phrases
  missing:    string[]   // found in competitors but not in user article
  reasoning:  string[]
}

export function suggestKeywords(
  keyword:     string,
  articleText: string,
  comp:        CompetitorAnalysis,
): KeywordSuggestion {
  const kwLower   = keyword.toLowerCase()
  const textLower = articleText.toLowerCase()

  // Separate single words vs phrases
  const allSuggested = [...comp.topWords, ...comp.topPhrases]
    .filter(k => !kwLower.includes(k) && k !== kwLower)

  const primary   = allSuggested.filter(k => k.split(' ').length === 1).slice(0, 5)
  const secondary = allSuggested.filter(k => k.split(' ').length === 2).slice(0, 5)
  const longtail  = allSuggested.filter(k => k.split(' ').length >= 3).slice(0, 4)

  // Find which suggested keywords are missing from user's article
  const missing = allSuggested
    .filter(k => !textLower.includes(k))
    .slice(0, 6)

  const reasoning: string[] = [
    `Extracted from ${comp.pages.length} top-ranking competitor pages`,
    `${missing.length} keywords appear in competitors but not in your article`,
    `Adding secondary keywords can expand your topical coverage`,
    `Long-tail phrases target specific search intents with less competition`,
  ]

  return { primary, secondary, longtail, missing, reasoning }
}

// ── Formatter: build Telegram messages ───────────────────────────────────────

export function formatTitleSuggestion(s: TitleSuggestion, current: string): string {
  const scoreEmoji = s.score === 'Excellent' ? '🏆' : s.score === 'Good' ? '✅' : '⚠️'
  return [
    `📝 <b>TITLE SUGGESTION</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `<b>Current title (${current.length} chars):</b>`,
    `<i>${current || '(none)'}</i>`,
    ``,
    `${scoreEmoji} <b>Suggested title (${s.charCount} chars — ${s.score}):</b>`,
    ``,
    `<code>${s.suggested}</code>`,
    ``,
    `<b>📊 Why this works:</b>`,
    ...s.reasoning.map(r => `  • ${r}`),
    ``,
    `<b>🔍 Competitor title examples:</b>`,
    ...s.competitorEx.map(t => `  <i>"${t.slice(0,70)}"</i>`),
  ].join('\n')
}

export function formatMetaSuggestion(s: MetaSuggestion, current: string): string {
  const scoreEmoji = s.score === 'Excellent' ? '🏆' : s.score === 'Good' ? '✅' : '⚠️'
  return [
    `📄 <b>META DESCRIPTION SUGGESTION</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `<b>Current (${current.length} chars):</b>`,
    `<i>${current.slice(0,120) || '(none)'}</i>`,
    ``,
    `${scoreEmoji} <b>Suggested (${s.charCount} chars — ${s.score}):</b>`,
    ``,
    `<code>${s.suggested}</code>`,
    ``,
    `<b>📊 Why this works:</b>`,
    ...s.reasoning.map(r => `  • ${r}`),
    s.competitorEx.length ? `\n<b>🔍 Competitor meta examples:</b>` : '',
    ...s.competitorEx.map(m => `  <i>"${m.slice(0,100)}"</i>`),
  ].filter(l => l !== '').join('\n')
}

export function formatKeywordSuggestion(s: KeywordSuggestion): string {
  return [
    `🔑 <b>KEYWORD SUGGESTIONS</b>`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    s.primary.length ? [
      `<b>📌 Primary Keywords:</b>`,
      ...s.primary.map((k, i) => `  ${i+1}. <code>${k}</code>`),
    ].join('\n') : '',
    ``,
    s.secondary.length ? [
      `<b>📎 Secondary Keywords (2-word):</b>`,
      ...s.secondary.map((k, i) => `  ${i+1}. <code>${k}</code>`),
    ].join('\n') : '',
    ``,
    s.longtail.length ? [
      `<b>🎯 Long-tail Phrases:</b>`,
      ...s.longtail.map((k, i) => `  ${i+1}. <code>${k}</code>`),
    ].join('\n') : '',
    ``,
    s.missing.length ? [
      `<b>⚠️ Missing from your article (competitors use these):</b>`,
      ...s.missing.map(k => `  ❌ <code>${k}</code>`),
    ].join('\n') : '',
    ``,
    `<b>📊 Analysis:</b>`,
    ...s.reasoning.map(r => `  • ${r}`),
  ].filter(l => l !== '').join('\n')
}
