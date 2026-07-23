import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ImageToPdfClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/image-to-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Image to PDF — Convert JPG & PNG to PDF | Toolify' },
  description: 'Convert multiple images to a PDF file online for free. Upload JPG or PNG images, arrange their order, and download your PDF instantly.',
  keywords: ['image to pdf', 'jpg to pdf', 'png to pdf', 'convert image to pdf online', 'free pdf converter'],
  openGraph: {
    title: 'Image to PDF — Convert JPG & PNG to PDF | Toolify',
    description: 'Convert multiple images to a PDF file online for free. Upload JPG or PNG images, arrange their order, and download your PDF instantly.',
    url: 'https://toolifypdf.online/image-to-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Image to PDF — Convert JPG & PNG to PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Image to PDF — Convert JPG & PNG to PDF | Toolify',
    description: 'Convert multiple images to a PDF file online for free. Upload JPG or PNG images, arrange their order, and download your PDF instantly.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function ImageToPdfPage() {
  const tool = getToolBySlug('image-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ImageToPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📸",
                    "title": "Combine multiple photos into one file",
                    "text": "Merge scanned pages, receipts, or photos into a single PDF document for easy sharing."
              },
              {
                    "icon": "📋",
                    "title": "Submit phone photos as documents",
                    "text": "Convert images taken on a phone — of receipts, ID cards, or forms — into a professional PDF."
              },
              {
                    "icon": "📐",
                    "title": "Control page size and layout",
                    "text": "Set the page size and orientation for each image so the PDF looks clean and consistent."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
