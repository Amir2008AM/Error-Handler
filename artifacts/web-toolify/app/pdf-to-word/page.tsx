import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PdfToWordClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/pdf-to-word' },
  robots: { index: true, follow: true },
  title: 'PDF to Word — Convert PDF to DOCX Online Free | Toolify',
  description:
    'Convert PDF to Word (DOCX) online for free. Our PDF to Word converter preserves formatting and layout so you can edit your document instantly. No registration needed.',
  keywords: ['pdf to word', 'to pdf to word', 'convert pdf to word online', 'pdf to docx', 'convert pdf', 'pdf converter free', 'pdf to editable word'],
}

export default function PdfToWordPage() {
  const tool = getToolBySlug('pdf-to-word')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToWordClient />
    </ToolPageServerLayout>
  )
}
