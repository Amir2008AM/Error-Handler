import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { WordToPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/word-to-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Word to PDF — Convert DOCX to PDF Free | Toolify' },
  description: 'Convert Microsoft Word documents (.docx, .doc) to PDF files. Free online Word to PDF converter with formatting preserved. No sign-up.',
  openGraph: {
    title: 'Word to PDF — Convert DOCX to PDF Free | Toolify',
    description: 'Convert Microsoft Word documents (.docx, .doc) to PDF files. Free online Word to PDF converter with formatting preserved. No sign-up.',
    url: 'https://www.toolifypdf.online/word-to-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Word to PDF — Convert DOCX to PDF Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Word to PDF — Convert DOCX to PDF Free | Toolify',
    description: 'Convert Microsoft Word documents (.docx, .doc) to PDF files. Free online Word to PDF converter with formatting preserved. No sign-up.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('word-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <WordToPdfClient />
    </ToolPageServerLayout>
  )
}
