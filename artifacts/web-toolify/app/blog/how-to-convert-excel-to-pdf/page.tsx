import type { Metadata } from 'next'
import Link from 'next/link'
import { AdBanner } from '@/components/ad-banner'
import { ReadingProgress } from '@/components/reading-progress'
import { RelatedArticles } from '@/components/related-articles'

export const metadata: Metadata = {
  title: { absolute: 'How to Convert Excel to PDF Online for Free | ToolifyPDF Blog' },
  description:
    'Learn how to convert Excel spreadsheets to PDF files online for free. A practical guide covering formatting tips, common problems, and when PDF is better than XLS for sharing data.',
  alternates: { canonical: 'https://toolifypdf.online/blog/how-to-convert-excel-to-pdf' },
  openGraph: {
    title: 'How to Convert Excel to PDF Online for Free',
    description: 'Convert Excel spreadsheets to PDF with proper formatting. Step-by-step guide for free online conversion.',
    type: 'article',
    publishedTime: '2026-06-11T00:00:00.000Z',
    url: 'https://toolifypdf.online/blog/how-to-convert-excel-to-pdf',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', title: 'How to Convert Excel to PDF Online for Free', description: 'Convert Excel files to PDF online. Practical guide covering formatting and common issues.' , images: ['https://toolifypdf.online/og-image.jpg'] },
}

const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: 'How to Convert Excel to PDF Online for Free',
  image: 'https://toolifypdf.online/og-image.jpg',
  description: 'Learn how to convert Excel spreadsheets to PDF files online for free, with tips on formatting and common issues.',
  datePublished: '2026-06-11T00:00:00.000Z',
  dateModified: '2026-06-11T00:00:00.000Z',
  author: { '@type': 'Organization', name: 'ToolifyPDF Team', url: 'https://toolifypdf.online/author/toolifypdf-team' },
  publisher: { '@type': 'Organization', name: 'ToolifyPDF', url: 'https://toolifypdf.online', logo: { '@type': 'ImageObject', url: 'https://toolifypdf.online/favicon.png' } },
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://toolifypdf.online/blog/how-to-convert-excel-to-pdf' },
  articleSection: 'Spreadsheet Guide',
  keywords: 'convert excel to pdf, excel to pdf online free, xlsx to pdf, spreadsheet to pdf, export excel as pdf',
}

const ACCENT = '#e11d48'

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-4 items-start">
      <span className="flex-shrink-0 w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center mt-0.5" style={{ backgroundColor: ACCENT }}>{n}</span>
      <div className="pt-1">
        <p className="font-semibold text-foreground mb-1 text-sm">{title}</p>
        <p className="text-muted-foreground leading-relaxed text-sm">{text}</p>
      </div>
    </li>
  )
}

