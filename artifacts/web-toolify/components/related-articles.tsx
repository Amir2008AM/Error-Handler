import Link from 'next/link'
import { ALL_BLOG_ARTICLES } from '@/lib/blog'

export function RelatedArticles({ slugs }: { slugs: string[] }) {
  const articles = slugs
    .map((slug) => ALL_BLOG_ARTICLES.find((a) => a.slug === slug))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))

  if (articles.length === 0) return null

  return (
    <section className="mb-12 pt-8 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-5">Related Articles</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="block border border-border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <span
              className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-2"
              style={{ backgroundColor: '#eff6ff', color: article.color }}
            >
              {article.category}
            </span>
            <h3 className="font-semibold text-foreground text-sm leading-snug mb-1">{article.title}</h3>
            <p className="text-xs text-muted-foreground">{article.readTime}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
