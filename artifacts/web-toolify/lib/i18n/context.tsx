'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { en, t as translate, type TranslationKey, type TranslationMap } from './translations'
import { WEBSITE_LANGUAGES, DEFAULT_LANGUAGE, type WebsiteLanguage } from './website-languages'

const LANG_KEY = 'toolify_lang'

// Only 'en' is bundled — all other locales are loaded on demand
const localeLoaders: Record<string, () => Promise<{ default: unknown }>> = {
  ar:    () => import('./locales/ar'),
  bn:    () => import('./locales/bn'),
  cs:    () => import('./locales/cs'),
  da:    () => import('./locales/da'),
  de:    () => import('./locales/de'),
  el:    () => import('./locales/el'),
  es:    () => import('./locales/es'),
  fa:    () => import('./locales/fa'),
  fi:    () => import('./locales/fi'),
  fr:    () => import('./locales/fr'),
  hi:    () => import('./locales/hi'),
  hu:    () => import('./locales/hu'),
  id:    () => import('./locales/id'),
  it:    () => import('./locales/it'),
  ja:    () => import('./locales/ja'),
  ko:    () => import('./locales/ko'),
  nl:    () => import('./locales/nl'),
  no:    () => import('./locales/no'),
  pl:    () => import('./locales/pl'),
  pt:    () => import('./locales/pt'),
  ro:    () => import('./locales/ro'),
  ru:    () => import('./locales/ru'),
  sv:    () => import('./locales/sv'),
  th:    () => import('./locales/th'),
  tr:    () => import('./locales/tr'),
  uk:    () => import('./locales/uk'),
  vi:    () => import('./locales/vi'),
  zh:    () => import('./locales/zh'),
  'zh-TW': () => import('./locales/zh-TW'),
}

const localeCache: Record<string, TranslationMap> = { en }

async function loadLocale(code: string): Promise<TranslationMap> {
  if (localeCache[code]) return localeCache[code]
  const loader = localeLoaders[code]
  if (!loader) return en
  try {
    const mod = await loader()
    const map = (mod.default as unknown) as TranslationMap
    localeCache[code] = map
    return map
  } catch {
    return en
  }
}

interface I18nContextValue {
  lang: string
  setLang: (code: string) => void
  t: (key: TranslationKey) => string
  languages: WebsiteLanguage[]
  currentLanguage: WebsiteLanguage
  isRtl: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

function readLangCookie(): string {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE
  const match = document.cookie.match(/(?:^|;\s*)toolify_lang=([^;]+)/)
  if (match) {
    const code = match[1]
    if (WEBSITE_LANGUAGES.some((l) => l.code === code)) return code
  }
  try {
    const stored = localStorage.getItem(LANG_KEY)
    if (stored && WEBSITE_LANGUAGES.some((l) => l.code === stored)) return stored
  } catch {}
  return DEFAULT_LANGUAGE
}

export function I18nProvider({
  children,
  initialLang = DEFAULT_LANGUAGE,
}: {
  children: React.ReactNode
  initialLang?: string
}) {
  const [lang, setLangState] = useState<string>(initialLang)
  const [map, setMap] = useState<TranslationMap>(en)
  const mountedRef = useRef(false)

  // On first client mount, load the user's saved language
  useEffect(() => {
    const saved = readLangCookie()
    if (saved === 'en') return
    loadLocale(saved).then((locale) => {
      setLangState(saved)
      setMap(locale)
      const lang_obj = WEBSITE_LANGUAGES.find((l) => l.code === saved)
      document.documentElement.setAttribute('dir', lang_obj?.rtl ? 'rtl' : 'ltr')
      document.documentElement.setAttribute('lang', saved)
    })
    mountedRef.current = true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setLang = useCallback((code: string) => {
    loadLocale(code).then((locale) => {
      setLangState(code)
      setMap(locale)
      const lang_obj = WEBSITE_LANGUAGES.find((l) => l.code === code)
      document.documentElement.setAttribute('dir', lang_obj?.rtl ? 'rtl' : 'ltr')
      document.documentElement.setAttribute('lang', code)
    })
    try {
      document.cookie = `${LANG_KEY}=${code}; max-age=31536000; path=/; samesite=lax`
      localStorage.setItem(LANG_KEY, code)
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
