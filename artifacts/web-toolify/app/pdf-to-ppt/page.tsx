import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToPptClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/pdf-to-ppt' },
  robots: { index: true, follow: true },
  title: { absolute: 'PDF to PowerPoint — Convert PDF to PPTX | Toolify' },
  description: 'Convert PDF documents to editable PowerPoint presentations (.pptx) online for free. Preserves layout and formatting. No registration needed.',
  keywords: [
    'pdf to powerpoint',
    'pdf to pptx',
    'convert pdf to ppt online',
    'pdf to presentation',
    'pdf converter free',
  ],
  openGraph: {
    title: 'PDF to PowerPoint — Convert PDF to PPTX | Toolify',
    description: 'Convert PDF documents to editable PowerPoint presentations (.pptx) online for free. Preserves layout and formatting. No registration needed.',
    url: 'https://toolifypdf.online/pdf-to-ppt',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'PDF to PowerPoint — Convert PDF to PPTX | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to PowerPoint — Convert PDF to PPTX | Toolify',
    description: 'Convert PDF documents to editable PowerPoint presentations (.pptx) online for free. Preserves layout and formatting. No registration needed.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('pdf-to-ppt')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToPptClient />
    </ToolPageServerLayout>
  )
}
