import type { Metadata } from 'next'
import { PdfToPptClient } from './client'

export const metadata: Metadata = {
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

export default function PdfToPptPage() {
  return <PdfToPptClient />
}
