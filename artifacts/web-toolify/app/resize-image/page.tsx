import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ResizeImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

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
      <ToolInfoSection tips={[
              {
                    "icon": "📏",
                    "title": "Meet platform requirements",
                    "text": "Social networks, app stores, and email tools each require specific image dimensions — resize to match."
              },
              {
                    "icon": "⬇️",
                    "title": "Reduce file size before uploading",
                    "text": "Smaller dimensions produce smaller files, which speeds up uploads and page loads."
              },
              {
                    "icon": "🔲",
                    "title": "Scale without cropping",
                    "text": "Resize the entire image proportionally so nothing is cut off and the full content stays visible."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
