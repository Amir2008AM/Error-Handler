import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PdfToWordClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/pdf-to-word' },
  robots: { index: true, follow: true },
  title: { absolute: 'PDF to Word — Convert PDF to DOCX Online | Toolify' },
  description: 'Convert PDF documents to editable Microsoft Word (DOCX) files online for free. Preserve formatting and layout. No registration needed.',
  keywords: ['pdf to word', 'pdf to docx', 'convert pdf to word online', 'pdf converter free', 'pdf to editable word'],
  openGraph: {
    title: 'PDF to Word — Convert PDF to DOCX Online | Toolify',
    description: 'Convert PDF documents to editable Microsoft Word (DOCX) files online for free. Preserve formatting and layout. No registration needed.',
    url: 'https://toolifypdf.online/pdf-to-word',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'PDF to Word — Convert PDF to DOCX Online | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to Word — Convert PDF to DOCX Online | Toolify',
    description: 'Convert PDF documents to editable Microsoft Word (DOCX) files online for free. Preserve formatting and layout. No registration needed.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function PdfToWordPage() {
  const tool = getToolBySlug('pdf-to-word')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToWordClient />
      <ToolInfoSection tips={[
              {
                    "icon": "✏️",
                    "title": "Edit a received PDF",
                    "text": "When a client sends a PDF you need to change, convert it to Word first and edit freely."
              },
              {
                    "icon": "🗂️",
                    "title": "Update archived documents",
                    "text": "Recover text from old PDFs without retyping — convert, edit, and save in minutes."
              },
              {
                    "icon": "🔍",
                    "title": "Extract text from scanned pages",
                    "text": "OCR reads text from scanned images, turning them into fully editable Word paragraphs."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
