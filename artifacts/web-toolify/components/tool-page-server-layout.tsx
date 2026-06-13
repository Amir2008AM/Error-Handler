import Link from 'next/link'
import {
  FileText, Image, Minimize2, FilePlus2, Scissors,
  Expand, RefreshCw, Type, CaseSensitive, Percent,
  Calendar, AlignLeft, ArrowRightLeft, Calculator,
  ImageIcon, ChevronRight, Lock, Clock, Zap,
  RotateCw, Droplets, Crop, Hash, LayoutList, Wrench,
  Unlock, PenTool, Table, Code, ScanText, FileSearch,
  FileArchive, Shield, Presentation,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ToolCard } from './tool-card'
import { AdBanner } from './ad-banner'
import { tools, getToolBySlug } from '@/lib/tools'
import type { Tool } from '@/lib/tools'
import { ToolSeoContent } from './tool-seo-content'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, Image, Minimize2, FilePlus2, Scissors,
  Expand, RefreshCw, Type, CaseSensitive, Percent,
  Calendar, AlignLeft, ArrowRightLeft, Calculator, ImageIcon,
  RotateCw, Droplets, Crop, Hash, LayoutList, Wrench,
  Lock, Unlock, PenTool, Table, Code, ScanText, FileSearch,
  FileArchive, Shield, Presentation,
}

const CATEGORY_LABELS: Record<string, string> = {
  'PDF Tools': 'PDF Tools',
  'Security Tools': 'Security Tools',
  'Converters': 'Converters',
  'Image Tools': 'Image Tools',
  'Text Tools': 'Text Tools',
  'Calculators': 'Calculators',
}

const TRUST_BADGES = [
  { icon: Lock,  label: 'Files deleted after processing' },
  { icon: Zap,   label: 'Instant processing' },
  { icon: Clock, label: 'No registration needed' },
]

type Props = (
  | { tool: Tool; toolId?: never; title?: never; description?: never }
  | { toolId: string; title?: string; description?: string; tool?: never }
) & { children: React.ReactNode }

export function ToolPageServerLayout(props: Props) {
  const { children } = props

  const resolvedTool: Tool | undefined =
    'tool' in props && props.tool
      ? props.tool
      : getToolBySlug((props as { toolId: string }).toolId)

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

  const categoryLabel = CATEGORY_LABELS[tool.category] ?? tool.category

  const BASE_URL = 'https://www.toolifypdf.online'
  const toolUrl  = `${BASE_URL}/${tool.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: displayName,
    description: displayDescription,
    url: toolUrl,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: categoryLabel, item: `${BASE_URL}/?category=${encodeURIComponent(tool.category)}` },
        { '@type': 'ListItem', position: 3, name: displayName, item: toolUrl },
      ],
    },
  }

  return (
    <main className="min-h-screen bg-background">
      {/* JSON-LD — per-tool structured data for Google Search */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb — server-rendered for SEO */}
      <div className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <nav aria-label="breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
            <Link
              href={`/?category=${encodeURIComponent(tool.category)}`}
              className="hover:text-foreground transition-colors"
            >
              {categoryLabel}
            </Link>
            <ChevronRight className="w-3 h-3" aria-hidden="true" />
            <span className="text-foreground font-medium">{displayName}</span>
          </nav>
        </div>
      </div>

      {/* Hero Header — H1 server-rendered for SEO */}
      <header className={cn('py-8', tool.bgColor)}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0" aria-hidden="true">
              <Icon className={cn('w-7 h-7', tool.color)} />
            </div>
            <div>
              <h1
                className="text-2xl md:text-3xl font-bold text-foreground"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {displayName}
              </h1>
              <p className="text-muted-foreground mt-1 max-w-xl">{displayDescription}</p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-4 mt-5" aria-label="Features">
            {TRUST_BADGES.map(({ icon: BadgeIcon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-white/70 px-3 py-1.5 rounded-full"
              >
                <BadgeIcon className="w-3 h-3" aria-hidden="true" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Tool Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <AdBanner slot="6978025975" format="horizontal" className="mb-6" />

        {children}

        <AdBanner slot="6978025975" format="horizontal" className="mt-8" />

        {/* Related Tools — server-rendered for SEO */}
        {relatedTools.length > 0 && (
          <section aria-label="Related tools" className="mt-10">
            <h2 className="text-lg font-bold text-foreground mb-4">Related Tools</h2>
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
