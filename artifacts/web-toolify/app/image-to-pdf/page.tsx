import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ImageToPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/image-to-pdf' },
  robots: { index: true, follow: true },
  title: 'Image to PDF — Convert JPG/PNG to PDF Online Free',
  description:
    'Convert multiple images to a PDF file online for free. Upload JPG or PNG images, arrange their order with a click, and download your PDF instantly. No registration needed.',
  keywords: ['image to pdf', 'jpg to pdf', 'png to pdf', 'convert image to pdf online', 'free pdf converter'],
}

export default function ImageToPdfPage() {
  const tool = getToolBySlug('image-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ImageToPdfClient />
    </ToolPageServerLayout>
  )
}
