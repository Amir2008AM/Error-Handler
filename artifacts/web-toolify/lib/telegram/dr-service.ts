/**
 * Domain Rating (DR) Service — Ahrefs v3 API
 *
 * Two tiers:
 *  1. Free public endpoint  — DR score only, no key required
 *  2. Paid site-explorer    — full SEO metrics, requires AHREFS_API_KEY
 *
 * `getDomainMetrics(rawDomain)` calls both in parallel when the key is
 * present; falls back gracefully to DR-only when it is not.
 *
 * Usage:
 *   import { getDomainMetrics } from './dr-service'
 *   const result = await getDomainMetrics('google.com')
 */

// ── Endpoints ─────────────────────────────────────────────────────────────────

const DR_FREE_URL     = 'https://api.ahrefs.com/v3/public/domain-rating-free'
const SE_METRICS_URL  = 'https://api.ahrefs.com/v3/site-explorer/metrics'

// ── Types ─────────────────────────────────────────────────────────────────────

/** Always present — from the free public endpoint */
export interface DrBasicData {
  domain:       string
  domainRating: number   // 0–100, rounded
  fetchedAt:    string   // ISO UTC
}

/** Present only when AHREFS_API_KEY is configured and the call succeeds */
export interface DrFullMetrics {
  /** Ahrefs Rank (lower = stronger) */
  ahrefsRank:       number | null
  /** Total backlinks (all types) */
  backlinks:        number | null
  /** Dofollow backlinks */
  dofollowLinks:    number | null
  /** Nofollow backlinks (calculated) */
  nofollowLinks:    number | null
  /** Unique referring domains */
  refdomains:       number | null
  /** Dofollow referring domains */
  dofollowDomains:  number | null
  /** Estimated organic keywords */
  orgKeywords:      number | null
  /** Estimated monthly organic traffic */
  orgTraffic:       number | null
  /** Estimated organic traffic value (USD) */
  orgCost:          number | null
  /** Linked root domains (outbound) */
  linkedDomains:    number | null
}

export interface DomainMetricsData extends DrBasicData {
  /** null when no API key is set or the paid call failed */
  full: DrFullMetrics | null
  /** true when full metrics are available */
  hasFull: boolean
}

export type DomainMetricsResult =
  | { ok: true;  data: DomainMetricsData }
  | { ok: false; error: 'invalid_domain' | 'not_found' | 'api_error' | 'blocked'; message: string }

// ── Raw API shapes ────────────────────────────────────────────────────────────

interface AhrefsDrFreeResponse {
  domain_rating?: {
    domain_rating?: number
    license?:       string
  }
}

interface AhrefsSiteExplorerResponse {
  metrics?: {
    domain_rating?:               number
    ahrefs_rank?:                 number
    backlinks?:                   number
    dofollow_backlinks?:          number
    linked_root_domains?:         number
    dofollow_linked_root_domains?: number
    refdomains?:                  number
    dofollow_refdomains?:         number
    org_keywords?:                number
    org_traffic?:                 number
    org_cost?:                    number
    paid_keywords?:               number
    paid_traffic?:                number
    paid_cost?:                   number
  }
}

// ── Domain normalisation ──────────────────────────────────────────────────────

const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

/**
 * Strip protocol, www., paths, query strings, ports, and trailing dots.
 * Returns the cleaned lowercase hostname, or null if invalid.
 */
