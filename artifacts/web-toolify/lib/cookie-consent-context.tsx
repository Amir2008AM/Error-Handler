'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  type CookieConsent,
  DEFAULT_CONSENT,
  readStoredConsent,
  writeStoredConsent,
} from './cookie-consent'

interface CookieConsentContextValue {
  consent: CookieConsent | null
  hasDecided: boolean
  bannerVisible: boolean
  isEU: boolean | null          // null = not yet determined
  acceptAll: () => void
  rejectNonEssential: () => void
  savePreferences: (prefs: { analytics: boolean; advertising: boolean }) => void
  openPreferences: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

/** Silently write full consent without surfacing the banner (used for non-EU visitors). */
function autoAcceptAll(): CookieConsent {
  const c: CookieConsent = {
    ...DEFAULT_CONSENT,
    analytics: true,
    advertising: true,
    decidedAt: new Date().toISOString(),
  }
  writeStoredConsent(c)
  return c
}

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent]           = useState<CookieConsent | null>(null)
  const [hasDecided, setHasDecided]     = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)
  const [isEU, setIsEU]                 = useState<boolean | null>(null)

  useEffect(() => {
    // 1. If user already decided, respect their stored choice regardless of geo.
    const stored = readStoredConsent()
    if (stored) {
      setConsent(stored)
      setHasDecided(true)
      setBannerVisible(false)
      setIsEU(null) // geo irrelevant once decided
      return
    }

    // 2. No stored consent — detect geo to decide whether to show the banner.
    let cancelled = false
    fetch('/api/geo-region', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : { isEU: true }) // default to EU-strict on error
      .then((data: { isEU: boolean }) => {
        if (cancelled) return
        if (data.isEU) {
          // EU visitor: show the consent banner as required by GDPR.
          setIsEU(true)
          setBannerVisible(true)
        } else {
          // Non-EU visitor: auto-accept silently, ads load immediately.
          setIsEU(false)
          const c = autoAcceptAll()
          setConsent(c)
          setHasDecided(true)
          setBannerVisible(false)
        }
      })
      .catch(() => {
        // Network error: default to showing banner (safe / GDPR-compliant).
        if (!cancelled) setBannerVisible(true)
      })

    return () => { cancelled = true }
  }, [])

  const persist = useCallback((analytics: boolean, advertising: boolean) => {
    const next: CookieConsent = {
      ...DEFAULT_CONSENT,
      analytics,
      advertising,
      decidedAt: new Date().toISOString(),
    }
    writeStoredConsent(next)
    setConsent(next)
    setHasDecided(true)
    setBannerVisible(false)
  }, [])

  const acceptAll           = useCallback(() => persist(true, true),   [persist])
  const rejectNonEssential  = useCallback(() => persist(false, false), [persist])
  const savePreferences     = useCallback(
    (prefs: { analytics: boolean; advertising: boolean }) =>
      persist(prefs.analytics, prefs.advertising),
    [persist]
  )
  const openPreferences = useCallback(() => setBannerVisible(true), [])

  return (
    <CookieConsentContext.Provider
      value={{ consent, hasDecided, bannerVisible, isEU, acceptAll, rejectNonEssential, savePreferences, openPreferences }}
    >
      {children}
    </CookieConsentContext.Provider>
  )
}

export function useCookieConsent(): CookieConsentContextValue {
  const ctx = useContext(CookieConsentContext)
  if (!ctx) throw new Error('useCookieConsent must be used inside CookieConsentProvider')
  return ctx
}
