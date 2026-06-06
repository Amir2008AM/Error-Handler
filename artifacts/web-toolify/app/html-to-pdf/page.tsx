import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { HtmlToPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/html-to-pdf' },
  robots: { index: true, follow: true },
  title: 'HTML to PDF - Convert Web Content to PDF | Toolify',
  description: 'Convert HTML files or web content to PDF documents. Free online HTML to PDF converter.',
}

export default function Page() {
  const tool = getToolBySlug('html-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <HtmlToPdfClient />
    </ToolPageServerLayout>
  )
}
