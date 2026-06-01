import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Blog | ToolifyPDF',
  description:
    'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools — from the ToolifyPDF team.',
  openGraph: {
    title: 'Blog | ToolifyPDF',
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
    color: '#3b6ef5',
  },
]

function PdfIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="3" fill="white" fillOpacity="0.25" />
      <rect x="4" y="2" width="16" height="20" rx="3" stroke="white" strokeWidth="1.5" />
      <path d="M8 8h8M8 12h8M8 16h5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="15" y="14" width="9" height="10" rx="2" fill="white" fillOpacity="0.9" />
      <text x="19.5" y="21.5" textAnchor="middle" fontSize="5.5" fontWeight="800" fill="#3b6ef5" fontFamily="system-ui">PDF</text>
    </svg>
  )
}

function ArticleCard({ article }: { article: typeof articles[number] }) {
  return (
    <Link
      href={`/blog/${article.slug}`}
      className="group flex flex-col rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-250 hover:-translate-y-1 bg-white border border-border"
    >
      {/* Colored header */}
      <div
        className="px-6 py-7 flex flex-col gap-4"
        style={{ background: `linear-gradient(135deg, ${article.color} 0%, #5a84f7 100%)` }}
      >
        <div className="flex items-start justify-between">
          <PdfIcon />
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
            {article.category}
          </span>
        </div>
        <h2 className="text-lg font-bold text-white leading-snug group-hover:opacity-90 transition-opacity">
          {article.title}
        </h2>
      </div>

      {/* White lower section */}
      <div className="px-6 py-5 flex flex-col flex-1 gap-3">
        <p className="text-xs text-muted-foreground">
          {article.date} &middot; {article.readTime}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed flex-1">
          {article.description}
        </p>
        <span
          className="text-sm font-semibold inline-flex items-center gap-1 transition-gap duration-200 group-hover:gap-2"
          style={{ color: article.color }}
        >
          Read More
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
        </span>
      </div>
    </Link>
  )
}

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero header */}
      <div className="bg-background border-b border-border py-14 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">Blog</h1>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          Tips, guides, and tutorials on PDF processing, image conversion, and free online tools.
        </p>
      </div>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      </section>
    </main>
  )
}
