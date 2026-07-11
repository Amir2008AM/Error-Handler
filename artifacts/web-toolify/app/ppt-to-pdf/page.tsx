import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PptToPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/ppt-to-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'PPT to PDF — Convert PowerPoint to PDF | Toolify' },
  description: 'Convert PowerPoint presentations (.pptx, .ppt) to PDF files. Free online PPT to PDF converter — preserves slides and formatting perfectly.',
  openGraph: {
    title: 'PPT to PDF — Convert PowerPoint to PDF | Toolify',
    description: 'Convert PowerPoint presentations (.pptx, .ppt) to PDF files. Free online PPT to PDF converter — preserves slides and formatting perfectly.',
    url: 'https://toolifypdf.online/ppt-to-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'PPT to PDF — Convert PowerPoint to PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PPT to PDF — Convert PowerPoint to PDF | Toolify',
    description: 'Convert PowerPoint presentations (.pptx, .ppt) to PDF files. Free online PPT to PDF converter — preserves slides and formatting perfectly.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('ppt-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PptToPdfClient />
    </ToolPageServerLayout>
  )
}
