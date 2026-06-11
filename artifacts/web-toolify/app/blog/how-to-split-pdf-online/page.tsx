import type { Metadata } from 'next'
import Link from 'next/link'
import Script from 'next/script'
import { AdBanner } from '@/components/ad-banner'

export const metadata: Metadata = {
  title: 'How to Split a PDF File Online for Free | ToolifyPDF Blog',
  description:
    'Learn how to split a PDF into separate pages or sections online for free. A practical step-by-step guide covering use cases, tips, and what to do after splitting.',
  alternates: { canonical: 'https://www.toolifypdf.online/blog/how-to-split-pdf-online' },
  openGraph: {
    title: 'How to Split a PDF File Online for Free',
    description: 'Split any PDF into individual pages or custom sections in seconds — no software, no sign-up.',
    type: 'article',
    publishedTime: '2026-06-06T00:00:00.000Z',
    url: 'https://www.toolifypdf.online/blog/how-to-split-pdf-online',
  },
  twitter: { card: 'summary_large_image', title: 'How to Split a PDF File Online for Free', description: 'Split any PDF into pages or sections online in seconds.' },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Split a PDF File Online for Free',
  description: 'Learn how to split a PDF into separate pages or sections online for free.',
  datePublished: '2026-06-06T00:00:00.000Z',
  dateModified: '2026-06-06T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'ToolifyPDF', url: 'https://www.toolifypdf.online' },
  publisher: { '@type': 'Organization', name: 'ToolifyPDF', url: 'https://www.toolifypdf.online' },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://www.toolifypdf.online/blog/how-to-split-pdf-online' },
  keywords: 'split pdf, split pdf online free, separate pdf pages, extract pdf pages, divide pdf',
}

