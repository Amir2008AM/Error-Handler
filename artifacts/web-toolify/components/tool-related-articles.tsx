import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getRelatedArticlesForTool } from '@/lib/tool-articles'

/**
 * Related Articles & Guides for a tool page.
 * Renders nothing when the tool has no genuinely relevant articles mapped in lib/tool-articles.ts.
 */
export function ToolRelatedArticles({ toolSlug }: { toolSlug: string }) {
  const articles = getRelatedArticlesForTool(toolSlug)

  if (articles.length === 0) return null

  return (
    <section aria-labelledby="related-articles-heading" className="mt-12 pt-8 border-t border-border">
      <h2 id="related-articles-heading" className="text-lg font-bold text-foreground">
        Related Articles &amp; Guides
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        In-depth guides covering this tool and closely related topics.
      </p>

      <div
        className={`mt-5 grid gap-4 sm:grid-cols-2 ${articles.length >= 3 ? 'lg:grid-cols-3' : ''}`}
      >
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ borderColor: `${article.color}33` }}
          >
            <div className="px-5 py-4" style={{ background: article.gradient }}>
              <span className="inline-block rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
                {article.category}
              </span>
              <h3 className="mt-2.5 text-sm font-bold leading-snug text-white text-pretty">
                {article.title}
              </h3>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
              <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {article.description}
              </p>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">{article.readTime}</span>
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: article.color }}
                >
                  Read the guide
                  <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
