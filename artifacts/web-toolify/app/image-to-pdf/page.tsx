import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { ImageToPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Image to PDF — Convert JPG/PNG to PDF Online Free',
  description:
    'Convert multiple images to a PDF file online for free. Upload JPG or PNG images, arrange their order with a click, and download your PDF instantly. No registration needed.',
  keywords: ['image to pdf', 'jpg to pdf', 'png to pdf', 'convert image to pdf online', 'free pdf converter'],
}

export default function ImageToPdfPage() {
  const tool = getToolBySlug('image-to-pdf')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <ImageToPdfClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
