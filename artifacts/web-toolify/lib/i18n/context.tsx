'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { en, t as translate, type TranslationKey, type TranslationMap } from './translations'
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

async function loadLocale(code: string): Promise<TranslationMap> {
  switch (code) {
    case 'ar': return (await import('./locales/ar')).default as unknown as TranslationMap
    case 'fr': return (await import('./locales/fr')).default as unknown as TranslationMap
    case 'de': return (await import('./locales/de')).default as unknown as TranslationMap
    case 'es': return (await import('./locales/es')).default as unknown as TranslationMap
    case 'pt': return (await import('./locales/pt')).default as unknown as TranslationMap
    case 'ru': return (await import('./locales/ru')).default as unknown as TranslationMap
    case 'zh': return (await import('./locales/zh')).default as unknown as TranslationMap
    case 'ja': return (await import('./locales/ja')).default as unknown as TranslationMap
    default:   return en
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<string>(DEFAULT_LANGUAGE)
  const [map, setMap] = useState<TranslationMap>(en)
  const cache = useRef<Record<string, TranslationMap>>({ en })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const browser = navigator.language?.split('-')[0]
      const supported = WEBSITE_LANGUAGES.map((l) => l.code)
      const candidate = stored && supported.includes(stored)
        ? stored
        : browser && supported.includes(browser)
          ? browser
          : null
      if (candidate && candidate !== DEFAULT_LANGUAGE) {
        setLangState(candidate)
      }
    } catch {}
  }, [])

  useEffect(() => {
    const lang_obj = WEBSITE_LANGUAGES.find((l) => l.code === lang)
    document.documentElement.setAttribute('dir', lang_obj?.rtl ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)

    if (lang === 'en') {
      setMap(en)
      return
    }
    if (cache.current[lang]) {
      setMap(cache.current[lang])
      return
    }
    loadLocale(lang).then((m) => {
      cache.current[lang] = m
      setMap(m)
    })
  }, [lang])

  const setLang = useCallback((code: string) => {
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {}
  }, [])

  const tFn = useCallback(
    (key: TranslationKey) => translate(lang, key, map),
    [lang, map]
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
