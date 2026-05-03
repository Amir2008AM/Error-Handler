'use client'

import { useState, useRef, useEffect } from 'react'
import { Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

export function LanguageSwitcher() {
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v)
          setSearch('')
        }}
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
                  onClick={() => {
                    setLang(l.code)
                    setOpen(false)
                    setSearch('')
                  }}
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
