'use client'

import { useState, useMemo } from 'react'
import { Search, FileText, Image, AlignLeft, ArrowRightLeft, Calculator, Zap } from 'lucide-react'
import Link from 'next/link'
import { LanguageSwitcher } from './language-switcher'
import { ToolCard } from './tool-card'
import { tools, categories, categoryMeta, searchTools, type ToolCategory } from '@/lib/tools'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import type { ReactNode } from 'react'

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Image,
  AlignLeft,
  ArrowRightLeft,
  Calculator,
}

const CATEGORY_KEY_MAP: Record<string, string> = {
  'PDF Tools': 'home.pdfTools',
  'Security Tools': 'home.securityTools',
  'Converters': 'home.converters',
  'Image Tools': 'home.imageTools',
  'Text Tools': 'home.textTools',
  'Calculators': 'home.calculators',
}

const CATEGORY_SLUG_MAP: Record<string, string> = {
  'PDF Tools':      'pdf-tools',
  'Security Tools': 'security-tools',
  'Converters':     'converters',
  'Image Tools':    'image-tools',
  'Text Tools':     'text-tools',
  'Calculators':    'calculators',
}

type Props = {
  initialCategory?: ToolCategory | null
  badgeSlot?: ReactNode
  preFooterSlot?: ReactNode
}

export function HomeContent({ initialCategory, badgeSlot, preFooterSlot }: Props = {}) {
  const { t } = useI18n()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All' | null>(
    initialCategory ?? 'All'
  )


  const displayedTools = useMemo(() => {
    if (searchQuery.trim()) return searchTools(searchQuery)
    if (activeCategory && activeCategory !== 'All')
      return tools.filter((tool) => tool.category === activeCategory)
    return tools
  }, [searchQuery, activeCategory])

  return (
    <main className="flex-1 bg-background">
      {/* Hero Section */}
      <section className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('home.hero.title')}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-5 text-pretty leading-relaxed">
            {t('home.hero.subtitle')}
          </p>

          {/* Category Filter Pills — rendered as <Link> for SEO */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            <Link
              href="/"
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                activeCategory === 'All' && !searchQuery
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              )}
              onClick={() => {
                setActiveCategory('All')
                setSearchQuery('')
              }}
            >
              {t('home.allTools')}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat}
                href={`/category/${CATEGORY_SLUG_MAP[cat] ?? cat.toLowerCase().replace(/ /g, '-')}`}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                  activeCategory === cat && !searchQuery
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-white text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                )}
                onClick={() => {
                  setActiveCategory(cat)
                  setSearchQuery('')
                }}
              >
                {t((CATEGORY_KEY_MAP[cat] ?? 'home.allTools') as Parameters<typeof t>[0])}
              </Link>
            ))}
          </div>

          {/* Search */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('nav.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (e.target.value) setActiveCategory(null)
              }}
              className="w-full pl-11 pr-4 py-3 text-sm border border-border rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
          </div>

        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12" aria-labelledby="tools-heading">
        {/* Screen-reader heading bridges h1→h3 for valid heading hierarchy */}
        <h2 id="tools-heading" className="sr-only">{t('home.allTools')}</h2>
        {searchQuery && (
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {displayedTools.length} result{displayedTools.length !== 1 ? 's' : ''} for &quot;
            {searchQuery}&quot;
          </p>
        )}

        {displayedTools.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">
              {t('home.noToolsFound')} &quot;{searchQuery}&quot;
            </p>
            <p className="text-sm mt-2">{t('home.noToolsFoundHint')}</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('All')
              }}
              className="mt-4 text-primary font-medium text-sm hover:underline"
            >
              {t('home.allTools')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {displayedTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </section>

      {/* Security Trust Badge */}
      <section className="py-10 px-4">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 bg-white border border-border rounded-2xl px-6 py-4 shadow-sm w-full sm:w-auto">
            <div className="flex-shrink-0">
              <img src="/ssl-secure.svg" alt="HTTPS Secure" width={45} height={24} className="h-8 w-auto" />
            </div>
            <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">Secure Processing</span>
              <span className="text-xs text-muted-foreground leading-tight mt-0.5">Protected by HTTPS Encryption</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            All file transfers are encrypted. Your files are automatically deleted after processing.
          </p>
        </div>
      </section>

      {/* Pre-footer content slot (FAQ, SEO sections, etc.) */}
      {preFooterSlot}

      {/* Footer */}
      <footer style={{ backgroundColor: '#111111' }} className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">

          {/* Main grid — 1 col mobile → 2 col sm → 5 col md+ */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-10">

            {/* Brand — full width on mobile */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <span className="text-white text-lg font-bold">Toolify</span>
              </div>
              <p style={{ color: '#9ca3af' }} className="text-sm leading-relaxed max-w-xs">
                {t('home.footer.brandDesc')}
              </p>
            </div>

            {/* PDF Tools */}
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">
                {t('home.pdfTools')}
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Image to PDF', href: '/image-to-pdf' },
                  { label: 'Merge PDF',    href: '/merge-pdf' },
                  { label: 'Split PDF',    href: '/split-pdf' },
                  { label: 'PDF to Word',  href: '/pdf-to-word' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} style={{ color: '#9ca3af' }} className="text-sm hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Image Tools */}
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">
                {t('home.imageTools')}
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Compress Image', href: '/compress-image' },
                  { label: 'Resize Image',   href: '/resize-image' },
                  { label: 'Convert Image',  href: '/convert-image' },
                  { label: 'Crop Image',     href: '/crop-image' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} style={{ color: '#9ca3af' }} className="text-sm hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">
                Company
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'About Us',   href: '/about' },
                  { label: 'Contact Us', href: '/contact-us' },
                  { label: 'Blog',       href: '/blog' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} style={{ color: '#9ca3af' }} className="text-sm hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-white font-semibold text-xs uppercase tracking-wider mb-4">
                Legal
              </h3>
              <ul className="space-y-3">
                {[
                  { label: 'Privacy Policy',     href: '/privacy-policy' },
                  { label: 'Terms & Conditions', href: '/terms-and-conditions' },
                  { label: 'Cookies Policy',     href: '/cookies-policy' },
                  { label: 'Disclaimer',         href: '/disclaimer' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} style={{ color: '#9ca3af' }} className="text-sm hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #2a2a2a' }} className="mt-10 pt-6 flex flex-col gap-4">
            {/* Badges row — injected from page.tsx as a true server component */}
            {badgeSlot}
            {/* Copyright + language */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p style={{ color: '#6b7280' }} className="text-xs text-center sm:text-left">
                © 2026 ToolifyPDF. All rights reserved.
              </p>
              <LanguageSwitcher variant="dark-footer" />
            </div>
          </div>

        </div>
      </footer>
    </main>
  )
}
