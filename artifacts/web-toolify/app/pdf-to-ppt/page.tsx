import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToPptClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/pdf-to-ppt' },
  robots: { index: true, follow: true },
  title: 'PDF to PowerPoint — Convert PDF to PPTX Online Free',
  description:
    'Convert PDF documents to editable PowerPoint presentations (.pptx) online for free. Preserves layout and formatting. No registration, instant download.',
  keywords: [
    'pdf to powerpoint',
    'pdf to pptx',
    'convert pdf to ppt online',
    'pdf to presentation',
    'pdf converter free',
  ],
}

export default function Page() {
  const tool = getToolBySlug('pdf-to-ppt')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToPptClient />
    </ToolPageServerLayout>
  )
}
