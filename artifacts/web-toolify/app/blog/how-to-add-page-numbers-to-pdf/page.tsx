import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { AdBanner } from '@/components/ad-banner'

export const metadata: Metadata = {
  title: { absolute: 'How to Add Page Numbers to a PDF Online for Free | ToolifyPDF Blog' },
  description:
    'Learn how to add page numbers to a PDF document online for free. Covers positioning, numbering formats, use cases, and step-by-step instructions — no software needed.',
  alternates: { canonical: 'https://www.toolifypdf.online/blog/how-to-add-page-numbers-to-pdf' },
  openGraph: {
    title: 'How to Add Page Numbers to a PDF Online for Free',
    description: 'Add page numbers to PDF files online for free. Covers positioning, numbering styles, and when you need page numbers.',
    type: 'article',
    publishedTime: '2026-06-13T00:00:00.000Z',
    url: 'https://www.toolifypdf.online/blog/how-to-add-page-numbers-to-pdf',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: 'How to Add Page Numbers to a PDF Online for Free', description: 'Add page numbers to any PDF online for free — no software needed.' , images: ['https://www.toolifypdf.online/og-image.jpg'] },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Add Page Numbers to a PDF Online for Free',
  image: 'https://www.toolifypdf.online/og-image.jpg',
  description: 'Learn how to add page numbers to a PDF document online for free — covering positioning, numbering formats, and use cases.',
  datePublished: '2026-06-13T00:00:00.000Z',
  dateModified: '2026-06-13T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'Toolify', url: 'https://www.toolifypdf.online' },
  publisher: { '@type': 'Organization', name: 'Toolify', url: 'https://www.toolifypdf.online', logo: { '@type': 'ImageObject', url: 'https://www.toolifypdf.online/favicon.png' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.toolifypdf.online/blog/how-to-add-page-numbers-to-pdf' },
  keywords: 'add page numbers to pdf, pdf page numbering online, number pdf pages free, pdf footer page number, add numbers to pdf',
}

const ACCENT = '#7c3aed'

export default function ArticlePage() {
  return (
    <>
      <Script id="schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="min-h-screen bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/BlogPosting">

          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">How to Add Page Numbers to a PDF</li>
            </ol>
          </nav>

          <header className="mb-10">
            <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full mb-5" style={{ backgroundColor: '#f5f3ff', color: ACCENT }}>
              PDF Guide
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4" itemProp="headline">
              How to Add Page Numbers to a PDF Online for Free
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Page numbers are one of the most practical elements in any multi-page document — they help readers navigate, make it easy to reference specific sections in discussions, and are often required by organizations, academic institutions, and legal processes. If your PDF was created without page numbers, or if you merged multiple documents and need to add unified numbering, this guide walks through everything you need to know.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-06-13" itemProp="datePublished">June 13, 2026</time>
              <span>·</span><span>7 min read</span><span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization"><span itemProp="name">ToolifyPDF</span></span>
            </div>
          </header>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Why Page Numbers Matter in a PDF Document</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              It may seem like a minor detail, but the absence of page numbers in a multi-page PDF creates real practical problems. Documents circulated for review, submitted to institutions, or referenced in meetings become much harder to navigate without numbered pages.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Consider a 30-page legal contract shared for review. If one party says "see page 18 for the clause we discussed," everyone on the call can immediately turn to that page. Without page numbers, they are left counting from the top or scrolling blindly. The same challenge applies to academic papers, technical manuals, financial reports, and any long-form document that will be referred to during a meeting or discussion.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Beyond navigation, many formal submission requirements — court filings, government applications, academic dissertations, and tender documents — explicitly require that page numbers appear in a specific position on the page. Submitting a PDF without the required numbering may cause it to be rejected.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">When You Might Need to Add Page Numbers to an Existing PDF</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              There are several common scenarios where a PDF requires page numbers but does not have them already:
            </p>
            <div className="space-y-3">
              {[
                { title: 'Merged PDF documents', body: 'When you combine several separate PDF files into one document using a merge tool, the resulting file starts pagination from scratch and may have no visible page numbers at all — even if the individual source files had their own numbering.' },
                { title: 'Scanned documents', body: 'Physical documents that were scanned and saved as PDF rarely have electronic page numbers. The page numbers visible on the original paper pages are part of the scanned image, but there is no actual PDF page number element that can be referenced or manipulated.' },
                { title: 'Documents exported from tools without numbering', body: 'Many web-based tools, reporting platforms, and export functions generate PDFs without including header or footer elements. Adding page numbers after export is straightforward with an online tool.' },
                { title: 'Formal submission requirements', body: 'If you are preparing a document for legal submission, academic review, or any process that specifies page number placement, you may need to add numbers to a file that was not originally designed with them.' },
              ].map((item) => (
                <div key={item.title} className="border border-border rounded-xl p-4 bg-card">
                  <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Key Page Numbering Settings to Know</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Before adding page numbers, consider these settings to ensure the output meets your requirements.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Position (header vs. footer)', body: 'Page numbers are most commonly placed in the footer, centred or in the bottom corner. Header placement is also used in academic and legal documents. Consider which position works best with your existing content.' },
                { title: 'Alignment (left, centre, right)', body: 'Centre alignment is the most neutral and is suitable for most documents. Right-aligned footer numbers are common in formal documents. Left alignment is less common but appropriate in some contexts.' },
                { title: 'Starting number', body: 'If a document begins with a cover page or table of contents that should not be counted, you may want to start numbering from page 2 or set the starting number to 0. This allows the first numbered content page to display "1" correctly.' },
                { title: 'Number format', body: 'Standard Arabic numerals (1, 2, 3) are appropriate for most documents. Some formal documents use Roman numerals (i, ii, iii) for introductory sections.' },
              ].map((item) => (
                <div key={item.title} className="border border-border rounded-xl p-4 bg-card">
                  <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Add Page Numbers to a PDF Online — Step by Step</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Adding page numbers to a PDF using ToolifyPDF is quick and requires no software installation.
            </p>
            <ol className="space-y-5">
              {[
                { title: 'Open the Page Numbers tool', text: 'Navigate to the Page Numbers tool on ToolifyPDF in any web browser. The tool works on all major devices and operating systems.' },
                { title: 'Upload your PDF', text: 'Upload the PDF that you want to number. Any standard PDF file is accepted.' },
                { title: 'Configure the numbering settings', text: 'Set the position (header or footer), alignment (left, centre, or right), and the starting page number. If the document has a cover page that should not be numbered, adjust the starting number accordingly.' },
                { title: 'Apply the page numbers', text: 'Click the button to process the document. The page numbers are added to each page according to your settings.' },
                { title: 'Download the numbered PDF', text: 'Download the updated PDF. Open it to verify that the page numbers appear correctly on every page before distributing or submitting the file.' },
              ].map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5" style={{ backgroundColor: ACCENT }}>{i + 1}</span>
                  <div className="pt-1">
                    <p className="font-semibold text-foreground mb-1 text-sm">{step.title}</p>
                    <p className="text-muted-foreground leading-relaxed text-sm">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-8 text-center">
              <Link href="/page-numbers" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md" style={{ backgroundColor: ACCENT }}>
                Add Page Numbers →
              </Link>
            </div>
          </section>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Page Number Placement by Document Type</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Different types of documents follow different conventions for where page numbers should appear. Following the appropriate convention for your document type gives it a professional, polished appearance.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Document Type</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Typical Position</th>
                    <th className="text-left py-3 font-semibold text-foreground">Alignment</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['Business reports', 'Footer', 'Centre or right'],
                    ['Legal documents', 'Footer or header', 'Centre or right'],
                    ['Academic papers', 'Header or footer', 'Right or centre'],
                    ['Invoices', 'Footer', 'Centre'],
                    ['Technical manuals', 'Footer', 'Centre or outer margin'],
                    ['Contracts', 'Footer', 'Centre'],
                  ].map(([type, pos, align]) => (
                    <tr key={type} className="border-b border-border/50">
                      <td className="py-3 pr-4">{type}</td>
                      <td className="py-3 pr-4">{pos}</td>
                      <td className="py-3">{align}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Page Numbers and Document Organization</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Adding page numbers works best when the document is already organized in its final order. If you plan to rearrange, add, or remove pages, do that first — then add page numbers last, so the numbering reflects the final structure accurately.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you need to reorganize your PDF pages before numbering them, use the <Link href="/organize-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>Organize PDF</Link> tool to reorder pages, then apply page numbers once the order is finalized. Similarly, if you merged multiple PDFs and need unified numbering across the combined document, merge first using the <Link href="/merge-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>Merge PDF</Link> tool, then add page numbers to the resulting file.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This sequential approach — organize, merge if needed, number last — ensures the page numbers in the final document accurately represent the document's actual structure.
            </p>
          </section>

          <section className="mb-10 rounded-2xl border border-border p-6 bg-card">
            <h2 className="text-xl font-bold text-foreground mb-3">Summary</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Page numbers are a functional necessity in any multi-page document that will be reviewed, referenced, or formally submitted. They can be added to any PDF using a free online tool in a matter of seconds — no software required.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The key decisions are position (header or footer), alignment, and starting number. Get these right for your document type, and the result is a professional, navigable file that meets the expectations of its recipients. For documents that also require reorganizing or merging before numbering, handle those steps first to ensure the numbering accurately reflects the final document.
            </p>
          </section>

        </article>
      </main>
    </>
  )
}