export function normalizeDomain(input: string): string | null {
  let s = input.trim()
  s = s.replace(/^https?:\/\//i, '')
  s = s.replace(/^www\./i, '')
  s = s.split('/')[0]
  s = s.split('?')[0]
  s = s.split('#')[0]
  s = s.replace(/:\d+$/, '')
  s = s.replace(/\.+$/, '')
  s = s.toLowerCase()
  return DOMAIN_RE.test(s) ? s : null
}

// ── Internal fetch helpers ────────────────────────────────────────────────────

async function fetchDrFree(domain: string, apiKey: string): Promise<{
  ok: boolean; dr?: number; error?: string
}> {
  const url = `${DR_FREE_URL}?target=${encodeURIComponent(domain)}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  let res: Response
  try {
    res = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) })
    // Fall back to unauthenticated if key is rejected
    if ((res.status === 401 || res.status === 403) && apiKey) {
      console.warn(`[Bot] DR free auth error ${res.status} — retrying without key`)
      res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12_000) })
    }
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // Cloudflare challenge returns 429 with HTML — detect it
    if (res.headers.get('cf-mitigated') === 'challenge') {
      return { ok: false, error: 'cloudflare_challenge' }
    }
    // Ahrefs returns 404 for domains not in their index
    if (res.status === 404) {
      return { ok: false, error: 'not_found' }
    }
    return { ok: false, error: `HTTP ${res.status}: ${body.slice(0, 100)}` }
  }

  let json: AhrefsDrFreeResponse
  try { json = (await res.json()) as AhrefsDrFreeResponse } catch {
    return { ok: false, error: 'invalid_json' }
  }

  const dr = json?.domain_rating?.domain_rating
  if (dr === undefined || dr === null) return { ok: false, error: 'no_dr_value' }
  return { ok: true, dr: Math.round(dr) }
}

async function fetchSiteExplorerMetrics(domain: string, apiKey: string): Promise<{
  ok: boolean; metrics?: DrFullMetrics; error?: string
}> {
  const url = `${SE_METRICS_URL}?target=${encodeURIComponent(domain)}&mode=domain`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  if (!res.ok) {
    // Cloudflare challenge
    if (res.headers.get('cf-mitigated') === 'challenge') {
      return { ok: false, error: 'cloudflare_challenge' }
    }
    const body = await res.text().catch(() => '')
    console.warn(`[Bot] DR site-explorer ${res.status} for "${domain}":`, body.slice(0, 200))
    return { ok: false, error: `HTTP ${res.status}` }
  }

  let json: AhrefsSiteExplorerResponse
  try { json = (await res.json()) as AhrefsSiteExplorerResponse } catch {
    return { ok: false, error: 'invalid_json' }
  }

  const m = json?.metrics
  if (!m) return { ok: false, error: 'no_metrics' }

  const dofollow  = m.dofollow_backlinks   ?? null
  const backlinks = m.backlinks            ?? null
  const nofollow  = (backlinks !== null && dofollow !== null) ? Math.max(0, backlinks - dofollow) : null

  return {
    ok: true,
    metrics: {
      ahrefsRank:      m.ahrefs_rank                    ?? null,
      backlinks:       backlinks,
      dofollowLinks:   dofollow,
      nofollowLinks:   nofollow,
      refdomains:      m.refdomains                     ?? null,
      dofollowDomains: m.dofollow_refdomains             ?? null,
      orgKeywords:     m.org_keywords                   ?? null,
      orgTraffic:      m.org_traffic                    ?? null,
      orgCost:         m.org_cost                       ?? null,
      linkedDomains:   m.linked_root_domains            ?? null,
    },
  }
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * Fetch Ahrefs domain metrics for `rawDomain`.
 *
 * - Always queries the free DR endpoint (no key needed)
 * - Also queries site-explorer/metrics when AHREFS_API_KEY is set
 *
 * Gracefully degrades: if the paid call fails, `data.hasFull` is false.
 */
export async function getDomainMetrics(rawDomain: string): Promise<DomainMetricsResult> {
  const domain = normalizeDomain(rawDomain)
  if (!domain) {
    console.warn(`[Bot] DR invalid domain input: "${rawDomain}"`)
    return { ok: false, error: 'invalid_domain', message: 'Invalid domain format' }
  }

  const apiKey = process.env.AHREFS_API_KEY ?? ''
  console.log(`[Bot] DR metrics lookup: "${domain}" (key: ${apiKey ? 'yes' : 'no'})`)

  // Run both calls in parallel when a key is present; otherwise only the free call
  const [freeResult, paidResult] = await Promise.all([
    fetchDrFree(domain, apiKey),
    apiKey ? fetchSiteExplorerMetrics(domain, apiKey) : Promise.resolve(null),
  ])

  // Free endpoint must succeed for a valid result
  if (!freeResult.ok) {
    if (freeResult.error === 'cloudflare_challenge') {
      console.error(`[Bot] DR Cloudflare challenge for "${domain}"`)
      return { ok: false, error: 'blocked', message: 'Request blocked by Cloudflare — try from the production server' }
    }
    if (freeResult.error === 'no_dr_value') {
      console.warn(`[Bot] DR no value in free response for "${domain}"`)
      return { ok: false, error: 'not_found', message: 'Domain not found in Ahrefs index' }
    }
    console.error(`[Bot] DR free endpoint error for "${domain}":`, freeResult.error)
    return { ok: false, error: 'api_error', message: freeResult.error ?? 'Unknown error' }
  }

  const full = (paidResult?.ok && paidResult.metrics) ? paidResult.metrics : null
  if (paidResult && !paidResult.ok) {
    console.warn(`[Bot] DR site-explorer failed for "${domain}" (non-fatal):`, paidResult.error)
  }

  console.log(`[Bot] DR success: "${domain}" → DR ${freeResult.dr}${full ? ' + full metrics' : ''}`)

  return {
    ok: true,
    data: {
      domain,
      domainRating: freeResult.dr!,
      fetchedAt:    new Date().toISOString(),
      full,
      hasFull:      full !== null,
    },
  }
}

// ── Legacy export (used by old handler code) ──────────────────────────────────

/** @deprecated Use getDomainMetrics instead */
export async function getDomainRating(rawDomain: string) {
  const result = await getDomainMetrics(rawDomain)
  if (!result.ok) {
    // Normalize new error variants to the legacy contract so old callers
    // with exhaustive error handling (invalid_domain | not_found | api_error)
    // are never given an unexpected variant.
    const legacyError =
      result.error === 'blocked'
        ? ({ ok: false as const, error: 'api_error' as const, message: result.message })
        : result
    return legacyError
  }
  return {
    ok: true as const,
    data: {
      domain:       result.data.domain,
      domainRating: result.data.domainRating,
      license:      '',
      fetchedAt:    result.data.fetchedAt,
    },
  }
}
