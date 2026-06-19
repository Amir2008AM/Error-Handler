import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PageNumbersClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/page-numbers' },
  robots: { index: true, follow: true },
  title: { absolute: 'Add Page Numbers to PDF — Free Tool | Toolify' },
  description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
  openGraph: {
    title: 'Add Page Numbers to PDF — Free Tool | Toolify',
    description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
    url: 'https://www.toolifypdf.online/page-numbers',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Add Page Numbers to PDF — Free Tool | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Add Page Numbers to PDF — Free Tool | Toolify',
    description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  return (
    <ToolPageServerLayout toolId="page-numbers"
      title="Add Page Numbers">
      <PageNumbersClient />
    </ToolPageServerLayout>
  )
}
