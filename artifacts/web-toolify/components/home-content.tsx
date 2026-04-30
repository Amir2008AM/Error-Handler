'use client'

import { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, FileText, Image, AlignLeft, ArrowRightLeft, Calculator, Zap } from 'lucide-react'
import Link from 'next/link'
import { ToolCard } from './tool-card'
import { AdBanner } from './ad-banner'
import { tools, categories, categoryMeta, searchTools, type ToolCategory } from '@/lib/tools'
import { cn } from '@/lib/utils'

const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Image,
  AlignLeft,
  ArrowRightLeft,
  Calculator,
}

export function HomeContent() {
  const searchParams = useSearchParams()
  const urlCategory = searchParams.get('category') as ToolCategory | null
  const urlSearch = searchParams.get('search') ?? ''

  const [searchQuery, setSearchQuery] = useState(urlSearch)
  const [activeCategory, setActiveCategory] = useState<ToolCategory | 'All' | null>(urlCategory ?? 'All')

  const displayedTools = useMemo(() => {
    if (searchQuery.trim()) {
      return searchTools(searchQuery)
    }
    if (activeCategory && activeCategory !== 'All') {
      return tools.filter((t) => t.category === activeCategory)
    }
    return tools
  }, [searchQuery, activeCategory])

  return (
    <main className="flex-1 bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                Toolify
              </span>
            </Link>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {categories.map((cat) => {
                const meta = categoryMeta[cat]
                const CatIcon = categoryIconMap[meta.icon] ?? FileText
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setActiveCategory(cat)
                      setSearchQuery('')
                    }}
                    className={cn(
                      'flex items-center gap-1.5 text-sm font-medium transition-colors',
                      activeCategory === cat ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <CatIcon className="w-4 h-4" />
                    {cat.replace(' Tools', '').replace('s', '')}
                  </button>
                )
              })}
            </nav>

            {/* Auth buttons */}
            <div className="flex items-center gap-2">
              <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
                Login
              </button>
              <button className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-lg hover:bg-primary/90 transition-colors">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Online Tools for PDF & Image Lovers
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty leading-relaxed">
            Free PDF tools to merge, split, compress, and convert PDFs. Transform images to JPG or PDF. No installation or registration required.
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
              All Tools
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
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tools..."
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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        {searchQuery && (
          <p className="text-sm text-muted-foreground mb-6 text-center">
            {displayedTools.length} result{displayedTools.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
          </p>
        )}

        {displayedTools.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-lg">No tools found for &quot;{searchQuery}&quot;</p>
            <p className="text-sm mt-2">Try a different keyword or browse all tools</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setActiveCategory('All')
              }}
              className="mt-4 text-primary font-medium text-sm hover:underline"
            >
              View all tools
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
      <footer className="bg-white border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="text-sm font-semibold text-foreground">Toolify</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Free online tools for PDF and image processing. No registration required.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
