import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ImageToPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/image-to-pdf' },
  robots: { index: true, follow: true },
  title: 'JPG to PDF — Convert JPG, PNG & Images to PDF Free | Toolify',
  description:
    'Convert JPG into PDF online for free. Turn any JPG, PNG, or image file into a PDF instantly — just upload and download. Free JPG a PDF converter, no registration needed.',
  keywords: ['jpg to pdf', 'jpg into pdf', 'jpg a pdf', 'image to pdf', 'png to pdf', 'convert jpg to pdf online', 'free pdf converter'],
}

export default function ImageToPdfPage() {
  const tool = getToolBySlug('image-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ImageToPdfClient />
    </ToolPageServerLayout>
  )
}
