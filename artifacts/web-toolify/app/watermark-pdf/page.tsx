import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { WatermarkPdfClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/watermark-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Add Watermark to PDF Online — Free Text & Image Watermarks | ToolifyPDF' },
  description: 'Add text or image watermarks to PDF files online. Set font, color, opacity, rotation, position, and page ranges without signing up.',
  openGraph: {
    title: 'Add Watermark to PDF Online — Free Text & Image Watermarks | ToolifyPDF',
    description: 'Add text or image watermarks to PDF files online. Set font, color, opacity, rotation, position, and page ranges without signing up.',
    url: 'https://toolifypdf.online/watermark-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Add Watermark to PDF Online with text and image watermark controls' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add Watermark to PDF Online — Free Text & Image Watermarks | ToolifyPDF',
    description: 'Add text or image watermarks to PDF files online. Set font, color, opacity, rotation, position, and page ranges without signing up.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function WatermarkPdfPage() {
  const tool = getToolBySlug('watermark-pdf')
  if (!tool) notFound()

  const faq = [
    ['Can I add an image watermark to a PDF?', 'Yes. Select Image watermark and upload a PNG, JPG, or SVG file up to 10 MB. The preview shows its scale, opacity, rotation, and position before processing.'],
    ['Can I watermark only selected pages?', 'Yes. Enter a range such as 1-3, 1,4,7, or 1-5,8-10 in Page range. Leave it as all to apply the watermark to every page.'],
    ['Can I change the opacity?', 'Yes. Use the Opacity slider to make a text or image watermark more subtle or more visible.'],
    ['Can I change the font and color?', 'Text watermarks support Helvetica, Times-Roman, or Courier, plus a font size, text color, and optional background color.'],
    ['Will the watermark appear on every page?', 'It will appear on all pages when Page range is set to all. A specific range limits it to the pages you enter.'],
    ['Are uploaded files deleted after processing?', 'Temporary uploaded files are removed after processing. See the site privacy information for details about file handling.'],
    ['Does the tool work with scanned PDFs?', 'The tool applies a watermark to PDF pages, including scanned pages, without requiring selectable text.'],
  ]
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(([question, answer]) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }

  return (
     <ToolPageServerLayout tool={tool} title="Add Watermark to PDF Online">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <WatermarkPdfClient />
      <div className="mt-12 space-y-10 border-t border-border pt-10">
        <section>
          <h2 className="text-xl font-bold text-foreground">Why add a watermark to a PDF?</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">A light watermark identifies ownership and document status without obscuring the page. Use a draft label during review, a confidential label for sensitive files, or a logo for consistent client-facing branding.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-foreground">Text or image watermark</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/20 p-5"><h3 className="font-semibold">Text watermark</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Choose the font, size, color, optional background, opacity, rotation, and position for a clear status label or brand name.</p></div>
            <div className="rounded-xl border border-border bg-muted/20 p-5"><h3 className="font-semibold">Image watermark</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Upload a PNG, JPG, or SVG logo, then adjust its scale, transparency, rotation, position, and page range in the live preview.</p></div>
          </div>
           <figure className="mx-auto mt-5 max-w-4xl overflow-hidden rounded-xl border border-border bg-muted/20">
             <img
               src="/images/text-vs-image-watermark.jpg"
               alt="Comparison showing a diagonal text watermark and a logo image watermark on sample PDF pages"
               width={1280}
               height={720}
               loading="lazy"
               className="h-auto w-full"
             />
             <figcaption className="px-4 py-3 text-xs text-muted-foreground">Use a text label for document status or an image watermark for a logo and visual branding.</figcaption>
           </figure>
        </section>
        <section>
          <h2 className="text-xl font-bold text-foreground">How to add a watermark to a PDF</h2>
          <ol className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
            <li className="rounded-xl bg-muted/30 p-4"><strong className="text-foreground">1. Upload</strong><br />Choose one PDF or drop it into the tool.</li>
            <li className="rounded-xl bg-muted/30 p-4"><strong className="text-foreground">2. Customize</strong><br />Select text or image mode and tune the visible settings.</li>
            <li className="rounded-xl bg-muted/30 p-4"><strong className="text-foreground">3. Download</strong><br />Apply the watermark and download the new PDF.</li>
          </ol>
        </section>
        <section>
          <h2 className="text-xl font-bold text-foreground">Watermark settings</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Opacity controls transparency, rotation changes the angle, and position places the mark at the top, center, bottom, or diagonally. Page ranges accept all or comma-separated pages and ranges such as 1-3, 1,4,7.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-foreground">When should you use a watermark?</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">Mark working copies as drafts, identify confidential documents before sharing, or add a subtle logo to distributed PDFs. Keep opacity low enough to preserve readability while making document status clear.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-foreground">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-border rounded-xl border border-border">
            {faq.map(([question, answer]) => <details key={question} className="group p-4"><summary className="cursor-pointer list-none pr-6 font-semibold text-foreground marker:hidden">{question}<span className="float-right text-primary transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{answer}</p></details>)}
          </div>
        </section>
      </div>
    </ToolPageServerLayout>
  )
}