export default function ArticlePage() {
  return (
    <>
      <ReadingProgress color={ACCENT} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <main className="min-h-screen bg-background">
        <article className="max-w-3xl mx-auto px-4 py-12" itemScope itemType="https://schema.org/BlogPosting">

          <nav aria-label="Breadcrumb" className="mb-8">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
              <li aria-hidden="true">›</li>
              <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">How to Convert Excel to PDF</li>
            </ol>
          </nav>

          <header className="mb-10">
            <div className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full mb-5" style={{ backgroundColor: '#fff1f2', color: ACCENT }}>
              Spreadsheet Guide
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4" itemProp="headline">
              How to Convert Excel to PDF Online for Free
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg mb-6" itemProp="description">
              Sharing a spreadsheet as a PDF preserves your layout, prevents accidental edits, and makes the data viewable on any device without requiring Excel. This guide explains why converting Excel files to PDF is often the right choice, how to do it online in seconds, and how to prepare your spreadsheet to avoid common formatting problems in the output.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <time dateTime="2026-06-11" itemProp="datePublished">June 11, 2026</time>
              <span>·</span><span>8 min read</span><span>·</span>
              <span itemProp="author" itemScope itemType="https://schema.org/Organization"><Link href="/author/toolifypdf-team" itemProp="name" className="hover:text-foreground hover:underline">ToolifyPDF</Link></span>
            </div>
          </header>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Why Convert an Excel File to PDF?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Excel files are powerful tools for working with data — but they are not always the right format for sharing results. There are several situations where a PDF version of a spreadsheet is clearly the better choice.
            </p>
            <div className="space-y-3">
              {[
                {
                  title: 'The recipient does not have Excel',
                  body: 'Not everyone has Microsoft Excel or a compatible application installed. A PDF file can be opened on any device with any browser or PDF viewer — no software licence or subscription required.',
                },
                {
                  title: 'You want to prevent editing',
                  body: 'Sharing an Excel file gives the recipient full ability to modify the data, add or remove rows, and change formulas. A PDF presents the content in a fixed, read-only format that cannot be accidentally changed.',
                },
                {
                  title: 'You need a consistent visual presentation',
                  body: 'Excel formatting can render differently depending on the version of Excel or the application used to open it. A PDF looks identical on every device, ensuring the recipient sees exactly what you intended.',
                },
                {
                  title: 'You are submitting a report or invoice',
                  body: 'Financial reports, invoices, budget summaries, and expense sheets are almost universally expected as PDF when submitted to clients, auditors, or government systems. PDF is the standard format for formal document submission.',
                },
                {
                  title: 'You need a permanent record',
                  body: 'A PDF of a spreadsheet serves as a snapshot of the data at a specific point in time. Unlike a live Excel file where formulas and data may change, the PDF captures the state of the report at the moment it was created.',
                },
              ].map((item) => (
                <div key={item.title} className="border border-border rounded-xl p-4 bg-card">
                  <p className="font-semibold text-foreground text-sm mb-1">{item.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">How to Convert Excel to PDF Online — Step by Step</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Converting an Excel file to PDF online takes under a minute and requires no software installation.
            </p>
            <ol className="space-y-5">
              <Step n={1} title="Open the Excel to PDF tool" text="Go to the Excel to PDF page on ToolifyPDF in any web browser. The tool works on Windows, Mac, Android, and iOS without requiring any software installation." />
              <Step n={2} title="Upload your Excel file" text="Upload your .xlsx or .xls file by clicking the upload area or dragging the file onto the page. Both current and older Excel formats are supported." />
              <Step n={3} title="Convert the file" text="Click the Convert button. The system processes your spreadsheet and generates a PDF that preserves your data, column widths, formatting, and grid layout." />
              <Step n={4} title="Download the PDF" text="Download the resulting PDF file. Open it to verify the layout before sharing or submitting it." />
            </ol>
            <div className="mt-8 text-center">
              <Link href="/excel-to-pdf" className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-md" style={{ backgroundColor: ACCENT }}>
                Convert Excel to PDF →
              </Link>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Common Excel to PDF Formatting Problems and How to Avoid Them</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Spreadsheet-to-PDF conversion occasionally produces output that does not match the Excel layout. Most issues are caused by spreadsheet settings rather than the conversion process itself, and they can be avoided by following a few preparation steps.
            </p>
            <div className="space-y-4">
              {[
                {
                  problem: 'Columns are cut off at the page edge',
                  solution: 'This happens when the spreadsheet is wider than the page. Before converting, review how many columns your data spans. If the table is very wide, consider transposing it (switching rows and columns) or reducing column widths to fit within a standard page width.',
                },
                {
                  problem: 'Data runs across many pages with no header row',
                  solution: 'Long tables in Excel can be set to repeat the header row on every printed page. In Excel, this is configured under Page Layout > Print Titles. If you are converting without modifying Excel settings, check that the PDF output is still readable.',
                },
                {
                  problem: 'Formula cells show an error value',
                  solution: 'If any cells contain formula errors (such as #DIV/0! or #REF!), those errors will appear in the PDF. Resolve formula errors in the original Excel file before converting, or replace error cells with appropriate text or a zero value.',
                },
                {
                  problem: 'Merged cells cause alignment issues',
                  solution: 'Heavily merged cells can sometimes produce unexpected layout shifts during conversion. For critical documents, review the PDF output carefully after conversion to verify that merged areas have rendered correctly.',
                },
              ].map((item) => (
                <div key={item.problem} className="border border-border rounded-xl p-5 bg-card">
                  <p className="font-semibold text-foreground mb-2 text-sm" style={{ color: ACCENT }}>{item.problem}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.solution}</p>
                </div>
              ))}
            </div>
          </section>

          <AdBanner slot="6978025975" format="horizontal" className="my-6" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Excel Formats Explained: .xlsx vs. .xls</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Excel files come in two common formats. Understanding the difference can help if you encounter compatibility issues.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Format</th>
                    <th className="text-left py-3 pr-4 font-semibold text-foreground">Standard</th>
                    <th className="text-left py-3 font-semibold text-foreground">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ['.xlsx', 'Current standard (Excel 2007 onwards)', 'XML-based format. Smaller file size, better compatibility with modern tools.'],
                    ['.xls', 'Legacy format (Excel 97–2003)', 'Binary format. Still widely used but increasingly replaced by .xlsx.'],
                  ].map(([fmt, std, note]) => (
                    <tr key={fmt} className="border-b border-border/50">
                      <td className="py-3 pr-4 font-medium text-foreground">{fmt}</td>
                      <td className="py-3 pr-4">{std}</td>
                      <td className="py-3">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Both formats are supported by the ToolifyPDF Excel to PDF converter.</p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">When You Might Want to Convert PDF Back to Excel</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Sometimes you receive a PDF that contains tabular data — a financial report, a price list, or a statement from a bank or supplier — and you need to work with that data in a spreadsheet. In those cases, converting the PDF to Excel is the correct approach.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The <Link href="/pdf-to-excel" className="font-medium hover:underline" style={{ color: ACCENT }}>PDF to Excel</Link> tool on ToolifyPDF extracts tabular data from PDF files and places it into a spreadsheet format. This works best when the PDF was originally created from a digital source (not a scanned image). Scanned PDFs may require OCR processing first.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              After extracting the data into Excel, you can run calculations, sort and filter the data, and make any edits needed before sharing the final result as a PDF again.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-4">Related Document Conversions</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you regularly work with documents across different formats, these related tools may also be useful:
            </p>
            <ul className="space-y-3 text-muted-foreground">
              {[
                { label: 'PDF to Excel', href: '/pdf-to-excel', note: ' — Extract tabular data from a PDF into an editable spreadsheet.' },
                { label: 'Word to PDF', href: '/word-to-pdf', note: ' — Convert Word documents to PDF for sharing and submission.' },
                { label: 'PowerPoint to PDF', href: '/ppt-to-pdf', note: ' — Convert presentation files to PDF for universal viewing.' },
                { label: 'Compress PDF', href: '/compress-pdf', note: ' — Reduce the size of your PDF after conversion for easier sharing.' },
              ].map((l) => (
                <li key={l.href} className="flex items-start gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />
                  <span><Link href={l.href} className="font-medium hover:underline" style={{ color: ACCENT }}>{l.label}</Link>{l.note}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10 rounded-2xl border border-border p-6 bg-card">
            <h2 className="text-xl font-bold text-foreground mb-3">Summary</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Converting an Excel spreadsheet to PDF is the right step whenever you need to share data in a format that is fixed, universally accessible, and protected from accidental editing. The process is fast, requires no software, and produces a PDF that looks identical on every device.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The most common issues in Excel to PDF conversion — columns being cut off, missing header rows, and formula errors — are all preventable by reviewing the spreadsheet before converting. A few minutes of preparation ensures the output is clean and professional.
            </p>
          </section>

          <RelatedArticles slugs={['how-to-convert-word-to-pdf', 'how-to-convert-powerpoint-to-pdf', 'how-to-convert-pdf-to-word']} />
        </article>
      </main>
    </>
  )
}
