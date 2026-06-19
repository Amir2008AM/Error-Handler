import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { HtmlToPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/html-to-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'HTML to PDF — Convert Web Content to PDF | Toolify' },
  description: 'Convert HTML files or web page URLs to PDF documents online for free. Fast, accurate HTML to PDF converter with no registration required.',
  openGraph: {
    title: 'HTML to PDF — Convert Web Content to PDF | Toolify',
    description: 'Convert HTML files or web page URLs to PDF documents online for free. Fast, accurate HTML to PDF converter with no registration required.',
    url: 'https://www.toolifypdf.online/html-to-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'HTML to PDF — Convert Web Content to PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HTML to PDF — Convert Web Content to PDF | Toolify',
    description: 'Convert HTML files or web page URLs to PDF documents online for free. Fast, accurate HTML to PDF converter with no registration required.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('html-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <HtmlToPdfClient />
    </ToolPageServerLayout>
  )
}
