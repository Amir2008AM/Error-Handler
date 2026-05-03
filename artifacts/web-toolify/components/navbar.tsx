'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search, Menu, X, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { LanguageSwitcher } from './language-switcher'
import { useI18n } from '@/lib/i18n/context'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const { t } = useI18n()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const navLinks = [
    { key: 'nav.pdf' as const, href: '/?category=PDF+Tools' },
    { key: 'nav.security' as const, href: '/?category=Security+Tools' },
    { key: 'nav.converter' as const, href: '/?category=Converters' },
    { key: 'nav.ocr' as const, href: '/?category=OCR+Tools' },
    { key: 'nav.image' as const, href: '/?category=Image+Tools' },
    { key: 'nav.text' as const, href: '/?category=Text+Tools' },
    { key: 'nav.calculator' as const, href: '/?category=Calculators' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              Toolify
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5">
            {navLinks.map(({ key, href }) => (
              <Link
                key={key}
                href={href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
              >
                {t(key)}
              </Link>
            ))}
          </nav>

          {/* Desktop right: search + language switcher */}
          <div className="hidden md:flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t('nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-muted/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-44 transition-all"
                />
              </div>
            </form>
            <LanguageSwitcher />
          </div>

          {/* Mobile: language + menu */}
          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher />
            <button
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-muted/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </form>
          {navLinks.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-foreground py-1 transition-colors"
            >
              {t(key)}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
