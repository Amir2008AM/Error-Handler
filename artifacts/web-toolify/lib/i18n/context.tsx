'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { en, t as translate, type TranslationKey, type TranslationMap } from './translations'
import { WEBSITE_LANGUAGES, DEFAULT_LANGUAGE, type WebsiteLanguage } from './website-languages'

import ar    from './locales/ar'
import bn    from './locales/bn'
import cs    from './locales/cs'
import da    from './locales/da'
import de    from './locales/de'
import el    from './locales/el'
import es    from './locales/es'
import fa    from './locales/fa'
import fi    from './locales/fi'
import fr    from './locales/fr'
import hi    from './locales/hi'
import hu    from './locales/hu'
import id    from './locales/id'
import it    from './locales/it'
import ja    from './locales/ja'
import ko    from './locales/ko'
import nl    from './locales/nl'
import no    from './locales/no'
import pl    from './locales/pl'
import pt    from './locales/pt'
import ro    from './locales/ro'
import ru    from './locales/ru'
import sv    from './locales/sv'
import th    from './locales/th'
import tr    from './locales/tr'
import uk    from './locales/uk'
import vi    from './locales/vi'
import zh    from './locales/zh'
import zhTW  from './locales/zh-TW'

const LANG_KEY = 'toolify_lang'

const LOCALE_MAP: Record<string, TranslationMap> = {
  ar:    ar    as unknown as TranslationMap,
  bn:    bn    as unknown as TranslationMap,
  cs:    cs    as unknown as TranslationMap,
  da:    da    as unknown as TranslationMap,
  de:    de    as unknown as TranslationMap,
  el:    el    as unknown as TranslationMap,
  en,
  es:    es    as unknown as TranslationMap,
  fa:    fa    as unknown as TranslationMap,
  fi:    fi    as unknown as TranslationMap,
  fr:    fr    as unknown as TranslationMap,
  hi:    hi    as unknown as TranslationMap,
  hu:    hu    as unknown as TranslationMap,
  id:    id    as unknown as TranslationMap,
  it:    it    as unknown as TranslationMap,
  ja:    ja    as unknown as TranslationMap,
  ko:    ko    as unknown as TranslationMap,
  nl:    nl    as unknown as TranslationMap,
  no:    no    as unknown as TranslationMap,
  pl:    pl    as unknown as TranslationMap,
  pt:    pt    as unknown as TranslationMap,
  ro:    ro    as unknown as TranslationMap,
  ru:    ru    as unknown as TranslationMap,
  sv:    sv    as unknown as TranslationMap,
  th:    th    as unknown as TranslationMap,
  tr:    tr    as unknown as TranslationMap,
  uk:    uk    as unknown as TranslationMap,
  vi:    vi    as unknown as TranslationMap,
  zh:    zh    as unknown as TranslationMap,
  'zh-TW': zhTW as unknown as TranslationMap,
}

function loadLocale(code: string): TranslationMap {
  return LOCALE_MAP[code] ?? en
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
  const [map, setMap] = useState<TranslationMap>(loadLocale(initialLang))
  const cache = useRef<Record<string, TranslationMap>>(LOCALE_MAP)

  // On first client mount, restore language from cookie/localStorage
  useEffect(() => {
    const saved = readLangCookie()
    if (saved !== lang) {
      setLangState(saved)
      setMap(loadLocale(saved))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const lang_obj = WEBSITE_LANGUAGES.find((l) => l.code === lang)
    document.documentElement.setAttribute('dir', lang_obj?.rtl ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', lang)
    const locale = loadLocale(lang)
    cache.current[lang] = locale
    setMap(locale)
  }, [lang])

  const setLang = useCallback((code: string) => {
    setLangState(code)
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
