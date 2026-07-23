import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { WatermarkPdfClient } from './client'
import { notFound } from 'next/navigation'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/watermark-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Add Watermark to PDF — Free Online Tool | Toolify' },
  description: 'Add text or image watermarks to your PDF documents. Customize position, opacity, and font size. Free online watermark tool, no sign-up.',
  openGraph: {
    title: 'Add Watermark to PDF — Free Online Tool | Toolify',
    description: 'Add text or image watermarks to your PDF documents. Customize position, opacity, and font size. Free online watermark tool, no sign-up.',
    url: 'https://toolifypdf.online/watermark-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Add Watermark to PDF — Free Online Tool | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add Watermark to PDF — Free Online Tool | Toolify',
    description: 'Add text or image watermarks to your PDF documents. Customize position, opacity, and font size. Free online watermark tool, no sign-up.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function WatermarkPdfPage() {
  const tool = getToolBySlug('watermark-pdf')
  if (!tool) notFound()

  return (
    <ToolPageServerLayout tool={tool}>
      <WatermarkPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📝",
                    "title": "Mark drafts clearly",
                    "text": "Add \"DRAFT\" so reviewers know the document is not the final approved version."
              },
              {
                    "icon": "🔒",
                    "title": "Label confidential documents",
                    "text": "Stamp \"CONFIDENTIAL\" on sensitive files before forwarding them by email."
              },
              {
                    "icon": "🏷️",
                    "title": "Brand client-facing PDFs",
                    "text": "Add your company name as a light background watermark to any document you distribute."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
