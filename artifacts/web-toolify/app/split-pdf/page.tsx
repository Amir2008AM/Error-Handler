import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { SplitPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/split-pdf' },
  robots: { index: true, follow: true },
  title: 'Split PDF — Extract Pages from PDF Online Free',
  description:
    'Split a PDF into multiple files or extract specific pages online for free. Define page ranges, download as individual PDFs or ZIP. No registration needed.',
  keywords: ['split pdf', 'extract pdf pages', 'pdf splitter online', 'divide pdf', 'pdf page extractor free'],
}

export default function SplitPdfPage() {
  const tool = getToolBySlug('split-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <SplitPdfClient />
    </ToolPageServerLayout>
  )
}
