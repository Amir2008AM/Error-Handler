import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { AdBanner } from '@/components/ad-banner'
import { ReadingProgress } from '@/components/reading-progress'
import { RelatedArticles } from '@/components/related-articles'

/* ─── Meta ─────────────────────────────────────────────────────────────── */

export const metadata: Metadata = {
  title: { absolute: 'Merge PDF and PDF: Combine Files for Free Online | ToolifyPDF' },
  description:
    'Need to merge pdf and pdf files? Discover how to combine PDF files for free online with our easy-to-follow guide. Start merging now!',
  alternates: { canonical: 'https://toolifypdf.online/blog/merge-pdf-and-pdf-combine-files-for-free-online' },
  openGraph: {
    title: 'Merge PDF and PDF: Combine Files for Free Online',
    description: 'Need to merge pdf and pdf files? Discover how to combine PDF files for free online with our easy-to-follow guide. Start merging now!',
    type: 'article',
    publishedTime: '2026-07-09T00:00:00.000Z',
    modifiedTime: '2026-07-09T00:00:00.000Z',
    url: 'https://toolifypdf.online/blog/merge-pdf-and-pdf-combine-files-for-free-online',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF and PDF: Combine Files for Free Online',
    description: 'Need to merge pdf and pdf files? Discover how to combine PDF files for free online with our easy-to-follow guide.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

/* ─── Structured data ───────────────────────────────────────────────────── */

const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Merge PDFs for Free - Combine PDF Files Online With the Best Free Tools',
  description:
    'A practical guide to merging PDF files for free online, comparing popular tools, explaining safe browser-based steps, and helping readers choose the right option.',
  image: {
    '@type': 'ImageObject',
    url: 'https://toolifypdf.online/og-image.jpg',
    width: 1200,
    height: 630,
  },
  datePublished: '2026-07-09T00:00:00.000Z',
  dateModified: '2026-07-12T00:00:00.000Z',
  author: {
    '@type': 'Organization',
    name: 'ToolifyPDF',
    url: 'https://toolifypdf.online/author/toolifypdf-team',
  },
  publisher: {
    '@type': 'Organization',
    name: 'ToolifyPDF',
    url: 'https://toolifypdf.online',
    logo: { '@type': 'ImageObject', url: 'https://toolifypdf.online/icon-512.png', width: 512, height: 512 },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://toolifypdf.online/blog/merge-pdf-and-pdf-combine-files-for-free-online',
  },
  articleSection: [
    'Key Highlights',
    'Introduction',
    'The Easiest Ways to Merge PDFs for Free Online',
    'How to Combine PDF Files Without Installing Software',
    'Security and Privacy',
    'Frequently Asked Questions',
  ],
  inLanguage: 'en-US',
  keywords:
    'merge pdf, pdf combiner, combine pdf files, merge pdf online, free pdf merger, pdf merge tool, quick pdf merging',
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can I merge all PDFs into one file without Adobe Acrobat?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. You can use a merge pdf tool in your browser instead of Adobe Acrobat. A browser-based pdf combiner lets you upload files, place them in order, and download one combined file without installing software.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which free online PDF merger supports larger file sizes?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Support for larger file sizes depends on the platform and its free version limits. Adobe allows up to 100 files and a combined total of 1,500 pages in its tool, while other best tools may set smaller size or task limits.',
      },
    },
    {
      '@type': 'Question',
      name: 'What steps should I follow to merge PDF documents securely?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Choose a trusted pdf merger, read its privacy policy, and use a secure internet connection. Avoid uploading confidential documents unless you understand how the service handles files on its servers and when those files are deleted.',
      },
    },
  ],
}

/* ─── Constants ─────────────────────────────────────────────────────────── */

const ACCENT = '#b91c1c'
const ACCENT_BG = '#fef2f2'
const ACCENT_BORDER = '#fecaca'

/* ─── TOC items ─────────────────────────────────────────────────────────── */

const TOC = [
  { id: 'key-highlights', label: 'Key Highlights' },
  { id: 'introduction', label: 'Introduction' },
  { id: 'easiest-ways', label: 'The Easiest Ways to Merge PDFs for Free Online' },
  { id: 'how-to-combine', label: 'How to Combine PDF Files Without Installing Software' },
  { id: 'security-privacy', label: 'Security and Privacy: Is It Safe to Merge PDFs Online?' },
  { id: 'quality-control', label: 'Quality Control – Does Combining PDFs Affect File Quality?' },
  { id: 'conclusion', label: 'Conclusion' },
  { id: 'faq', label: 'Frequently Asked Questions' },
]

