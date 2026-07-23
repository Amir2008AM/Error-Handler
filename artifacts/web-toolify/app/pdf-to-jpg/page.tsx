import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToJpgClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/pdf-to-jpg' },
  robots: { index: true, follow: true },
  title: { absolute: 'PDF to JPG — Convert PDF Pages to Images | Toolify' },
  description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
  openGraph: {
    title: 'PDF to JPG — Convert PDF Pages to Images | Toolify',
    description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
    url: 'https://toolifypdf.online/pdf-to-jpg',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'PDF to JPG — Convert PDF Pages to Images | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to JPG — Convert PDF Pages to Images | Toolify',
    description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('pdf-to-jpg')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToJpgClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📤",
                    "title": "Share individual pages as images",
                    "text": "Send a single page as a JPG instead of the entire PDF — smaller and viewable on any device."
              },
              {
                    "icon": "🖼️",
                    "title": "Insert pages into presentations",
                    "text": "Embed a PDF page as an image directly into a slide deck or document."
              },
              {
                    "icon": "📱",
                    "title": "View without a PDF reader",
                    "text": "JPG files open on every phone and computer without needing any additional application."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
