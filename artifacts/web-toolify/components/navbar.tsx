'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { t } = useI18n()

  const navLinks = [
    { key: 'nav.pdf' as const, href: '/category/pdf-tools' },
    { key: 'nav.security' as const, href: '/category/security-tools' },
    { key: 'nav.converter' as const, href: '/category/converters' },
    { key: 'nav.image' as const, href: '/category/image-tools' },
    { key: 'nav.text' as const, href: '/category/text-tools' },
    { key: 'nav.calculator' as const, href: '/category/calculators' },
    { key: 'nav.blog' as const, href: '/blog' },
  ]

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm" style={{ willChange: 'transform' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image src="/favicon.png" alt="ToolifyPDF logo" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
              ToolifyPDF
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

          {/* Mobile: menu */}
          <div className="md:hidden flex items-center gap-1">
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
