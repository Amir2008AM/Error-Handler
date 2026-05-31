'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, FileText, Image, AlignLeft, ArrowRightLeft, Calculator, Zap } from 'lucide-react'
import Link from 'next/link'
import { ToolCard } from './tool-card'
import { AdBanner } from './ad-banner'
import { Navbar } from './navbar'
import { tools, categories, categoryMeta, searchTools, type ToolCategory } from '@/lib/tools'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'

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
  'OCR Tools': 'home.ocrTools',
  'Image Tools': 'home.imageTools',
  'Text Tools': 'home.textTools',
  'Calculators': 'home.calculators',
}

export function HomeContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const urlCategory = searchParams.get('category') as ToolCategory | null
  const urlSearch = searchParams.get('search') ?? ''

  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All' | null>(
    urlCategory ?? 'All'
  )

  const displayedTools = useMemo(() => {
    if (searchQuery.trim()) return searchTools(searchQuery)
    if (activeCategory && activeCategory !== 'All')
      return tools.filter((tool) => tool.category === activeCategory)
    return tools
  }, [searchQuery, activeCategory])

  return (
    <main className="flex-1 bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t('home.hero.title')}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty leading-relaxed">
            {t('home.hero.subtitle')}
          </p>

          {/* Category Filter Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
            <button
              onClick={() => {
                setActiveCategory('All')
                setSearchQuery('')
              }}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                activeCategory === 'All'
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-white text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              )}
            >
              {t('home.allTools')}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat)
                  setSearchQuery('')
                }}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all border',
                  activeCategory === cat
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-white text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
                )}
              >
                {t((CATEGORY_KEY_MAP[cat] ?? 'home.allTools') as Parameters<typeof t>[0])}
              </button>
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
              No tools found for &quot;{searchQuery}&quot;
            </p>
            <p className="text-sm mt-2">Try a different keyword or browse all tools</p>
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

      {/* AdSense */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <AdBanner slot="6978025975" format="horizontal" />
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#111111' }} className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" fill="currentColor" />
                </div>
                <span className="text-white text-lg font-bold">Toolify</span>
              </div>
              <p style={{ color: '#9ca3af' }} className="text-sm leading-relaxed">
                Free online tools for everyone.<br />
                No registration, no limits.<br />
                Process files instantly in your browser.
              </p>
            </div>

            {/* PDF Tools */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-4">PDF Tools</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Image to PDF', href: '/image-to-pdf' },
                  { label: 'Merge PDF', href: '/merge-pdf' },
                  { label: 'Split PDF', href: '/split-pdf' },
                  { label: 'PDF to Word', href: '/pdf-to-word' },
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
              <h3 className="text-white font-semibold text-sm mb-4">Image Tools</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Compress Image', href: '/compress-image' },
                  { label: 'Resize Image', href: '/resize-image' },
                  { label: 'Convert Image', href: '/convert-image' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} style={{ color: '#9ca3af' }} className="text-sm hover:text-white transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Other Tools */}
            <div>
              <h3 className="text-white font-semibold text-sm mb-4">Other Tools</h3>
              <ul className="space-y-3">
                {[
                  { label: 'Word Counter', href: '/word-counter' },
                  { label: 'Text Case Converter', href: '/text-case' },
                  { label: 'Percentage Calculator', href: '/percentage-calculator' },
                  { label: 'Age Calculator', href: '/age-calculator' },
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
        </div>
      </footer>
    </main>
  )
}
