import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Blog — PDF & Image Tips and Guides | Toolify' },
  description: 'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools. Learn how to work smarter with documents.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/blog',
  },
  openGraph: {
    title: 'Blog — PDF & Image Tips and Guides | Toolify',
    description: 'Tips, guides, and tutorials on PDF processing, image conversion, and free online tools. Learn how to work smarter with documents.',
    url: 'https://www.toolifypdf.online/blog',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Blog — PDF & Image Tips and Guides | Toolify' }],
  },
}

/* ── Pillar article (always pinned first) ─────────────────────────────── */

const pillarArticle = {
  slug: 'understanding-pdf-your-ultimate-guide-to-pdf-files',
  title: 'Understanding PDF: Your Complete Guide to PDF Files',
  description:
    'Dive into our ultimate guide on PDF files. Discover everything you need to know about the PDF format, its features, security, cross-platform compatibility, and how to use it effectively in 2026.',
  date: 'July 5, 2026',
  readTime: '12 min read',
  category: 'Ultimate Guide',
  gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
  color: '#92400e',
  accentColor: '#f59e0b',
}

/* ── Regular articles ─────────────────────────────────────────────────── */

const articles = [
  {
    slug: 'how-to-merge-pdf-files-online',
    title: 'How to Merge PDF Files Online for Free',
    description:
      'Learn how to merge PDF files online for free. Combine multiple PDF documents into one organized file quickly, securely, and without installing software.',
    date: 'June 5, 2026',
    readTime: '5 min read',
    category: 'PDF Guide',
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
  },
  {
    slug: 'how-to-compress-pdf-online',
    title: 'How to Compress PDF Online for Free',
    description:
      'Learn how to compress PDF files online for free without losing quality. Reduce PDF file size quickly, securely, and easily — no software required.',
    date: 'June 2, 2026',
    readTime: '4 min read',
    category: 'PDF Guide',
    color: '#e85d35',
    gradient: 'linear-gradient(135deg, #c0392b 0%, #e85d35 100%)',
  },
  {
    slug: 'how-to-convert-jpg-to-pdf',
    title: 'How to Convert JPG to PDF Online for Free',
    description:
      'Learn how to convert JPG images to PDF files for free online. Combine your JPGs into high-quality PDFs in seconds — no sign-up required.',
    date: 'June 3, 2026',
    readTime: '3 min read',
    category: 'Image Guide',
    color: '#6d28d9',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  },
  {
    slug: 'how-to-lock-and-unlock-pdf',
    title: 'How to Lock and Unlock PDF Files Online for Free',
    description:
      'Protect sensitive documents with passwords or remove passwords from PDFs you own — fast, secure, and no sign-up required.',
    date: 'June 4, 2026',
    readTime: '4 min read',
    category: 'PDF Security',
    color: '#9333ea',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)',
  },
  {
    slug: 'how-to-convert-pdf-to-word',
    title: 'How to Convert PDF to Word for Free',
    description:
      'Learn 3 easy ways to convert a PDF into an editable Word document at no cost — online tools, Google Docs, and Microsoft Word.',
    date: 'June 1, 2026',
    readTime: '5 min read',
    category: 'PDF Guide',
    color: '#3b6ef5',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b6ef5 100%)',
  },
  {
    slug: 'how-to-convert-word-to-pdf',
    title: 'How to Convert Word to PDF Online for Free',
    description:
      'Follow this simple guide to preserve formatting, improve security, and share your Word documents as PDF files easily.',
    date: 'June 1, 2026',
    readTime: '3 min read',
    category: 'Word Guide',
    color: '#0d9488',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
  },
  {
    slug: 'how-to-split-pdf-online',
    title: 'How to Split a PDF File Online for Free',
    description:
      'Extract individual pages, separate sections, or divide a large PDF into smaller files online in seconds — no software or account needed.',
    date: 'June 6, 2026',
    readTime: '4 min read',
    category: 'PDF Guide',
    color: '#16a34a',
    gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
  },
  {
    slug: 'how-to-reduce-image-file-size',
    title: 'How to Reduce Image File Size Without Losing Quality',
    description:
      'Compress, resize, crop, and convert images to reduce file size without visible quality loss — practical methods for web, email, and storage.',
    date: 'June 7, 2026',
    readTime: '5 min read',
    category: 'Image Guide',
    color: '#db2777',
    gradient: 'linear-gradient(135deg, #be185d 0%, #db2777 100%)',
  },
  {
    slug: 'pdf-vs-word-which-format-to-use',
    title: 'PDF vs Word: Which Document Format Should You Use?',
    description:
      'A practical comparison of PDF and Word — their key differences, when each format is the right choice, and how to convert between them.',
    date: 'June 9, 2026',
    readTime: '4 min read',
    category: 'Document Guide',
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)',
  },
  {
    slug: 'how-to-watermark-pdf-documents',
    title: 'How to Add a Watermark to a PDF Document',
    description:
      'Mark PDFs as confidential, draft, or sample using a text watermark. Covers positioning, opacity, use cases, and step-by-step instructions.',
    date: 'June 10, 2026',
    readTime: '3 min read',
    category: 'PDF Security',
    color: '#0891b2',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
  },
  {
    slug: 'how-to-convert-excel-to-pdf',
    title: 'How to Convert Excel to PDF Online for Free',
    description:
      'Convert Excel spreadsheets to PDF for sharing, submission, and archiving. Covers formatting tips, common issues, and when PDF is better than XLS.',
    date: 'June 11, 2026',
    readTime: '4 min read',
    category: 'Spreadsheet Guide',
    color: '#e11d48',
    gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
  },
  {
    slug: 'how-to-convert-powerpoint-to-pdf',
    title: 'How to Convert PowerPoint to PDF Online for Free',
    description:
      'Share presentations in a universally readable format. Learn what gets preserved in conversion, what does not, and how to avoid common issues.',
    date: 'June 12, 2026',
    readTime: '3 min read',
    category: 'Presentation Guide',
    color: '#65a30d',
    gradient: 'linear-gradient(135deg, #4d7c0f 0%, #65a30d 100%)',
  },
  {
    slug: 'how-to-add-page-numbers-to-pdf',
    title: 'How to Add Page Numbers to a PDF Online for Free',
    description:
      'Add page numbers to any PDF document in seconds. Covers positioning, alignment, starting number, and best practices by document type.',
    date: 'June 13, 2026',
    readTime: '5 min read',
    category: 'PDF Guide',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
  },
  {
    slug: 'how-to-protect-pdf-documents',
    title: 'How to Protect PDF Documents with a Password',
    description:
      'Add password encryption to sensitive PDF files before sharing. Covers how PDF protection works, choosing strong passwords, and when to unlock files.',
    date: 'June 14, 2026',
    readTime: '4 min read',
    category: 'PDF Security',
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
  },
  {
    slug: 'common-pdf-problems-and-solutions',
    title: '8 Common PDF Problems and How to Fix Them',
    description:
      'Practical solutions to the most frequent PDF issues — files too large to send, forgotten passwords, unselectable text, corrupted files, and more.',
    date: 'June 15, 2026',
    readTime: '5 min read',
    category: 'Troubleshooting',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
  },
]

