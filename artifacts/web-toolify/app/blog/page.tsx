import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog | Toolify',
  description:
    'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools — from the Toolify team.',
  openGraph: {
    title: 'Blog | Toolify',
    description:
      'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools.',
    type: 'website',
  },
}

const articles = [
  {
    slug: 'how-to-convert-pdf-to-word',
    title: 'How to Convert PDF to Word for Free',
    description:
      'Learn 3 easy ways to convert a PDF into an editable Word document at no cost — online tools, Google Docs, and Microsoft Word.',
    date: 'June 1, 2026',
    readTime: '8 min read',
    category: 'PDF Guide',
  },
]

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <Link href="/" itemProp="item" className="hover:text-foreground transition-colors">
                <span itemProp="name">Home</span>
              </Link>
              <meta itemProp="position" content="1" />
            </li>
            <li aria-hidden="true" className="text-border">›</li>
            <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              <span itemProp="name" className="text-foreground font-medium">Blog</span>
              <meta itemProp="position" content="2" />
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-3">Blog</h1>
          <p className="text-muted-foreground leading-relaxed">
            Tips, guides, and tutorials on PDF processing, image conversion, and getting the most out of Toolify&apos;s free online tools.
          </p>
        </header>

        {/* Article cards */}
        <div className="space-y-5">
          {articles.map((article) => (
            <Link
              key={article.slug}
              href={`/blog/${article.slug}`}
              className="group block border border-border rounded-xl p-6 bg-white transition-all duration-200 hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: '#eff3ff', color: '#3b6ef5' }}>
                      {article.category}
                    </span>
                    <span className="text-xs text-muted-foreground">{article.date}</span>
                    <span className="text-xs text-muted-foreground">· {article.readTime}</span>
                  </div>
                  <h2 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {article.description}
                  </p>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors mt-1 flex-shrink-0 text-lg">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
