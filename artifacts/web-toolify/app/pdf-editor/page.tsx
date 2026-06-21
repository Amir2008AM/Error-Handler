import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { PdfEditorClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/pdf-editor' },
  robots: { index: true, follow: true },
  title: { absolute: 'PDF Editor — Edit PDF Online Free | Toolify' },
  description:
    'Edit PDF files online for free. Add text, images, drawings, highlights, and signatures. Manage pages — no sign-up required.',
  keywords: [
    'pdf editor online',
    'edit pdf free',
    'add text to pdf',
    'annotate pdf',
    'sign pdf online',
    'draw on pdf',
  ],
  openGraph: {
    title: 'PDF Editor — Edit PDF Online Free | Toolify',
    description:
      'Edit PDF files online for free. Add text, images, drawings, highlights, and signatures. Manage pages — no sign-up required.',
    url: 'https://www.toolifypdf.online/pdf-editor',
    type: 'website',
    images: [
      {
        url: 'https://www.toolifypdf.online/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'PDF Editor — Edit PDF Online Free | Toolify',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF Editor — Edit PDF Online Free | Toolify',
    description:
      'Edit PDF files online for free. Add text, images, drawings, highlights, and signatures. Manage pages — no sign-up required.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}

export default function PdfEditorPage() {
  const tool = getToolBySlug('pdf-editor')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfEditorClient />
    </ToolPageServerLayout>
  )
}
