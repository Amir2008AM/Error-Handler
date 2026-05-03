'use client'

import Link from 'next/link'
import {
  FileText, Image, Minimize2, FilePlus2, Scissors,
  Expand, RefreshCw, Type, CaseSensitive, Percent,
  Calendar, AlignLeft, ArrowRightLeft, Calculator,
  ImageIcon, ChevronRight, Lock, Clock, Zap,
  RotateCw, Droplets, Crop, Hash, LayoutList, Wrench,
  Unlock, PenTool, Table, Code, ScanText, FileSearch,
  FileArchive, Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdBanner } from './ad-banner'
import { ToolCard } from './tool-card'
import { tools, getToolBySlug } from '@/lib/tools'
import type { Tool } from '@/lib/tools'
import { useI18n } from '@/lib/i18n/context'
import type { TranslationKey } from '@/lib/i18n/translations'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Image, Minimize2, FilePlus2, Scissors,
  Expand, RefreshCw, Type, CaseSensitive, Percent,
  Calendar, AlignLeft, ArrowRightLeft, Calculator, ImageIcon,
  RotateCw, Droplets, Crop, Hash, LayoutList, Wrench,
  Lock, Unlock, PenTool, Table, Code, ScanText, FileSearch,
  FileArchive, Shield,
}

const CATEGORY_KEY_MAP: Record<string, TranslationKey> = {
  'PDF Tools': 'home.pdfTools',
  'Security Tools': 'home.securityTools',
  'Converters': 'home.converters',
  'OCR Tools': 'home.ocrTools',
  'Image Tools': 'home.imageTools',
  'Text Tools': 'home.textTools',
  'Calculators': 'home.calculators',
}

type ToolPageLayoutProps = (
  | { tool: Tool; toolId?: never; title?: never; description?: never }
  | { toolId: string; title?: string; description?: string; tool?: never }
) & { children: React.ReactNode }

export function ToolPageLayout(props: ToolPageLayoutProps) {
  const { children } = props
  const { t } = useI18n()

  const resolvedTool: Tool | undefined =
    'tool' in props && props.tool
      ? props.tool
      : getToolBySlug(props.toolId as string)

  if (!resolvedTool) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Tool not found.</p>
      </main>
    )
  }

  const tool = resolvedTool
  const displayName = ('title' in props && props.title) ? props.title : tool.name
  const displayDescription = ('description' in props && props.description) ? props.description : tool.longDescription

  const Icon = iconMap[tool.icon] ?? FileText
  const relatedTools = tools
    .filter((t) => t.id !== tool.id && t.category === tool.category)
    .slice(0, 4)

  const categoryKey = CATEGORY_KEY_MAP[tool.category]

  const trustBadges = [
    { icon: Lock, key: 'common.filesDeleted' as TranslationKey },
    { icon: Zap, key: 'common.instantProcessing' as TranslationKey },
    { icon: Clock, key: 'common.noRegistration' as TranslationKey },
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              {t('common.home')}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link
              href={`/?category=${encodeURIComponent(tool.category)}`}
              className="hover:text-foreground transition-colors"
            >
              {categoryKey ? t(categoryKey) : tool.category}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{displayName}</span>
          </nav>
        </div>
      </div>

      {/* Header */}
      <div className={cn('py-8', tool.bgColor)}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
              <Icon className={cn('w-7 h-7', tool.color)} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
                {displayName}
              </h1>
              <p className="text-muted-foreground mt-1 max-w-xl">{displayDescription}</p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-4 mt-5">
            {trustBadges.map(({ icon: BadgeIcon, key }) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/70 px-3 py-1.5 rounded-full">
                <BadgeIcon className="w-3 h-3" />
                {t(key)}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tool Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AdBanner slot="6978025975" format="horizontal" className="mb-6" />

        {children}

        <AdBanner slot="6978025975" format="horizontal" className="mt-8" />

        {/* Related Tools */}
        {relatedTools.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-bold text-foreground mb-4">{t('tool.relatedTools')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {relatedTools.map((t) => (
                <ToolCard key={t.id} tool={t} compact />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
