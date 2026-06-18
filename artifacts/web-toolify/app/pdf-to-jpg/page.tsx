import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToJpgClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/pdf-to-jpg' },
  robots: { index: true, follow: true },
  title: 'PDF to JPG — Convert PDF Pages to Images Free | Toolify',
  description: 'Convert PDF pages to high-quality JPG images online for free. Fast PDF to JPG converter with customizable DPI and quality settings. No sign-up required.',
  keywords: ['pdf to jpg', 'pdf to jpg converter', 'convert pdf to jpg online', 'pdf pages to images', 'pdf to jpeg free'],
}

export default function Page() {
  const tool = getToolBySlug('pdf-to-jpg')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToJpgClient />
    </ToolPageServerLayout>
  )
}