/* ─── Sub-components ────────────────────────────────────────────────────── */

function ToolCard({
  number,
  name,
  intro,
  bullets,
}: {
  number: number
  name: string
  intro: string | string[]
  bullets: string[]
}) {
  const paragraphs = Array.isArray(intro) ? intro : [intro]
  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ backgroundColor: ACCENT_BG, borderBottom: `1px solid ${ACCENT_BORDER}` }}
      >
        <span
          className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: ACCENT }}
        >
          {number}
        </span>
        <h3 className="font-bold text-foreground text-base">{name}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-muted-foreground leading-relaxed">{p}</p>
        ))}
        <ul className="space-y-1.5 mt-2">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1 w-4 h-4 flex-shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_BG }}>
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                  <path d="M1.5 4l1.5 1.5L6.5 2" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <div className="px-5 py-4" style={{ backgroundColor: ACCENT_BG }}>
        <h3 className="font-semibold text-foreground text-sm leading-snug">{question}</h3>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{answer}</p>
      </div>
    </div>
  )
}

function ArticleImage({
  src,
  alt,
  caption,
  priority = false,
}: {
  src: string
  alt: string
  caption?: string
  priority?: boolean
}) {
  return (
    <figure className="my-8 rounded-2xl overflow-hidden border border-border shadow-sm">
      <div className="relative w-full h-56 sm:h-72">
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 768px"
          className="object-cover"
          loading={priority ? 'eager' : 'lazy'}
          priority={priority}
        />
      </div>
      {caption && (
        <figcaption className="px-4 py-2.5 text-xs text-muted-foreground bg-muted/40 text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

function RelatedTools() {
  const tools = [
    { label: 'Merge PDF', href: '/merge-pdf', desc: 'Combine multiple PDFs into one file instantly.' },
    { label: 'Split PDF', href: '/split-pdf', desc: 'Extract or separate pages from a PDF.' },
    { label: 'Compress PDF', href: '/compress-pdf', desc: 'Reduce PDF file size without visible quality loss.' },
    { label: 'PDF to Word', href: '/pdf-to-word', desc: 'Convert a PDF into an editable Word document.' },
    { label: 'Organize PDF', href: '/organize-pdf', desc: 'Reorder and rearrange pages before merging.' },
    { label: 'Protect PDF', href: '/protect-pdf', desc: 'Add a password to keep your PDF secure.' },
  ]
  return (
    <section className="mb-10 pt-8 border-t border-border">
      <h2 className="text-xl font-bold text-foreground mb-1">Related PDF Tools</h2>
      <p className="text-sm text-muted-foreground mb-5">Free browser-based tools — no installation or account needed.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tools.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group flex items-start gap-3 border border-border rounded-xl p-4 hover:border-red-200 hover:shadow-sm transition-all bg-card"
          >
            <span
              className="mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: ACCENT_BG }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="1" width="9" height="12" rx="1.5" fill={ACCENT} fillOpacity="0.15" stroke={ACCENT} strokeWidth="1" />
                <path d="M5 5h5M5 7.5h5M5 10h3" stroke={ACCENT} strokeWidth="1" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-sm text-foreground group-hover:underline">{t.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function ArticlePage() {
  return (
    <>
      <ReadingProgress color={ACCENT} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="min-h-screen bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/Article">

          {/* ── Breadcrumb ── */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Merge PDF and PDF</li>
            </ol>
          </nav>

          {/* ── Header ── */}
          <header className="mb-10">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm"
                style={{ backgroundColor: ACCENT, color: '#fff' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Ultimate Guide
              </span>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: ACCENT_BG, color: ACCENT }}
              >
                PDF Guide
              </span>
            </div>

            {/* Title */}
            <h1
              className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4"
              itemProp="headline"
            >
              Merge PDFs for Free&nbsp;— Combine PDF Files Online
            </h1>

            {/* Stand-first */}
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Need to join reports, forms, or scans into one file fast? A{' '}
              <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                free online PDF merger
              </Link>{' '}
              makes that easy. Instead of installing a full PDF editor, you can use a browser-based{' '}
              <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                PDF combiner
              </Link>{' '}
              to upload, arrange, and download a single file in minutes.
            </p>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <time dateTime="2026-07-09" itemProp="datePublished">July 9, 2026</time>
              <span aria-hidden="true">·</span>
              <span>9 min read</span>
              <span aria-hidden="true">·</span>
              <span>
                Last updated{' '}
                <time dateTime="2026-07-09" itemProp="dateModified">July 9, 2026</time>
              </span>
              <span aria-hidden="true">·</span>
              <span
                itemProp="author"
                itemScope
                itemType="https://schema.org/Organization"
              >
                <Link
                  href="/author/toolifypdf-team"
                  itemProp="name"
                  className="hover:text-foreground hover:underline"
                >
                  ToolifyPDF
                </Link>
              </span>
            </div>
          </header>

          {/* ── Table of Contents ── */}
          <nav
            aria-label="Table of contents"
            className="mb-10 rounded-2xl border p-5"
            style={{ borderColor: ACCENT_BORDER, backgroundColor: ACCENT_BG }}
          >
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
              Table of Contents
            </p>
            <ol className="space-y-1.5">
              {TOC.map((item, i) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <span className="font-semibold tabular-nums w-5 flex-shrink-0" style={{ color: ACCENT }}>
                    {i + 1}.
                  </span>
                  <a
                    href={`#${item.id}`}
                    className="hover:underline transition-colors"
                    style={{ color: ACCENT }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* ── Hero image from article ── */}
          <figure className="mb-8 rounded-2xl overflow-hidden border border-border shadow-md">
            <div className="relative w-full" style={{ aspectRatio: '3/2' }}>
              <Image
                src="/merge-pdf-guide.png"
                alt="Multiple PDF files being merged into one combined PDF document, showing the merge process with a progress bar"
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
            </div>
          </figure>

          <AdBanner slot="6978025975" format="horizontal" className="mb-8" />

          {/* ══════════════════════════════════════════════════
              SECTION 1 — Key Highlights
          ══════════════════════════════════════════════════ */}
          <section id="key-highlights" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-5">Key Highlights</h2>
            <div
              className="rounded-2xl border p-5 space-y-3"
              style={{ borderColor: ACCENT_BORDER, backgroundColor: ACCENT_BG }}
            >
              {[
                'A good merge pdf tool lets you join files in a browser with quick pdf merging and very little setup.',
                'Many best tools work on Windows, Mac, Linux, and mobile, so you can merge on almost any device.',
                'Some options, including ToolifyPDF, offer a pdf combiner with no registration and a simple interface.',
                'File sizes, privacy handling, and speed vary, so checking limits matters before upload.',
                'Several tools also act as a pdf editor with reorder, split, and image files support.',
                'Beginners often want simplicity, while advanced users may need more features and higher limits.',
              ].map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: ACCENT }}
                    aria-hidden="true"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              SECTION 2 — Introduction
          ══════════════════════════════════════════════════ */}
          <section id="introduction" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">Introduction</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Need to join reports, forms, or scans into one file fast? A free online pdf merger makes that easy. Instead of
              installing a full pdf editor, you can use a browser-based{' '}
              <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                pdf combiner
              </Link>{' '}
              to upload, arrange, and download a single file in minutes.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              This merge pdf guide keeps things practical. You will see which tools are easiest to use, what merge pdf benefits
              to expect for your workflow, and what privacy trade-offs to watch for. Real merge pdf examples — like combining
              contracts, invoices, and scanned pages — are included so you can see exactly where this fits into everyday document tasks.
            </p>
          </section>

          {/* Image 1 — LCP candidate, eager-load */}
          <ArticleImage
            src="https://images.unsplash.com/photo-1568667256549-094345857637?w=800&q=75&auto=format&fit=crop"
            alt="Multiple paper documents and files spread across a desk ready to be combined"
            caption="Combining documents: the PDF merge workflow eliminates the need to manage multiple separate files."
            priority
          />

          {/* ══════════════════════════════════════════════════
              SECTION 3 — Easiest Ways
          ══════════════════════════════════════════════════ */}
          <section id="easiest-ways" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              The Easiest Ways to Merge PDFs for Free Online
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you want to combine pdf documents without installing software, a browser-based pdf merge tool is usually
              the fastest path. You upload files, reorder them, click merge, and save the result. That works well on
              Windows, macOS, and most mobile devices too.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Still, not every merge pdf tool is the same. Some focus on simplicity, others add cloud access, page tools,
              or desktop options. The next sections compare the best tools, along with ease of use, limits, and privacy
              considerations.
            </p>

            <div className="space-y-5">
              <ToolCard
                number={1}
                name="ToolifyPDF – Fast, Secure PDF Merging Without Registration"
                intro={[
                  "ToolifyPDF is one of the best tools if you want quick pdf merging without extra steps. It runs in your browser, works across devices, and does not ask you to create an account before using the pdf merger.",
                  "Just upload your files, arrange them, and download the combined result. The interface is simple, processing is fast, and the service is completely free — no hidden limits on the free plan.",
                  "It is especially useful when you need speed and convenience. That said, be cautious with highly confidential documents on any online platform, just as you would with any browser-based pdf combiner.",
                ]}
                bullets={[
                  'Completely free with no registration required',
                  'Fast browser-based processing with a simple interface',
                  'Multiple PDF tools in one place for broader workflow needs',
                ]}
              />

              <ToolCard
                number={2}
                name="Merge2PDF – Combine PDFs Instantly on Any Device"
                intro={[
                  "Merge2PDF is built for convenience. If you need a pdf merge tool that opens in a browser and works on desktop, tablet, or phone, it fits the job. That also means you can merge PDFs on Windows without Adobe Acrobat.",
                  "The layout is easy to follow — upload files, place them in order, start the process, and download the finished file. For beginners, that simplicity is a real advantage. You do not need a full pdf editor just to join a few files.",
                  "Before using it, check its limits. Some online tools restrict file sizes or the number of files in the free version.",
                ]}
                bullets={[
                  'Works through a browser on many devices',
                  'Simple upload, arrange, and download process',
                  'Limits may apply to size or file count',
                ]}
              />

              <ToolCard
                number={3}
                name="Smallpdf – User-Friendly PDF Combiner with Cloud Support"
                intro={[
                  "Smallpdf is a well-known pdf combiner for users who like a clean interface. Its biggest draw is cloud support — you can import files directly from Google Drive or Dropbox instead of uploading from local storage.",
                  "From a usability standpoint, it is easy to learn. Add files, arrange them, and export the merged result. The platform also offers features beyond a basic pdf merger if you handle document tasks regularly.",
                  "The free version works well for light use, but some advanced features sit behind a paid plan. That matters if you need frequent merging or more flexibility.",
                ]}
                bullets={[
                  'Google Drive and Dropbox support',
                  'Clean interface for fast combining',
                  'Extra tools available, though some require payment',
                ]}
              />

              <ToolCard
                number={4}
                name="ILovePDF – Reliable PDF Merging and Additional Tools"
                intro="ILovePDF is popular because it does more than merging. If you want a pdf merge tool plus pdf split options and other document helpers, it offers a wide range of features in one place. That makes it useful for people with repeat tasks. Using it feels straightforward. You add files, place them in order, and export one combined file. Depending on the plan, limits may affect the number of pages or the number of files you can process comfortably in one go. It is also known for accessibility through browser-based use, and some users look to it when they want extension-style convenience."
                bullets={[
                  'Reliable for merging and other PDF tasks',
                  'Easy ordering before export',
                  'Useful if you need more than a basic merger',
                ]}
              />

              <ToolCard
                number={5}
                name="PDF24 Tools – Merge PDF Documents Free on Windows & Mac"
                intro="PDF24 Tools stands out because it gives you both web-based and desktop choices. If you want flexibility on Windows or Mac, this can be a smart pick. You can use it in a browser for convenience or look at desktop-style options when privacy matters more. That privacy angle is important. Some processing methods can avoid sending files away from your device, which reduces concerns about remote servers. For users handling more sensitive material, that can be a deciding factor. Beyond merging, it includes extra pdf tools that help with everyday work. That wider toolkit makes it more than a simple pdf editor substitute."
                bullets={[
                  'Web and desktop flexibility',
                  'Better privacy potential for local handling',
                  'Extra PDF utilities for broader tasks',
                ]}
              />
            </div>

            {/* Comparison table */}
            <div className="mt-8">
              <h3 className="text-lg font-bold text-foreground mb-4">
                Quick Comparison of Popular Tools
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: ACCENT_BG }}>
                      {['Tool', 'Best For', 'Registration', 'Cloud Support', 'Privacy Note'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide whitespace-nowrap"
                          style={{ color: ACCENT }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {[
                      ['ToolifyPDF', 'Fast everyday merging', 'No', 'Not highlighted', 'Browser-based, good for routine files'],
                      ['Merge2PDF', 'Simple cross-device use', 'Not specified', 'Not highlighted', 'Check file limits and privacy terms'],
                      ['Smallpdf', 'Cloud-based workflows', 'Not always required', 'Google Drive, Dropbox', 'Review free plan limits'],
                      ['ILovePDF', 'Extra PDF features', 'Not always required', 'Supported on platform workflows', 'Check page and task limits'],
                      ['PDF24 Tools', 'Web and desktop flexibility', 'Not specified', 'Not central feature', 'Local options may improve privacy'],
                    ].map(([tool, bestFor, reg, cloud, privacy]) => (
                      <tr key={tool} className="bg-card hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{tool}</td>
                        <td className="px-4 py-3 text-muted-foreground">{bestFor}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{reg}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cloud}</td>
                        <td className="px-4 py-3 text-muted-foreground">{privacy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Image 2 */}
          <ArticleImage
            src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=75&auto=format&fit=crop"
            alt="Person working on a laptop using an online PDF tool in a browser window"
            caption="Browser-based PDF tools require no installation — open, upload, merge, and download in under a minute."
          />

          <AdBanner slot="6978025975" format="horizontal" className="my-8" />

          {/* ══════════════════════════════════════════════════
              SECTION 4 — How to Combine
          ══════════════════════════════════════════════════ */}
          <section id="how-to-combine" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              How to Combine PDF Files Without Installing Software
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              For most people, the easiest method is a browser-based{' '}
              <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                pdf merger
              </Link>
              . Open the tool, use the drop feature to upload files, reorder them, merge them, and save the result. The
              whole workflow usually takes only a minute or two.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              That speed is why online tools are so popular. You do not need setup, updates, or extra storage space. A good
              pdf combiner works directly in your browser, which is perfect for quick school, work, or home tasks.
            </p>

            <div className="space-y-8">
              {/* Sub-section: Browser-based */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Using Browser-Based PDF Tools for Quick Merges
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  Here is the basic process most tools follow. First, open your chosen merge pdf tool in a browser. Then
                  upload files with the drop feature or a file picker. Many tools place the main action near the top right
                  corner so it is easy to spot.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  Next, check the order before you continue. A good interface lets you drag items into place. Once
                  everything looks right, click the merge button and wait for the tool to create your single file.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  This method is popular because it is simple and fast.
                </p>

                {/* Step list */}
                <div className="space-y-3">
                  {[
                    { step: '1', label: 'Open the tool in your browser' },
                    { step: '2', label: 'Upload or drag your files into the workspace' },
                    { step: '3', label: 'Reorder items before processing' },
                    { step: '4', label: 'Click merge, then download the result' },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3"
                    >
                      <span
                        className="w-7 h-7 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ACCENT }}
                      >
                        {s.step}
                      </span>
                      <p className="text-sm font-medium text-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <Link
                    href="/merge-pdf"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: ACCENT }}
                  >
                    Try Merge PDF Free
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              {/* Sub-section: Rearranging pages */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Rearranging Pages and Organizing PDFs Before Combining
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Order matters more than many people expect. If you merge files without checking sequence, the final
                  document can feel confusing or incomplete. That is why many users choose a{' '}
                  <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                    pdf merger
                  </Link>{' '}
                  that lets them reorder files before processing.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-5">
                  Some platforms go further and act more like a light pdf editor, giving you options to move pages or
                  adjust structure during the workflow. Adobe notes that order can be changed before merging, and
                  signed-in users may get more page controls afterward depending on the tool.
                </p>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When organizing, keep these points in mind:
                </p>
                <ul className="space-y-2">
                  {[
                    'Put the first file at the top because it usually appears first',
                    'Check the number of pages in long files before combining',
                    'Remove anything unnecessary before export if the tool allows it',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span
                        className="mt-1 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: ACCENT_BG }}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                          <path d="M1.5 4l1.5 1.5L6.5 2" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Image 3 */}
          <ArticleImage
            src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=75&auto=format&fit=crop"
            alt="Digital security lock concept representing safe and private online document handling"
            caption="Always review a tool's privacy policy before uploading sensitive documents to any online service."
          />

          {/* ══════════════════════════════════════════════════
              SECTION 5 — Security & Privacy
          ══════════════════════════════════════════════════ */}
          <section id="security-privacy" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Security and Privacy: Is It Safe to Merge PDFs Online?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Online merging can be safe for everyday files, but you should still read the privacy policy before uploading
              anything important. Reputable services explain how files move through their servers and when they are deleted.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              That said, highly sensitive documents deserve extra caution. If a contract, legal record, or financial file is
              very private, a desktop option or a tool that keeps processing local may be the safer choice. Next, let's
              look at practical safeguards.
            </p>

            <div>
              <h3 className="text-xl font-bold text-foreground mb-4">
                Handling Sensitive Documents with Online PDF Freeware
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Start with the developer's privacy policy. It should clearly explain upload handling, storage time, and
                deletion practices. If that information is hard to find, think twice before using the service for
                confidential documents.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4">
                A browser-based tool is fine for many routine tasks, but not every file belongs online. If you are dealing
                with highly private records, browser convenience should not outweigh security. In those cases, a local
                desktop tool may be a better fit than an online pdf editor.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Use online freeware carefully. Choose known platforms, avoid shared public networks, and keep originals
                until you verify the result. That small caution can prevent bigger issues later.
              </p>
            </div>
          </section>

          {/* ══════════════════════════════════════════════════
              SECTION 6 — Quality Control
          ══════════════════════════════════════════════════ */}
          <section id="quality-control" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Quality Control – Does Combining PDFs Affect File Quality?
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              In many cases, merging alone should not cause quality loss. PDF format is built to preserve layout and
              formatting across devices, and Adobe specifically notes that formatting is retained when files are combined.
              So a normal merged pdf file should look like the originals.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Problems usually show up when another feature changes the file. A{' '}
              <Link href="/compress-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                pdf compressor
              </Link>
              , watermarking rule, or conversion step may affect appearance more than merging itself. That is why it helps
              to know the range of features a tool applies during export.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">Watch for these quality factors:</p>
            <ul className="space-y-2 mb-6">
              {[
                'Compression settings that reduce clarity',
                'Watermarks in limited free plan tools',
                'Output checks before you delete your source files',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span
                    className="mt-1 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: ACCENT_BG }}
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
                      <path d="M1.5 4l1.5 1.5L6.5 2" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Image 4 */}
          <ArticleImage
            src="https://images.unsplash.com/photo-1586281380117-5a60ae2050cc?w=800&q=75&auto=format&fit=crop"
            alt="Person carefully reviewing a printed document to check quality after merging PDF files"
            caption="Always open the merged file and scroll through it before deleting your source PDFs."
          />

          {/* ══════════════════════════════════════════════════
              SECTION 7 — Conclusion
          ══════════════════════════════════════════════════ */}
          <section
            id="conclusion"
            className="mb-10 scroll-mt-20 rounded-2xl border p-6 bg-card"
            style={{ borderColor: ACCENT_BORDER }}
          >
            <h2 className="text-xl font-bold text-foreground mb-3">Conclusion</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              In conclusion, merging PDFs has never been easier thanks to the variety of online tools available. Whether
              you choose{' '}
              <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                ToolifyPDF
              </Link>{' '}
              for its fast and secure merging capabilities without any registration, or explore other user-friendly options
              like Smallpdf or ILovePDF, you're guaranteed a smooth experience.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Remember that merging not only streamlines your documents but also enhances organization and accessibility.
              As you combine your PDFs, ensure you prioritize security and quality to maintain the integrity of your files.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If you're looking for a reliable solution, don't hesitate to try out{' '}
              <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>
                ToolifyPDF
              </Link>{' '}
              today — it's completely free and designed for your convenience!
            </p>
          </section>

          {/* ══════════════════════════════════════════════════
              SECTION 8 — FAQ
          ══════════════════════════════════════════════════ */}
          <section id="faq" className="mb-10 scroll-mt-20">
            <h2 className="text-2xl font-bold text-foreground mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <FaqItem
                question="Can I merge all PDFs into one file without Adobe Acrobat?"
                answer="Yes. You can use a merge pdf tool in your browser instead of Adobe Acrobat. A browser-based pdf combiner lets you upload files, place them in order, and download one combined file without installing software."
              />
              <FaqItem
                question="Which free online PDF merger supports larger file sizes?"
                answer="Support for larger file sizes depends on the platform and its free version limits. Adobe allows up to 100 files and a combined total of 1,500 pages in its tool, while other best tools may set smaller size or task limits."
              />
              <FaqItem
                question="What steps should I follow to merge PDF documents securely?"
                answer="Choose a trusted pdf merger, read its privacy policy, and use a secure internet connection. Avoid uploading confidential documents unless you understand how the service handles files on its servers and when those files are deleted."
              />
            </div>
          </section>

          {/* ── Related Articles ── */}
          <RelatedArticles
            slugs={[
              'how-to-split-pdf-online',
              'how-to-compress-pdf-online',
              'common-pdf-problems-and-solutions',
              'how-to-convert-pdf-to-word',
            ]}
          />

          {/* ── Related PDF Tools ── */}
          <RelatedTools />

        </article>
      </main>
    </>
  )
}
