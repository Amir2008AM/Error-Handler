import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ResizeImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/resize-image' },
  robots: { index: true, follow: true },
  title: { absolute: 'Resize Image — Change Image Dimensions Free | Toolify' },
  description: 'Resize images to exact dimensions or by percentage online for free. Maintain aspect ratio or set custom width and height. No sign-up required.',
  keywords: ['resize image online', 'change image dimensions', 'image resizer free', 'reduce image resolution'],
  openGraph: {
    title: 'Resize Image — Change Image Dimensions Free | Toolify',
    description: 'Resize images to exact dimensions or by percentage online for free. Maintain aspect ratio or set custom width and height. No sign-up required.',
    url: 'https://toolifypdf.online/resize-image',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Resize Image — Change Image Dimensions Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Resize Image — Change Image Dimensions Free | Toolify',
    description: 'Resize images to exact dimensions or by percentage online for free. Maintain aspect ratio or set custom width and height. No sign-up required.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function ResizeImagePage() {
  const tool = getToolBySlug('resize-image')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ResizeImageClient />
    </ToolPageServerLayout>
  )
}
