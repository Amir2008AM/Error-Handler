import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
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
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <PdfToWordClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
