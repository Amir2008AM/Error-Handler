import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { CropImageClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/crop-image' },
  robots: { index: true, follow: true },
  title: { absolute: 'Crop Image Online — Free Image Cropping Tool | Toolify' },
  description: 'Crop images to any size with precision controls. Free online image cropping tool with instant download. No account required.',
  openGraph: {
    title: 'Crop Image Online — Free Image Cropping Tool | Toolify',
    description: 'Crop images to any size with precision controls. Free online image cropping tool with instant download. No account required.',
    url: 'https://toolifypdf.online/crop-image',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Crop Image Online — Free Image Cropping Tool | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Crop Image Online — Free Image Cropping Tool | Toolify',
    description: 'Crop images to any size with precision controls. Free online image cropping tool with instant download. No account required.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function CropImagePage() {
  const tool = getToolBySlug('crop-image')
  if (!tool) notFound()

  return (
    <ToolPageServerLayout tool={tool}>
      <CropImageClient />
    </ToolPageServerLayout>
  )
}
