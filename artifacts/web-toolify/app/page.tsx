import type { Metadata } from 'next'
import { HomeContent } from '@/components/home-content'
import { PartnerBadges } from '@/components/partner-badges'

export const metadata: Metadata = {
  title: { absolute: 'Toolify — Free PDF, Image & Document Tools Online' },
  description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
  alternates: { canonical: 'https://www.toolifypdf.online' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Toolify — Free PDF, Image & Document Tools Online',
    description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
    url: 'https://www.toolifypdf.online',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Toolify — Free PDF, Image & Document Tools Online' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toolify — Free PDF, Image & Document Tools Online',
    description: 'Free online tools for PDF, images, text, and conversions. Compress images, merge PDFs, convert files, and more — no registration needed.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}

function HomeFAQSection() {
  const faqs = [
    {
      q: 'Are Toolify PDF tools really free?',
      a: 'Yes. All tools on Toolify are completely free to use. There are no hidden fees, no subscriptions, and no registration required.',
    },
    {
      q: 'Do I need to install any software?',
      a: 'No installation needed. Toolify runs entirely in your browser. Just open the tool, upload your file, and download the result.',
    },
    {
      q: 'Is my data safe when I use Toolify?',
      a: 'Yes. All file transfers are encrypted with HTTPS. Your files are automatically deleted from our servers after processing. We never share your files with third parties.',
    },
    {
      q: 'How do I merge PDF files?',
      a: 'Open the Merge PDF tool, upload two or more PDF files, drag to reorder if needed, then click Merge. Download your combined PDF instantly.',
    },
    {
      q: 'Can I compress a PDF without losing quality?',
      a: 'Yes. Our Compress PDF tool reduces file size while preserving readability. You can choose your preferred compression level to balance size and quality.',
    },
    {
      q: 'How do I convert PDF to Word?',
      a: 'Use the PDF to Word tool. Upload your PDF, click Convert, and download the editable .docx file. The converter preserves formatting as closely as possible.',
    },
    {
      q: 'What image formats does Toolify support?',
      a: 'Toolify supports JPG, PNG, WebP, GIF, and more. You can convert between formats, compress, resize, crop, or remove backgrounds directly in your browser.',
    },
    {
      q: 'Can AI crawlers like ChatGPT and Google Gemini read this site?',
      a: 'Yes. Toolify is fully accessible to AI crawlers. We have explicitly allowed GPTBot, ClaudeBot, Google-Extended, PerplexityBot, and all major AI indexing bots in our robots.txt.',
    },
  ]

  return (
    <section
      aria-label="Frequently Asked Questions"
      className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-16"
    >
      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center">
        Frequently Asked Questions
      </h2>
      <p className="text-muted-foreground text-center mb-10 text-sm md:text-base">
        Everything you need to know about Toolify PDF &amp; Image tools.
      </p>
      <div className="divide-y divide-border rounded-2xl border border-border bg-white overflow-hidden">
        {faqs.map(({ q, a }) => (
          <div key={q} className="px-6 py-5">
            <h3 className="font-semibold text-foreground text-base mb-1">{q}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{a}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HomeSEODescription() {
  return (
    <section
      aria-label="About Toolify"
      className="bg-muted/30 border-t border-border"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 md:py-14 space-y-6 text-sm text-muted-foreground leading-relaxed">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          Free PDF &amp; Image Tools — No Sign-Up Required
        </h2>
        <p>
          Toolify is a free online toolkit for working with PDF files and images. Whether you need to{' '}
          <a href="/merge-pdf" className="text-primary underline underline-offset-2">merge PDF files</a>,{' '}
          <a href="/compress-pdf" className="text-primary underline underline-offset-2">compress a PDF</a>,{' '}
          <a href="/pdf-to-word" className="text-primary underline underline-offset-2">convert PDF to Word</a>, or{' '}
          <a href="/compress-image" className="text-primary underline underline-offset-2">compress an image</a>,
          Toolify handles it instantly — directly in your browser, with no software to install and no account needed.
        </p>
        <p>
          All processing happens client-side using WebAssembly, which means your files never leave your device.
          Your privacy is protected by default. Every tool is free, fast, and works on desktop, tablet, and mobile.
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-foreground pt-2">
          PDF Tools
        </h2>
        <p>
          Our PDF tools cover every common task:{' '}
          <a href="/pdf-editor" className="text-primary underline underline-offset-2">PDF Editor</a>,{' '}
          <a href="/merge-pdf" className="text-primary underline underline-offset-2">Merge PDF</a>,{' '}
          <a href="/split-pdf" className="text-primary underline underline-offset-2">Split PDF</a>,{' '}
          <a href="/compress-pdf" className="text-primary underline underline-offset-2">Compress PDF</a>,{' '}
          <a href="/rotate-pdf" className="text-primary underline underline-offset-2">Rotate PDF</a>,{' '}
          <a href="/organize-pdf" className="text-primary underline underline-offset-2">Organize PDF</a>,{' '}
          <a href="/watermark-pdf" className="text-primary underline underline-offset-2">Watermark PDF</a>,{' '}
          <a href="/protect-pdf" className="text-primary underline underline-offset-2">Protect PDF</a>, and{' '}
          <a href="/unlock-pdf" className="text-primary underline underline-offset-2">Unlock PDF</a>.
          All tools are free and require no registration.
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-foreground pt-2">
          PDF Converters
        </h2>
        <p>
          Convert between PDF and popular formats:{' '}
          <a href="/pdf-to-word" className="text-primary underline underline-offset-2">PDF to Word</a>,{' '}
          <a href="/word-to-pdf" className="text-primary underline underline-offset-2">Word to PDF</a>,{' '}
          <a href="/pdf-to-excel" className="text-primary underline underline-offset-2">PDF to Excel</a>,{' '}
          <a href="/excel-to-pdf" className="text-primary underline underline-offset-2">Excel to PDF</a>,{' '}
          <a href="/pdf-to-ppt" className="text-primary underline underline-offset-2">PDF to PowerPoint</a>,{' '}
          <a href="/ppt-to-pdf" className="text-primary underline underline-offset-2">PowerPoint to PDF</a>,{' '}
          <a href="/pdf-to-jpg" className="text-primary underline underline-offset-2">PDF to JPG</a>, and{' '}
          <a href="/image-to-pdf" className="text-primary underline underline-offset-2">Image to PDF</a>.
        </p>
        <h2 className="text-xl md:text-2xl font-bold text-foreground pt-2">
          Image Tools
        </h2>
        <p>
          Edit and convert images online:{' '}
          <a href="/compress-image" className="text-primary underline underline-offset-2">Compress Image</a>,{' '}
          <a href="/resize-image" className="text-primary underline underline-offset-2">Resize Image</a>,{' '}
          <a href="/crop-image" className="text-primary underline underline-offset-2">Crop Image</a>, and{' '}
          <a href="/convert-image" className="text-primary underline underline-offset-2">Convert Image</a> between JPG, PNG, WebP, and GIF.
        </p>
      </div>
    </section>
  )
}

export default async function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <HomeContent badgeSlot={<PartnerBadges />} />
      <HomeFAQSection />
      <HomeSEODescription />
    </div>
  )
}
