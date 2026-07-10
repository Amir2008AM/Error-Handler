/**
 * Domain Rating (DR) Service — Ahrefs v3 Public API
 *
 * Fetches the Domain Rating for a given domain using the Ahrefs
 * free public endpoint. API key is read from AHREFS_API_KEY env var;
 * the endpoint also works without a key at the free public tier.
 *
 * Usage:
 *   import { getDomainRating } from './dr-service'
 *   const result = await getDomainRating('google.com')
 */

const AHREFS_DR_ENDPOINT = 'https://api.ahrefs.com/v3/public/domain-rating-free'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DomainRatingData {
  /** Cleaned domain that was queried (e.g. "google.com") */
  domain:       string
  /** Rounded DR score 0–100 */
  domainRating: number
  /** License string returned by Ahrefs (empty string when absent) */
  license:      string
  /** UTC ISO string of when the data was fetched */
  fetchedAt:    string
}

export type DomainRatingResult =
  | { ok: true;  data: DomainRatingData }
  | { ok: false; error: 'invalid_domain' | 'not_found' | 'api_error'; message: string }

// ── Ahrefs API response shape ─────────────────────────────────────────────────

interface AhrefsResponse {
  domain_rating?: {
    domain_rating?: number
    license?:       string
  }
}

// ── Domain normalisation ──────────────────────────────────────────────────────

// Matches a bare hostname: e.g. "google.com", "sub.example.co.uk"
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i

/**
 * Strip protocol, www., paths, query strings, port numbers, and trailing dots.
 * Returns the cleaned lowercase hostname, or null if it is not a valid domain.
 */
export function normalizeDomain(input: string): string | null {
  let s = input.trim()
  s = s.replace(/^https?:\/\//i, '')   // remove http:// or https://
  s = s.replace(/^www\./i, '')          // remove www.
  s = s.split('/')[0]                   // remove path
  s = s.split('?')[0]                   // remove query string
  s = s.split('#')[0]                   // remove fragment
  s = s.replace(/:\d+$/, '')            // remove :port (e.g. example.com:8080)
  s = s.replace(/\.+$/, '')             // remove trailing dots
  s = s.toLowerCase()
  return DOMAIN_RE.test(s) ? s : null
}

// ── Main lookup ───────────────────────────────────────────────────────────────

/**
 * Fetch the Ahrefs Domain Rating for `rawDomain`.
 *
 * @param rawDomain  Raw user input — may include https://, www., trailing slash, etc.
 */
export async function getDomainRating(rawDomain: string): Promise<DomainRatingResult> {
  // 1. Validate and normalise domain
  const domain = normalizeDomain(rawDomain)
  if (!domain) {
    console.warn(`[Bot] DR invalid domain input: "${rawDomain}"`)
    return { ok: false, error: 'invalid_domain', message: 'Invalid domain format' }
  }

  // 2. Build request
  const url     = `${AHREFS_DR_ENDPOINT}?target=${encodeURIComponent(domain)}`
  const apiKey  = process.env.AHREFS_API_KEY ?? ''
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  console.log(`[Bot] DR lookup for "${domain}" — ${url}`)

  // 3. Execute request — retry without auth header if the key is rejected,
  //    since the public endpoint works unauthenticated per Ahrefs docs.
  async function doFetch(hdrs: Record<string, string>): Promise<Response> {
    return fetch(url, { headers: hdrs, signal: AbortSignal.timeout(12_000) })
  }

  let res: Response
  try {
    res = await doFetch(headers)
    // If a supplied key is invalid fall back to unauthenticated request
    if ((res.status === 401 || res.status === 403) && apiKey) {
      console.warn(`[Bot] DR auth error ${res.status} for "${domain}" — retrying without key`)
      res = await doFetch({ Accept: 'application/json' })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Bot] DR network error for "${domain}":`, msg)
    return { ok: false, error: 'api_error', message: msg }
  }

  // 4. Handle HTTP errors
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 404) {
      console.warn(`[Bot] DR 404 for "${domain}"`)
      return { ok: false, error: 'not_found', message: 'Domain not found in Ahrefs index' }
    }
    console.error(`[Bot] DR API error ${res.status} for "${domain}":`, body.slice(0, 200))
    return { ok: false, error: 'api_error', message: `HTTP ${res.status}` }
  }

  // 5. Parse JSON
  let json: AhrefsResponse
  try {
    json = (await res.json()) as AhrefsResponse
  } catch {
    console.error(`[Bot] DR invalid JSON response for "${domain}"`)
    return { ok: false, error: 'api_error', message: 'Invalid JSON from API' }
  }

  // 6. Extract data
  const dr = json?.domain_rating
  if (!dr || dr.domain_rating === undefined || dr.domain_rating === null) {
    console.warn(`[Bot] DR no value in response for "${domain}":`, JSON.stringify(json))
    return { ok: false, error: 'not_found', message: 'No Domain Rating data in response' }
  }

  const result: DomainRatingData = {
    domain,
    domainRating: Math.round(dr.domain_rating),
    license:      dr.license ?? '',
    fetchedAt:    new Date().toISOString(),
  }

  console.log(`[Bot] DR success: "${domain}" → DR ${result.domainRating}`)
  return { ok: true, data: result }
}
