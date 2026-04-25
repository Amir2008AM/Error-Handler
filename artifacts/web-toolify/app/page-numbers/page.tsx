import type { Metadata } from 'next'
import { PageNumbersClient } from './client'

export const metadata: Metadata = {
  title: 'Add Page Numbers to PDF - Free Online Tool | Toolify',
  description: 'Add page numbers to your PDF documents. Choose position, format (numeric, roman, page X of Y), and customize appearance. Free online tool.',
}

export default function PageNumbersPage() {
  return <PageNumbersClient />
}
