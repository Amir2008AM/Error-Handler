import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ReadingProgress } from '@/components/reading-progress'
import { RelatedArticles } from '@/components/related-articles'

export const metadata: Metadata = {
  title: { absolute: 'How to Add Watermark to PDF Files on a Mac or PC | ToolifyPDF' },
  description:
    'Add watermark on PDF online with ToolifyPDF. Protect documents, add text or image watermarks, mark drafts, and brand reports — free, no registration required.',
  alternates: { canonical: 'https://toolifypdf.online/blog/add-watermark-on-pdf' },
  openGraph: {
    title: 'How to Add Watermark to PDF Files on a Mac or PC | ToolifyPDF',
    description:
      'Add watermark on PDF online with ToolifyPDF. Protect documents, add text or image watermarks, mark drafts, and brand reports — free, no registration required.',
    type: 'article',
    publishedTime: '2026-08-02T00:00:00.000Z',
    url: 'https://toolifypdf.online/blog/add-watermark-on-pdf',
    images: [
      {
        url: 'https://toolifypdf.online/images/add-watermark-to-pdf-tool.webp',
        width: 1024,
        height: 576,
        alt: 'ToolifyPDF Add Watermark tool showing a business report with a CONFIDENTIAL watermark',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Toolifypdf',
    title: 'How to Add Watermark to PDF Files on a Mac or PC | ToolifyPDF',
    description: 'Add watermark on PDF online with ToolifyPDF. Free, no registration. Text or image watermarks in seconds.',
    images: ['https://toolifypdf.online/images/add-watermark-to-pdf-tool.webp'],
  },
}

const ACCENT = '#0369a1'

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Add Watermark to PDF Files on a Mac or PC',
  image: 'https://toolifypdf.online/images/add-watermark-to-pdf-tool.webp',
  description:
    'Add watermark on PDF online with ToolifyPDF. Protect documents, add text or image watermarks, mark drafts, and brand reports — free, no registration required.',
  datePublished: '2026-08-02T00:00:00.000Z',
  dateModified: '2026-08-02T00:00:00.000Z',
  author: {
    '@type': 'Organization',
    name: 'ToolifyPDF Team',
    url: 'https://toolifypdf.online/about',
  },
  publisher: {
    '@type': 'Organization',
    name: 'ToolifyPDF',
    url: 'https://toolifypdf.online',
    logo: { '@type': 'ImageObject', url: 'https://toolifypdf.online/toolifypdf-logo.png' },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://toolifypdf.online/blog/add-watermark-on-pdf' },
  articleSection: 'PDF Security',
  keywords: 'add watermark to pdf, watermark pdf online, protect pdf, text watermark, image watermark, confidential pdf',
  wordCount: 820,
}

const faqs = [
  {
    question: 'Can I add a watermark on every page?',
    answer:
      'Yes. You can place the mark across every page so the PDF file keeps the same look from start to finish.',
  },
  {
    question: 'Can I use both text and image marks?',
    answer:
      'Yes. You can use a text mark, a small icon, or a combination depending on the style you want.',
  },
  {
    question: 'Can I control the placement of the watermark?',
    answer:
      'Yes. You can place the mark in the center, in a corner, or across the page depending on how strong you want the watermark to appear.',
  },
  {
    question: 'Does the watermark affect PDF quality?',
    answer:
      'No. ToolifyPDF keeps the file readable while placing the mark cleanly, without affecting the original PDF quality.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
}

const steps = [
  { title: 'Upload your PDF file', text: 'Open the Add Watermark tool and upload the PDF you want to mark. Works on desktop and mobile, no software required.' },
  { title: 'Choose text or image watermark', text: 'Select whether you want a text watermark (e.g. CONFIDENTIAL, DRAFT) or an image watermark (your logo or custom graphic).' },
  { title: 'Enter text or upload your logo', text: 'Type the watermark text or upload your image file.' },
  { title: 'Adjust position, opacity, and rotation', text: 'Fine-tune placement, transparency, and angle. A 20–30% opacity diagonal placement works best for most documents.' },
  { title: 'Apply and download', text: 'Click Apply. The watermark appears on every page. Download your updated PDF instantly.' },
]

const useCases = [
  { icon: '🔒', title: 'Confidential documents', text: 'Mark sensitive business files before sharing them outside your organisation.' },
  { icon: '✏️', title: 'Draft review files', text: 'Prevent confusion between working versions and final approved documents.' },
  { icon: '🖼️', title: 'Brand identity', text: 'Add a company name or logo to reports, proposals, and invoices on every page.' },
  { icon: '📋', title: 'Sample materials', text: 'Share preview contracts or templates that cannot be used as final documents.' },
]

export default function ArticlePage() {
  return (
    <>
      <ReadingProgress color={ACCENT} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <main className="min-h-screen bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/BlogPosting">

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Add Watermark on PDF</li>
            </ol>
          </nav>

          {/* Header */}
          <header className="mb-10">
            <div
              className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full mb-5"
              style={{ backgroundColor: '#eff6ff', color: ACCENT }}
            >
              PDF Security
            </div>
            <h1
              className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4"
              itemProp="headline"
            >
              How to Add Watermark to PDF Files on a Mac or PC
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Learn how to add a watermark to PDF files on a Mac or PC using a free, browser-based tool. Add text or image overlays, customize their appearance, and protect your documents without installing software.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-08-02" itemProp="datePublished">August 2, 2026</time>
              <span>·</span>
              <span>5 min read</span>
              <span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization">
                <Link href="/about" itemProp="name" className="hover:text-foreground hover:underline">
                  ToolifyPDF
                </Link>
              </span>
            </div>
          </header>

          {/* Hero image */}
          <figure className="mb-10 rounded-2xl overflow-hidden border border-border shadow-sm">
            <Image
              src="/images/watermark-guide-hero.png"
              alt="ToolifyPDF Add Watermark tool showing a business report with a CONFIDENTIAL text watermark applied at 30% opacity and 45-degree rotation"
              width={1024}
              height={576}
              priority
              className="w-full h-auto"
            />
            <figcaption className="text-xs text-muted-foreground text-center py-2 px-4">
              ToolifyPDF's Add Watermark interface — add text or image watermarks to any PDF in seconds.
            </figcaption>
          </figure>

          {/* Intro */}
          <section className="mb-10">
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you need to mark a PDF file for review, ownership, or sharing, a watermark is a simple solution.
              It can show that a file is private, draft, or ready for approval — and it keeps every page consistent.
              With <Link href="/" className="font-medium hover:underline" style={{ color: ACCENT }}>ToolifyPDF</Link>,
              you can manage PDF files entirely online without installing software.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This is useful for reports, contracts, study materials, invoices, and shared PDFs.
              Instead of sending a plain file, you can give your document a more professional look,
              keep it organised, and make it harder to reuse without permission.
            </p>
          </section>

          {/* Why use a watermark */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Why You Should Add a Watermark to Your PDF</h2>
            <p className="text-muted-foreground leading-relaxed mb-5">
              A watermark gives a file a visible identity. It helps with protection, review, client sharing,
              and a cleaner, more professional appearance — without blocking the text underneath.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {useCases.map((item) => (
                <div key={item.title} className="border border-border rounded-xl p-4 bg-card flex gap-3 items-start">
                  <span className="text-2xl" aria-hidden="true">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <figure className="mb-10 overflow-hidden rounded-2xl border border-border shadow-sm">
            <Image src="/images/watermark-settings.png" alt="PDF preview with controls for adjusting watermark opacity, rotation, and position" width={1024} height={576} className="w-full h-auto" />
            <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">Fine-tune the watermark so the document stays readable.</figcaption>
          </figure>

          {/* Text or image */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Text or image watermark?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-l-4 p-4 rounded-r-xl bg-muted/40" style={{ borderColor: ACCENT }}>
                <p className="font-semibold text-foreground text-sm mb-2">Text watermark</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Simple, fast, and flexible. Add words like <strong>Confidential</strong>, <strong>Draft</strong>,{' '}
                  <strong>Sample</strong>, or <strong>Internal Use Only</strong>. Best for quick document marking.
                </p>
              </div>
              <div className="border-l-4 p-4 rounded-r-xl bg-muted/40" style={{ borderColor: ACCENT }}>
                <p className="font-semibold text-foreground text-sm mb-2">Image watermark</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Better for brand identity — upload your logo or a custom graphic. Ideal when you want
                  a visual mark that represents your organisation on every page.
                </p>
              </div>
            </div>
          </section>

          <figure className="mb-10 overflow-hidden rounded-2xl border border-border shadow-sm">
            <Image src="/images/image-watermark.png" alt="Transparent company logo positioned as a faint watermark on a PDF page" width={1024} height={576} className="w-full h-auto" />
            <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">Transparent logos work well when you need consistent branding.</figcaption>
          </figure>

          {/* How to steps */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-6">How to Insert Watermark in PDF Online for Free</h2>
            <ol className="space-y-5">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span
                    className="flex-shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: ACCENT }}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-1">
                    <p className="font-semibold text-foreground mb-1 text-sm">{step.title}</p>
                    <p className="text-muted-foreground leading-relaxed text-sm">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 text-center">
              <Link
                href="/add-watermark-to-pdf"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: ACCENT }}
              >
                Add Watermark to PDF Now →
              </Link>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Customizing Your Watermark for Professional Results</h2>
            <p className="text-muted-foreground leading-relaxed">
              Adjust font, opacity, rotation, and positioning to keep your document readable while maintaining a consistent brand identity. Transparent PNG logos are especially useful for image watermarks, and saved settings can make recurring document workflows faster.
            </p>
          </section>

          {/* Best settings */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Best settings for a professional watermark</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To keep a watermark professional, use low opacity so the page stays readable.
              A simple font works best for most PDFs, and a small rotation gives the mark a more natural look.
            </p>
            <div className="space-y-3">
              {[
                { label: 'Opacity', tip: '20–30% for subtle background marks; higher when the watermark itself is the main message.' },
                { label: 'Rotation', tip: '45° diagonal placement across the centre is the most recognised and effective style.' },
                { label: 'Position', tip: 'Centre for maximum visibility; corner or header for a smaller, less intrusive mark.' },
                { label: 'Font', tip: 'Bold, simple fonts (e.g. Arial, Helvetica) remain readable at any size or rotation.' },
              ].map((item) => (
                <div key={item.label} className="flex gap-3 border border-border rounded-xl p-4 bg-card">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start mt-0.5" style={{ backgroundColor: '#eff6ff', color: ACCENT }}>
                    {item.label}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.tip}</p>
                </div>
              ))}
            </div>
          </section>

          <figure className="mb-10 overflow-hidden rounded-2xl border border-border shadow-sm">
            <Image src="/images/batch-watermarking.png" alt="Several PDF files processed together with consistent watermarks" width={1024} height={576} className="w-full h-auto" />
            <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">Batch workflows help keep branding consistent across a document set.</figcaption>
          </figure>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Advanced Options for Batch Watermarking Efficiency</h2>
            <p className="text-muted-foreground leading-relaxed">
              Processing multiple files together helps professionals apply the same branding across an entire document set. Coordinate-based placement and page-range controls keep watermarks consistent without repetitive manual editing.
            </p>
          </section>

          {/* When to use */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">When to add watermarks to PDFs</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Use watermarks whenever a file is shared before final approval, needs ownership protection,
              or should carry a clear organisational mark.
            </p>
            <ul className="space-y-2">
              {[
                'Files shared before final approval',
                'Documents that need ownership protection',
                'Reports that should carry a clear organisational mark',
                'Sample files, training material, or client previews',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              A small mark is often enough to protect the file while keeping the layout clean —
              that balance matters when the reader needs to review content without distraction.
            </p>
          </section>

          <figure className="mb-10 overflow-hidden rounded-2xl border border-border shadow-sm">
            <Image src="/images/pdf-privacy.png" alt="PDF document protected by a security shield and encrypted connection" width={1024} height={576} className="w-full h-auto" />
            <figcaption className="px-4 py-2 text-center text-xs text-muted-foreground">Choose a service with clear file-handling and deletion practices.</figcaption>
          </figure>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Keep your documents private</h2>
            <p className="text-muted-foreground leading-relaxed">
              Before uploading a sensitive PDF, check that the service uses an encrypted connection and explains how long files are retained. Avoid sharing documents you do not have permission to edit, and remember that a watermark is a visual deterrent—not a replacement for access controls or password protection.
            </p>
          </section>

          {/* Related tools */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Other tools you may need</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              After watermarking, you may also find these tools useful:
            </p>
            <ul className="space-y-2">
              {[
                { href: '/compress-pdf', label: 'Compress PDF', desc: 'Reduce file size after adding a watermark.' },
                { href: '/merge-pdf', label: 'Merge PDF', desc: 'Combine documents before watermarking.' },
                { href: '/edit-pdf', label: 'Edit PDF', desc: 'Make final changes before exporting.' },
                { href: '/pdf-to-word', label: 'PDF to Word', desc: 'Convert to a different format for editing.' },
                { href: '/jpg-to-pdf', label: 'JPG to PDF', desc: 'Create a PDF from images.' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-medium hover:underline" style={{ color: ACCENT }} title={item.label}>
                    {item.label}
                  </Link>
                  <span className="text-muted-foreground text-sm"> — {item.desc}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Key Takeaways */}
          <section className="mb-10 rounded-2xl border border-border p-6 bg-card">
            <h2 className="text-xl font-bold text-foreground mb-4">Key Takeaways</h2>
            <ul className="space-y-2">
              {[
                'A watermark marks your PDF as private, draft, or branded on every page.',
                'Text watermarks are faster; image watermarks are better for brand identity.',
                'ToolifyPDF lets you control opacity, font, rotation, and position.',
                'No software installation or account is required — works in any browser.',
                'Combine watermarking with password protection for complete document security.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-6">Frequently asked questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="border-l-4 p-4 rounded-r-xl bg-muted/40" style={{ borderColor: ACCENT }}>
                  <h3 className="font-semibold text-foreground mb-1 text-sm">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Final thoughts */}
          <section className="mb-10 rounded-2xl border border-border p-6 bg-card">
            <h2 className="text-xl font-bold text-foreground mb-3">Final thoughts</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              If you need to place a watermark on a PDF,{' '}
              <Link href="/" className="font-medium hover:underline" style={{ color: ACCENT }}>ToolifyPDF</Link>{' '}
              gives you a simple online way to protect, organise, and share your files.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you want to mark a private draft, add a logo, or keep a consistent style across pages,
              the process stays fast and clear. Add a watermark when you want the PDF to look polished,
              recognised, and ready to share.
            </p>
          </section>

          <RelatedArticles slugs={['how-to-watermark-pdf-documents', 'how-to-protect-pdf-documents', 'how-to-lock-and-unlock-pdf']} />
        </article>
      </main>
    </>
  )
}
