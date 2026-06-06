import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PageNumbersClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/page-numbers' },
  robots: { index: true, follow: true },
  title: 'Add Page Numbers to PDF - Free Online Tool | Toolify',
  description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
}

export default function Page() {
  return (
    <ToolPageServerLayout toolId="page-numbers"
      title="Add Page Numbers">
      <PageNumbersClient />
    </ToolPageServerLayout>
  )
}
