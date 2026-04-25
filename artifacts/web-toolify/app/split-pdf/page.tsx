import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { SplitPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Split PDF — Extract Pages from PDF Online Free',
  description:
    'Split a PDF into multiple files or extract specific pages online for free. Define page ranges, download as individual PDFs or ZIP. No registration needed.',
  keywords: ['split pdf', 'extract pdf pages', 'pdf splitter online', 'divide pdf', 'pdf page extractor free'],
}

export default function SplitPdfPage() {
  const tool = getToolBySlug('split-pdf')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <SplitPdfClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
