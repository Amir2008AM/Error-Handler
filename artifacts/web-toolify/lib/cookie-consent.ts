export const CONSENT_STORAGE_KEY = 'toolify_cookie_consent'
export const CONSENT_COOKIE_KEY = 'toolify_cookie_consent'
export const CONSENT_VERSION = 1

export interface CookieConsent {
  version: number
  necessary: true
  analytics: boolean
  advertising: boolean
  decidedAt: string
}

export const DEFAULT_CONSENT: Omit<CookieConsent, 'decidedAt'> = {
  version: CONSENT_VERSION,
  necessary: true,
  analytics: false,
  advertising: false,
}

export function readStoredConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CookieConsent
    if (parsed.version !== CONSENT_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function writeStoredConsent(consent: CookieConsent) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
    document.cookie = `${CONSENT_COOKIE_KEY}=${encodeURIComponent(
      JSON.stringify({ analytics: consent.analytics, advertising: consent.advertising })
    )}; max-age=31536000; path=/; samesite=lax`
  } catch {}
}

export const COOKIE_CONSENT_EVENT = 'toolify-cookie-consent-changed'
