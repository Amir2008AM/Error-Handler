'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface LanguageSwitcherProps {
  variant?: 'navbar' | 'footer' | 'dark-footer'
}

export function LanguageSwitcher({ variant = 'navbar' }: LanguageSwitcherProps) {
  const { lang, setLang, languages, currentLanguage } = useI18n()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = languages.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase())
  )

  if (variant === 'dark-footer') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => { setOpen((v) => !v); setSearch('') }}
          aria-label="Switch language"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium shadow-sm"
          style={{ borderColor: '#3a3a3a', backgroundColor: '#1c1c1c', color: '#d1d5db' }}
        >
          <Globe className="w-4 h-4 shrink-0" style={{ color: '#9ca3af' }} />
          <span>{currentLanguage.nativeName}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform`} style={{ color: '#6b7280', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>

        {open && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                placeholder="Search language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground text-center">No results</li>
              )}
              {filtered.map((l) => (
                <li key={l.code}>
                  <button
                    onClick={() => { setLang(l.code); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      l.code === lang ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
                    }`}
                  >
                    <span>{l.nativeName}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{l.name}</span>
                      {l.code === lang && <Check className="w-3.5 h-3.5 text-primary" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'footer') {
    return (
      <div ref={ref} className="relative">
        <button
          onClick={() => { setOpen((v) => !v); setSearch('') }}
          aria-label="Switch language"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white hover:bg-muted/60 hover:border-primary/40 transition-all text-sm font-medium text-foreground shadow-sm"
        >
          <Globe className="w-4 h-4 text-primary shrink-0" />
          <span>{currentLanguage.nativeName}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? '-rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute bottom-full mb-2 left-0 w-64 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-border">
              <input
                autoFocus
                type="text"
                placeholder="Search language..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground text-center">No results</li>
              )}
              {filtered.map((l) => (
                <li key={l.code}>
                  <button
                    onClick={() => { setLang(l.code); setOpen(false); setSearch('') }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                      l.code === lang ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
                    }`}
                  >
                    <span>{l.nativeName}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{l.name}</span>
                      {l.code === lang && <Check className="w-3.5 h-3.5 text-primary" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  // navbar variant
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); setSearch('') }}
        aria-label="Switch language"
        title="Switch language"
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-sm"
      >
        <Globe className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline text-xs font-medium">{currentLanguage.nativeName}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-60 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              type="text"
              placeholder="Search language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground text-center">No results</li>
            )}
            {filtered.map((l) => (
              <li key={l.code}>
                <button
                  onClick={() => { setLang(l.code); setOpen(false); setSearch('') }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-muted ${
                    l.code === lang ? 'text-primary font-medium bg-primary/5' : 'text-foreground'
                  }`}
                >
                  <span>{l.name}</span>
                  <span className="text-xs text-muted-foreground">{l.nativeName}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
