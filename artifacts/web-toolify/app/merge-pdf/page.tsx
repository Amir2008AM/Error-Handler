import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { MergePdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/merge-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Merge PDF — Combine Multiple PDFs Online | Toolify' },
  description: 'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up.',
  keywords: ['merge pdf', 'combine pdf', 'join pdf files online', 'pdf merger free', 'merge pdf online'],
  openGraph: {
    title: 'Merge PDF — Combine Multiple PDFs Online | Toolify',
    description: 'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up.',
    url: 'https://www.toolifypdf.online/merge-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Merge PDF — Combine Multiple PDFs Online | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merge PDF — Combine Multiple PDFs Online | Toolify',
    description: 'Merge multiple PDF files into one online for free. Upload your PDFs, arrange their order, and download a single combined PDF. No sign-up.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function MergePdfPage() {
  const tool = getToolBySlug('merge-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <MergePdfClient />
    </ToolPageServerLayout>
  )
}
