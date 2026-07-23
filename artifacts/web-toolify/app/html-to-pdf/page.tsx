import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { HtmlToPdfClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/html-to-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'HTML to PDF Converter — Free & Online | ToolifyPDF' },
  description: 'Convert HTML files or web page URLs to PDF documents online for free. Fast, accurate HTML to PDF converter with no registration required.',
  openGraph: {
    title: 'HTML to PDF Converter — Free & Online | ToolifyPDF',
    description: 'Convert HTML files or web page URLs to PDF documents online for free. Fast, accurate HTML to PDF converter with no registration required.',
    url: 'https://toolifypdf.online/html-to-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'HTML to PDF Converter | ToolifyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HTML to PDF Converter — Free & Online | ToolifyPDF',
    description: 'Convert HTML files or web page URLs to PDF documents online for free. Fast, accurate HTML to PDF converter with no registration required.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('html-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool} title="HTML to PDF Converter">
      <HtmlToPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📰",
                    "title": "Save articles for offline reading",
                    "text": "Capture an article, guide, or documentation page as a PDF to read without an internet connection."
              },
              {
                    "icon": "🗃️",
                    "title": "Archive web content permanently",
                    "text": "Preserve a page exactly as it appears today before it is updated, moved, or removed."
              },
              {
                    "icon": "📊",
                    "title": "Export web-based reports",
                    "text": "Convert online dashboards or data tables to PDF to share with people who do not have access."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
