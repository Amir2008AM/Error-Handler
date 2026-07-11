import type { Metadata } from 'next'
import Link from 'next/link'
import { PILLAR_ARTICLES, BLOG_ARTICLES, type BlogArticle } from '@/lib/blog'

export const metadata: Metadata = {
  title: { absolute: 'Blog — PDF & Image Tips and Guides | Toolify' },
  description: 'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools. Learn how to work smarter with documents.',
  alternates: {
    canonical: 'https://toolifypdf.online/blog',
  },
  openGraph: {
    title: 'Blog — PDF & Image Tips and Guides | Toolify',
    description: 'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools. Learn how to work smarter with documents.',
    url: 'https://toolifypdf.online/blog',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Blog — PDF & Image Tips and Guides | Toolify' }],
  },
}

/* ── Pillar card (featured, pinned) ───────────────────────────────────── */

function PillarArticleCard({ article }: { article: BlogArticle }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group block rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white border-2"
      style={{ borderColor: `${article.color}33` }}
      aria-label={`Featured: ${article.title}`}
    >
      {/* Gradient header — taller than regular cards */}
      <div
        className="px-8 py-9 relative overflow-hidden"
        style={{ background: article.gradient }}
      >
        {/* Decorative background circle */}
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ backgroundColor: '#fff' }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-16 -left-8 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: '#fff' }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {/* Category badge */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white shadow-sm" style={{ color: article.color }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {article.category}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
              Pinned
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight mb-4 group-hover:opacity-90 transition-opacity max-w-2xl">
            {article.title}
          </h2>

          {/* Description */}
          <p className="text-white/85 text-sm md:text-base leading-relaxed max-w-2xl">
            {article.description}
          </p>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t" style={{ backgroundColor: `${article.color}0d`, borderColor: `${article.color}33` }}>
        <div className="flex flex-wrap items-center gap-3 text-sm" style={{ color: article.color }}>
          <time>{article.date}</time>
          <span aria-hidden="true">·</span>
          <span>{article.readTime}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium">ToolifyPDF</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all duration-200"
          style={{ color: article.color }}
        >
          Read the Full Guide
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  )
}

/* ── Regular article card ─────────────────────────────────────────────── */

function ArticleCard({ article }: { article: BlogArticle }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-250 hover:-translate-y-1 bg-white border border-border"
    >
      <div className="px-6 py-7 flex flex-col gap-4" style={{ background: article.gradient }}>
        <div className="flex items-start justify-between">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="4" y="2" width="16" height="20" rx="3" fill="white" fillOpacity="0.25" />
            <rect x="4" y="2" width="16" height="20" rx="3" stroke="white" strokeWidth="1.5" />
            <path d="M8 8h8M8 12h8M8 16h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="15" y="14" width="9" height="10" rx="2" fill="white" fillOpacity="0.9" />
            <text x="19.5" y="21.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill={article.color} fontFamily="system-ui">PDF</text>
          </svg>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
            {article.category}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white leading-snug group-hover:opacity-90 transition-opacity">
          {article.title}
        </h2>
      </div>

      <div className="px-6 py-5 flex flex-col flex-1 gap-3">
        <p className="text-xs text-muted-foreground">
          {article.date} &middot; {article.readTime}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {article.description}
        </p>
        <span
          className="text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all duration-200"
          style={{ color: article.color }}
        >
          Read More
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  )
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Page header */}
      <div className="bg-background border-b border-border py-14 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Blog</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Tips, guides, and tutorials on PDF processing, image conversion, and free online tools.
        </p>
      </div>

      <section className="max-w-6xl mx-auto px-4 py-12 space-y-10">

        {/* Pinned pillar articles — full-width, above the grid */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-400" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Featured Guides</p>
          </div>
          {PILLAR_ARTICLES.map((article) => (
            <PillarArticleCard key={article.slug} article={article} />
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">All Articles</p>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Regular articles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {BLOG_ARTICLES.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>

      </section>
    </main>
  )
}
