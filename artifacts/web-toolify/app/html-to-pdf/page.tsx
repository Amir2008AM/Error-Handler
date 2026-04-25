import type { Metadata } from 'next'
import { HtmlToPdfClient } from './client'

export const metadata: Metadata = {
  title: 'HTML to PDF - Convert Web Content to PDF | Toolify',
  description: 'Convert HTML files or web content to PDF documents. Free online HTML to PDF converter.',
}

export default function HtmlToPdfPage() {
  return <HtmlToPdfClient />
}