/* ── Pillar card (featured, pinned) ───────────────────────────────────── */

function PillarArticleCard() {
  return (
    <Link
      href={`/blog/${pillarArticle.slug}`}
      className="group block rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white border-2 border-amber-200"
      aria-label={`Featured: ${pillarArticle.title}`}
    >
      {/* Gradient header — taller than regular cards */}
      <div
        className="px-8 py-9 relative overflow-hidden"
        style={{ background: pillarArticle.gradient }}
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
            {/* Ultimate Guide badge */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-white text-amber-700 shadow-sm">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              Ultimate Guide
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white">
              Pinned
            </span>
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-white leading-tight mb-4 group-hover:opacity-90 transition-opacity max-w-2xl">
            {pillarArticle.title}
          </h2>

          {/* Description */}
          <p className="text-white/85 text-sm md:text-base leading-relaxed max-w-2xl">
            {pillarArticle.description}
          </p>
        </div>
      </div>

      {/* Card footer */}
      <div className="px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-amber-50 border-t border-amber-200">
        <div className="flex flex-wrap items-center gap-3 text-sm text-amber-800">
          <time>{pillarArticle.date}</time>
          <span aria-hidden="true">·</span>
          <span>{pillarArticle.readTime}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium">ToolifyPDF</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-sm font-bold group-hover:gap-3 transition-all duration-200"
          style={{ color: pillarArticle.color }}
        >
          Read the Full Guide
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </Link>
  )
}

/* ── Regular article card ─────────────────────────────────────────────── */

function ArticleCard({ article }: { article: typeof articles[number] }) {
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

        {/* Pinned pillar article — full-width, above the grid */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 rounded-full bg-amber-400" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">Featured Guide</p>
          </div>
          <PillarArticleCard />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-2">All Articles</p>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Regular articles grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>

      </section>
    </main>
  )
}
