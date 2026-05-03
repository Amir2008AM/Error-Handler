'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translations, t as translate, type TranslationKey } from './translations'
import { WEBSITE_LANGUAGES, DEFAULT_LANGUAGE, type WebsiteLanguage } from './website-languages'

const STORAGE_KEY = 'toolify_lang'

interface I18nContextValue {
  lang: string
  setLang: (code: string) => void
  t: (key: TranslationKey) => string
  languages: WebsiteLanguage[]
  currentLanguage: WebsiteLanguage
  isRtl: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(DEFAULT_LANGUAGE)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored && translations[stored]) {
        setLangState(stored)
        return
      }
      const browser = navigator.language?.split('-')[0]
      if (browser && translations[browser]) {
        setLangState(browser)
      } else if (browser) {
        const match = Object.keys(translations).find((k) => k.startsWith(browser))
        if (match) setLangState(match)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const lang_obj = WEBSITE_LANGUAGES.find((l) => l.code === lang)
    if (lang_obj?.rtl) {
      document.documentElement.setAttribute('dir', 'rtl')
    } else {
      document.documentElement.setAttribute('dir', 'ltr')
    }
    document.documentElement.setAttribute('lang', lang)
  }, [lang])

  const setLang = useCallback((code: string) => {
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {}
  }, [])

  const tFn = useCallback(
    (key: TranslationKey) => translate(lang, key),
    [lang]
  )

  const currentLanguage =
    WEBSITE_LANGUAGES.find((l) => l.code === lang) ??
    WEBSITE_LANGUAGES.find((l) => l.code === DEFAULT_LANGUAGE)!

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t: tFn,
        languages: WEBSITE_LANGUAGES,
        currentLanguage,
        isRtl: !!currentLanguage.rtl,
      }}
    >
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
