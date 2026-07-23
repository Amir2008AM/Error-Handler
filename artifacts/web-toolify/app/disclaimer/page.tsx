import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Disclaimer — ToolifyPDF Limitations & Liability' },
  description: 'Disclaimer for ToolifyPDF — important information about the limitations and proper use of our free online PDF and image tools.',
  alternates: {
    canonical: 'https://toolifypdf.online/disclaimer',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Disclaimer — ToolifyPDF Limitations & Liability',
    description: 'Disclaimer for ToolifyPDF — important information about the limitations and proper use of our free online PDF and image tools.',
    url: 'https://toolifypdf.online/disclaimer',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Disclaimer — ToolifyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Disclaimer — ToolifyPDF Limitations & Liability',
    description: 'Disclaimer for ToolifyPDF — important information about the limitations and proper use of our free online PDF and image tools.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Disclaimer</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 2026</p>

        <div className="space-y-8 mb-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. General Information Only</h2>
            <p className="text-muted-foreground leading-relaxed">
              ToolifyPDF provides free, automated tools for PDF, image, and document processing for general informational and productivity purposes. The Service is not intended to replace professional, legal, or certified document services, and nothing on this website constitutes professional advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Automated Processing Limitations</h2>
            <p className="text-muted-foreground leading-relaxed">
              All file processing on ToolifyPDF is fully automated and is not manually reviewed. As with any automated tool, results may occasionally vary depending on the source file&apos;s complexity, formatting, fonts, or quality. For example, document conversion may not perfectly preserve complex layouts, OCR text extraction accuracy depends on image quality, and PDF rendering relies on open-source engines that may not match the exact output of proprietary software such as Adobe Acrobat for uncommon fonts or intricate vector graphics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. No Warranty</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, whether express or implied, including but not limited to warranties of accuracy, reliability, or fitness for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, ToolifyPDF is not liable for any direct, indirect, incidental, or consequential damages, including loss of data or files, arising from the use of, or inability to use, the Service. Users are responsible for keeping backup copies of any important files before uploading them for processing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Third-Party Content and Advertising</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our website may display advertisements served by third parties, such as Google AdSense, and may link to external websites. We do not control and are not responsible for the content, accuracy, or practices of third-party advertisers or linked websites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Changes to This Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Disclaimer from time to time. Continued use of the Service after changes are posted constitutes acceptance of the updated Disclaimer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Disclaimer, please contact us at contact@toolifypdf.online or through our{' '}
              <Link href="/contact-us" className="text-primary hover:underline">Contact page</Link>.
            </p>
          </section>
        </div>

        <div className="border-t border-border pt-6 mt-2">
          <p className="text-sm font-medium text-foreground mb-3">Explore our free tools:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/merge-pdf" className="hover:text-foreground transition-colors">Merge PDF</Link>
            <Link href="/compress-pdf" className="hover:text-foreground transition-colors">Compress PDF</Link>
            <Link href="/pdf-to-word" className="hover:text-foreground transition-colors">PDF to Word</Link>
            <Link href="/image-to-pdf" className="hover:text-foreground transition-colors">Image to PDF</Link>
            <Link href="/split-pdf" className="hover:text-foreground transition-colors">Split PDF</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
