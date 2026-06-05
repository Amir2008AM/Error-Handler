import type { Metadata } from 'next'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { PdfToWordClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'PDF to Word — Convert PDF to DOCX Online Free',
  description:
    'Convert PDF documents to editable Microsoft Word (DOCX) files online for free. Preserve formatting and layout. No registration, instant download.',
  keywords: ['pdf to word', 'pdf to docx', 'convert pdf to word online', 'pdf converter free', 'pdf to editable word'],
}

export default function PdfToWordPage() {
  const tool = getToolBySlug('pdf-to-word')!
  return (
    <ToolPageLayout tool={tool}>
      <PdfToWordClient />
    </ToolPageLayout>
  )
}
