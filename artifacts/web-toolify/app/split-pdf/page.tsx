import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { SplitPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/split-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Split PDF — Extract PDF Pages Online Free | Toolify' },
  description: 'Split a PDF into multiple files or extract specific pages online for free. Define page ranges, download as individual PDFs or ZIP.',
  keywords: ['split pdf', 'extract pdf pages', 'pdf splitter online', 'divide pdf', 'pdf page extractor free'],
  openGraph: {
    title: 'Split PDF — Extract PDF Pages Online Free | Toolify',
    description: 'Split a PDF into multiple files or extract specific pages online for free. Define page ranges, download as individual PDFs or ZIP.',
    url: 'https://www.toolifypdf.online/split-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Split PDF — Extract PDF Pages Online Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Split PDF — Extract PDF Pages Online Free | Toolify',
    description: 'Split a PDF into multiple files or extract specific pages online for free. Define page ranges, download as individual PDFs or ZIP.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function SplitPdfPage() {
  const tool = getToolBySlug('split-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <SplitPdfClient />
    </ToolPageServerLayout>
  )
}
