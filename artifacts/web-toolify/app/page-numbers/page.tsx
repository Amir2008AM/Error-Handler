import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PageNumbersClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/page-numbers' },
  robots: { index: true, follow: true },
  title: { absolute: 'Add Page Numbers to PDF — Free Tool | Toolify' },
  description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
  openGraph: {
    title: 'Add Page Numbers to PDF — Free Tool | Toolify',
    description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
    url: 'https://toolifypdf.online/page-numbers',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Add Page Numbers to PDF — Free Tool | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add Page Numbers to PDF — Free Tool | Toolify',
    description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  return (
    <ToolPageServerLayout toolId="page-numbers"
      title="Add Page Numbers">
      <PageNumbersClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📄",
                    "title": "Professional reports and contracts",
                    "text": "Page numbers let readers and reviewers reference specific sections precisely."
              },
              {
                    "icon": "🔢",
                    "title": "Start from a custom number",
                    "text": "Begin numbering at page 3 or 5 when the first pages are a cover or table of contents."
              },
              {
                    "icon": "🧩",
                    "title": "Unified numbering after merging",
                    "text": "After combining PDFs from different sources, add consistent page numbers across the whole file."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