const ACCENT = '#16a34a'

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-4 items-start">
      <span className="flex-shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5" style={{ backgroundColor: ACCENT }}>{n}</span>
      <div className="pt-1">
        <p className="font-semibold text-foreground mb-1">{title}</p>
        <p className="text-muted-foreground leading-relaxed text-sm">{text}</p>
      </div>
    </li>
  )
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-4 p-4 rounded-r-xl bg-muted/40" style={{ borderColor: ACCENT }}>
      <p className="font-semibold text-foreground mb-1 text-sm">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  )
}

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
              <li className="text-foreground font-medium">How to Split a PDF File Online</li>
            </ol>
          </nav>

          <header className="mb-10">
            <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full mb-5" style={{ backgroundColor: '#f0fdf4', color: ACCENT }}>PDF Guide</div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4" itemProp="headline">
              How to Split a PDF File Online for Free
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Whether you need to extract a single page from a lengthy report or divide a document into multiple separate files, splitting a PDF is one of the most common document tasks — and it requires no special software. This guide explains what PDF splitting means, when you actually need it, and how to do it correctly in under a minute.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-06-06" itemProp="datePublished">June 6, 2026</time>
              <span>·</span><span>8 min read</span><span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization"><span itemProp="name">ToolifyPDF</span></span>
            </div>
          </header>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">What Does Splitting a PDF Actually Mean?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Splitting a PDF means taking one PDF file and dividing it into two or more separate files. The split can happen in several different ways depending on what you need:
            </p>
            <div className="space-y-3 mb-4">
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">Split into individual pages</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Each page becomes its own PDF file. Useful for separating scanned documents, individual invoices, or single-page certificates.</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">Split by page range</p>
                <p className="text-sm text-muted-foreground leading-relaxed">You define where each section starts and ends. For example, pages 1–5 become File A and pages 6–10 become File B. Useful for dividing chapters or sections.</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">Extract specific pages</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Select non-consecutive pages to pull out — for example, pages 2, 7, and 12. Useful when you need specific attachments or figures from a larger document.</p>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              In all cases, the process only separates pages — it does not modify, compress, or alter the content in any way. Text, images, and formatting remain identical to the original.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">When Do You Actually Need to Split a PDF?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              PDF splitting is more useful than most people realize. Here are the most common real-world situations where splitting a file saves time and prevents problems.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { title: 'Sharing only relevant sections', body: 'When a colleague needs a specific chapter of a report, sending the full 80-page document wastes their time. Splitting lets you send exactly what is needed.' },
                { title: 'Meeting upload size limits', body: 'Many government portals, job application systems, and university platforms impose strict file size limits. Splitting a large document into smaller parts can help you stay within those limits.' },
                { title: 'Separating scanned batches', body: 'Scanners often produce a single multi-page file from a batch scan. Splitting separates individual records, contracts, or receipts into manageable files.' },
                { title: 'Preparing documents for signature', body: 'If only certain pages of a document require review or signature, extracting those pages reduces confusion and keeps the process efficient.' },
                { title: 'Archiving and organization', body: 'Breaking a large combined PDF into topic-based files makes long-term document management and retrieval significantly easier.' },
                { title: 'Removing irrelevant pages', body: 'If a document contains cover pages, blank pages, or filler content you do not need to share, splitting lets you isolate the relevant content.' },
              ].map((c) => (
                <div key={c.title} className="border border-border rounded-xl p-4 bg-card">
                  <p className="font-semibold text-foreground text-sm mb-1">{c.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{c.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Split a PDF Online — Step by Step</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Using an online PDF splitter is the fastest and most accessible option. There is nothing to install, and the process works on any device. Here is how to split a PDF using ToolifyPDF:
            </p>
            <ol className="space-y-5">
              <Step n={1} title="Open the Split PDF tool" text="Go to the Split PDF page on ToolifyPDF using any web browser. The tool works on Windows, Mac, Linux, Android, and iOS." />
              <Step n={2} title="Upload your PDF file" text="Click the upload area or drag and drop your file directly onto the page. The tool accepts standard PDF files and processes them on the server securely." />
              <Step n={3} title="Choose how to split" text="Select your preferred split method: split into individual pages, split by a defined page range, or extract specific pages by number." />
              <Step n={4} title="Run the split" text="Click the Split PDF button. Processing is fast — most files are ready within a few seconds, even for documents with many pages." />
              <Step n={5} title="Download the results" text="Download the resulting files. If you split into multiple sections, each is saved as a separate PDF. If you extracted specific pages, those pages are saved as one combined PDF." />
            </ol>
            <div className="mt-8 text-center">
              <Link href="/split-pdf" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md" style={{ backgroundColor: ACCENT }}>
                Split PDF Now →
              </Link>
            </div>
          </section>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Does Splitting a PDF Affect Quality?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              This is one of the most common questions, and the answer is straightforward: no. Splitting a PDF does not affect the quality of the content at all. Unlike compression, which modifies image data or reduces resolution, splitting simply reorganizes pages into different files.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Text remains fully selectable and searchable. Images are reproduced at their original resolution. Fonts, colours, and layout are preserved exactly as they appeared in the original file. If you open the split output in any PDF viewer, it will appear identical to the corresponding pages in the source document.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The one exception to watch for is internal hyperlinks. Links within a document that point to other pages in the same file (such as a table of contents link that jumps to chapter 3) may no longer function correctly after splitting, since the destination page may now be in a different file. External links (to websites) are not affected.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-6">Common Questions About PDF Splitting</h2>
            <div className="space-y-4">
              <InfoCard title="Can I split a password-protected PDF?" body="You will need to remove the password first. Use the Unlock PDF tool on ToolifyPDF to decrypt the file, then return to the Split PDF tool. Attempting to split a locked file without first removing the password will result in an error." />
              <InfoCard title="What happens to my file after splitting?" body="Files uploaded to ToolifyPDF are processed for your requested task and automatically removed after a limited period. No account is required, and files are not stored permanently." />
              <InfoCard title="Can I split a very large PDF?" body="Yes. ToolifyPDF handles multi-page documents. If your file is unusually large, you may want to compress it first to speed up the upload and processing time." />
              <InfoCard title="Is there a limit on how many pages I can extract?" body="You can extract any combination of pages. There is no restriction on the number of pages you select when splitting by page range or extracting specific pages." />
              <InfoCard title="Will the split files be searchable?" body="Yes — as long as the original PDF had selectable text (not a flat image scan), the split output will also have searchable, selectable text. If the original is a scanned image, consider running OCR first." />
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">What to Do After Splitting Your PDF</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Once you have your separate files, a number of additional steps may be useful depending on your situation:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              {[
                { label: 'Compress PDF', href: '/compress-pdf', note: ' — If any of the resulting files are still large, reduce their size for easier sharing or uploading.' },
                { label: 'Protect PDF', href: '/protect-pdf', note: ' — Add a password to any section that contains sensitive or confidential information before sending.' },
                { label: 'Merge PDF', href: '/merge-pdf', note: ' — If you want to recombine sections in a different order, use the merge tool to join them as needed.' },
                { label: 'PDF to Word', href: '/pdf-to-word', note: ' — Convert a specific extracted section into an editable Word document for further editing.' },
                { label: 'Watermark PDF', href: '/watermark-pdf', note: ' — Add a watermark to individual sections before distributing them.' },
              ].map((l) => (
                <li key={l.href} className="flex items-start gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />
                  <span><Link href={l.href} className="font-medium hover:underline" style={{ color: ACCENT }}>{l.label}</Link>{l.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Splitting vs. Other PDF Operations: What Is the Difference?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              It helps to understand how splitting relates to other common PDF tasks so you can choose the right tool for each situation.
            </p>
            <div className="space-y-3">
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">Splitting vs. Merging</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Splitting divides one PDF into multiple files. Merging does the opposite — it combines multiple PDFs into one. The two operations are complementary: you might split a document to isolate sections, then later merge selected sections with other files.</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">Splitting vs. Compressing</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Compression reduces file size by optimizing the content within the file. Splitting reduces the apparent size of a file by distributing its pages across multiple smaller files. Both can help with upload limits, but they do so in fundamentally different ways.</p>
              </div>
              <div className="border border-border rounded-xl p-4 bg-card">
                <p className="font-semibold text-foreground text-sm mb-1">Splitting vs. Organizing</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Organizing (or rearranging) pages changes the order of pages within a single document without dividing it. Splitting creates separate files. If you want to reorder pages but keep everything in one file, use the <Link href="/organize-pdf" className="font-medium hover:underline" style={{ color: ACCENT }}>Organize PDF</Link> tool instead.</p>
              </div>
            </div>
          </section>

          <section className="mb-10 rounded-2xl border border-border p-6 bg-card">
            <h2 className="text-xl font-bold text-foreground mb-3">Summary</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Splitting a PDF is a straightforward task that can save significant time in document management, sharing, and compliance situations. The process preserves all content quality exactly as it was in the original file, requires no software installation, and can be completed in under a minute on any device.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Whether you are separating invoices, extracting a specific chapter, or isolating confidential pages for secure distribution, an online PDF splitter handles the job without complexity. After splitting, you have full flexibility to compress, protect, merge, or convert each section independently based on what you need.
            </p>
          </section>

        </article>
      </main>
    </>
  )
}
