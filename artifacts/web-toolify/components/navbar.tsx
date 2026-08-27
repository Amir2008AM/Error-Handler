'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { ToolIcon } from './tool-card'
import { useI18n } from '@/lib/i18n/context'
import { tools, type ToolCategory } from '@/lib/tools'
import { Logo } from './logo'

type CategoryNavItem = {
  key: 'nav.pdf' | 'nav.security' | 'nav.converter' | 'nav.image' | 'nav.text' | 'nav.calculator'
  category: ToolCategory
  href: string
}

const categoryNavItems: CategoryNavItem[] = [
  { key: 'nav.pdf', category: 'PDF Tools', href: '/category/pdf-tools' },
  { key: 'nav.security', category: 'Security Tools', href: '/category/security-tools' },
  { key: 'nav.converter', category: 'Converters', href: '/category/converters' },
  { key: 'nav.image', category: 'Image Tools', href: '/category/image-tools' },
  { key: 'nav.text', category: 'Text Tools', href: '/category/text-tools' },
  { key: 'nav.calculator', category: 'Calculators', href: '/category/calculators' },
]

const pdfMegaMenuGroups = [
  { label: 'Organize PDF', slugs: ['merge-pdf', 'split-pdf', 'remove-pages', 'extract-pages', 'organize-pdf', 'scan-to-pdf'] },
  { label: 'Optimize PDF', slugs: ['compress-pdf', 'repair-pdf', 'ocr-pdf'] },
  { label: 'Convert to PDF', slugs: ['jpg-to-pdf', 'word-to-pdf', 'ppt-to-pdf', 'excel-to-pdf', 'html-to-pdf'] },
  { label: 'Convert from PDF', slugs: ['pdf-to-jpg', 'pdf-to-word', 'pdf-to-ppt', 'pdf-to-excel', 'pdf-to-pdfa'] },
  { label: 'Edit PDF', slugs: ['rotate-pdf', 'page-numbers', 'watermark-pdf', 'crop-pdf', 'pdf-editor', 'pdf-forms'] },
  { label: 'PDF Security', slugs: ['unlock-pdf', 'protect-pdf', 'sign-pdf', 'redact-pdf', 'compare-pdf'] },
]

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openCategory, setOpenCategory] = useState<ToolCategory | null>(null)
  const [mobileCategory, setMobileCategory] = useState<ToolCategory | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const { t } = useI18n()

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenCategory(null)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenCategory(null)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function toggleCategory(category: ToolCategory) {
    setOpenCategory((current) => (current === category ? null : category))
  }

  function closeMobileMenu() {
    setMobileOpen(false)
    setMobileCategory(null)
  }

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm" style={{ willChange: 'transform' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/" className="min-w-0 shrink-0" aria-label="ToolifyPDF home">
            <Logo />
          </Link>

          {/* Desktop Nav */}
          <nav ref={navRef} className="hidden lg:flex items-center gap-5" aria-label="Main navigation">
            {categoryNavItems.map(({ key, category, href }) => {
              const isOpen = openCategory === category
              const menuId = `desktop-menu-${category.toLowerCase().replace(/\s+/g, '-')}`
              const categoryTools = tools.filter((tool) => tool.category === category)

              return (
                <div key={key} className="relative">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    aria-haspopup="true"
                    aria-expanded={isOpen}
                    aria-controls={menuId}
                    onClick={() => toggleCategory(category)}
                  >
                    {t(key)}
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      id={menuId}
                      role="menu"
                      aria-label={`${t(key)} tools`}
                      className={category === 'PDF Tools'
                        ? 'absolute left-1/2 top-full mt-3 w-[calc(100vw-2rem)] max-w-[1080px] -translate-x-1/2 rounded-xl border border-border bg-white p-6 shadow-lg shadow-slate-900/10'
                        : 'absolute right-0 top-full mt-3 w-72 rounded-xl border border-border bg-white p-3 shadow-lg shadow-slate-900/10'}
                    >
                      {category === 'PDF Tools' ? (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 lg:grid-cols-6">
                          {pdfMegaMenuGroups.map((group) => {
                            const groupTools = group.slugs.map((slug) => tools.find((tool) => tool.slug === slug)).filter((tool): tool is (typeof tools)[number] => Boolean(tool))
                            return (
                              <div key={group.label} className="flex flex-col gap-2">
                                <div className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>
                                {groupTools.map((tool) => (
                                  <Link key={`${group.label}-${tool.slug}`} href={`/${tool.slug}`} role="menuitem" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-primary" onClick={() => setOpenCategory(null)}>
                                    <ToolIcon icon={tool.icon} className="h-4 w-4 shrink-0" />
                                    <span className="truncate">{tool.name}</span>
                                  </Link>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center justify-between border-b border-border px-2 pb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(key)}</span>
                            <Link href={href} role="menuitem" className="text-xs font-medium text-primary hover:underline" onClick={() => setOpenCategory(null)}>View all</Link>
                          </div>
                          <div className="grid gap-0.5">
                            {categoryTools.map((tool) => (
                              <Link key={tool.slug} href={`/${tool.slug}`} role="menuitem" className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-muted hover:text-primary" onClick={() => setOpenCategory(null)}>
                                <ToolIcon icon={tool.icon} className="h-4 w-4 shrink-0" />
                                {tool.name}
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            <Link
              href="/blog"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              {t('nav.blog')}
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              About
            </Link>
            <Link
              href="/contact-us"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
            >
              Contact
            </Link>
          </nav>

          {/* Mobile: menu */}
          <div className="lg:hidden flex items-center gap-1">
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
        <div className="lg:hidden border-t border-border bg-white px-4 py-4">
          <div className="space-y-1">
            {categoryNavItems.map(({ key, category, href }) => {
              const isOpen = mobileCategory === category
              const menuId = `mobile-menu-${category.toLowerCase().replace(/\s+/g, '-')}`

              return (
                <div key={key}>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="flex min-h-11 flex-1 items-center gap-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      aria-expanded={isOpen}
                      aria-controls={menuId}
                      onClick={() => setMobileCategory(isOpen ? null : category)}
                    >
                      {t(key)}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                    <Link
                      href={href}
                      className="px-2 text-xs text-primary hover:underline"
                      onClick={closeMobileMenu}
                    >
                      View all
                    </Link>
                  </div>
                  {isOpen && (
                    <div id={menuId} className="mb-1 ml-3 border-l border-border pl-3">
                      {tools
                        .filter((tool) => tool.category === category)
                        .map((tool) => (
                          <Link
                            key={tool.slug}
                            href={`/${tool.slug}`}
                            onClick={closeMobileMenu}
                            className="flex min-h-10 items-center gap-2 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ToolIcon icon={tool.icon} className="h-4 w-4 shrink-0" />
                            {tool.name}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <Link
            href="/about"
            onClick={closeMobileMenu}
            className="block min-h-11 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="/contact-us"
            onClick={closeMobileMenu}
            className="block min-h-11 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </div>
      )}
    </header>
  )
}
