import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { WatermarkPdfClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/watermark-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Add Watermark to PDF — Free Online Tool | Toolify' },
  description: 'Add text or image watermarks to your PDF documents. Customize position, opacity, and font size. Free online watermark tool, no sign-up.',
  openGraph: {
    title: 'Add Watermark to PDF — Free Online Tool | Toolify',
    description: 'Add text or image watermarks to your PDF documents. Customize position, opacity, and font size. Free online watermark tool, no sign-up.',
    url: 'https://www.toolifypdf.online/watermark-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Add Watermark to PDF — Free Online Tool | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add Watermark to PDF — Free Online Tool | Toolify',
    description: 'Add text or image watermarks to your PDF documents. Customize position, opacity, and font size. Free online watermark tool, no sign-up.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function WatermarkPdfPage() {
  const tool = getToolBySlug('watermark-pdf')
  if (!tool) notFound()

  return (
    <ToolPageServerLayout tool={tool}>
      <WatermarkPdfClient />
    </ToolPageServerLayout>
  )
}
