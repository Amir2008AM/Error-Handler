import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { MergePdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/merge-pdf' },
  robots: { index: true, follow: true },
  title: 'Merge PDF — Combine Multiple PDFs Online Free | Toolify',
  description:
    'Merge PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF instantly. No sign-up required.',
  keywords: ['merge pdf', 'merge pdf online', 'combine pdf', 'join pdf files online', 'pdf merger free', 'merge pdf files'],
}

export default function MergePdfPage() {
  const tool = getToolBySlug('merge-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <MergePdfClient />
    </ToolPageServerLayout>
  )
}
