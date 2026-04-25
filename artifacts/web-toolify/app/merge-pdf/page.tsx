import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { MergePdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Merge PDF — Combine Multiple PDFs Online Free',
  description:
    'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up, instant results.',
  keywords: ['merge pdf', 'combine pdf', 'join pdf files online', 'pdf merger free', 'merge pdf online'],
}

export default function MergePdfPage() {
  const tool = getToolBySlug('merge-pdf')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <MergePdfClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
