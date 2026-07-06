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
  acceptAll: () => void
  rejectNonEssential: () => void
  savePreferences: (prefs: { analytics: boolean; advertising: boolean }) => void
  openPreferences: () => void
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null)

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [hasDecided, setHasDecided] = useState(false)
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    const stored = readStoredConsent()
    if (stored) {
      setConsent(stored)
      setHasDecided(true)
      setBannerVisible(false)
    } else {
      setBannerVisible(true)
    }
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

  const acceptAll = useCallback(() => persist(true, true), [persist])
  const rejectNonEssential = useCallback(() => persist(false, false), [persist])
  const savePreferences = useCallback(
    (prefs: { analytics: boolean; advertising: boolean }) => persist(prefs.analytics, prefs.advertising),
    [persist]
  )
  const openPreferences = useCallback(() => setBannerVisible(true), [])

  return (
    <CookieConsentContext.Provider
      value={{ consent, hasDecided, bannerVisible, acceptAll, rejectNonEssential, savePreferences, openPreferences }}
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
