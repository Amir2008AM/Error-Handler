import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToJpgClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/pdf-to-jpg' },
  robots: { index: true, follow: true },
  title: { absolute: 'PDF to JPG — Convert PDF Pages to Images | Toolify' },
  description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
  openGraph: {
    title: 'PDF to JPG — Convert PDF Pages to Images | Toolify',
    description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
    url: 'https://www.toolifypdf.online/pdf-to-jpg',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'PDF to JPG — Convert PDF Pages to Images | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to JPG — Convert PDF Pages to Images | Toolify',
    description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('pdf-to-jpg')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToJpgClient />
    </ToolPageServerLayout>
  )
}
