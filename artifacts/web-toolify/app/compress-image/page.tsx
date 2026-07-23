import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { CompressImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/compress-image' },
  robots: { index: true, follow: true },
  title: { absolute: 'Compress Image — Reduce Image File Size Free | Toolify' },
  description: 'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required, instant results.',
  keywords: ['compress image', 'reduce image size', 'image optimizer', 'jpg compressor', 'png optimizer online free'],
  openGraph: {
    title: 'Compress Image — Reduce Image File Size Free | Toolify',
    description: 'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required, instant results.',
    url: 'https://toolifypdf.online/compress-image',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Compress Image — Reduce Image File Size Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compress Image — Reduce Image File Size Free | Toolify',
    description: 'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required, instant results.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function CompressImagePage() {
  const tool = getToolBySlug('compress-image')!
  return (
    <ToolPageServerLayout tool={tool}>
      <CompressImageClient />
      <ToolInfoSection tips={[
              {
                    "icon": "⚡",
                    "title": "Speed up websites",
                    "text": "Smaller images load faster, which directly improves page speed scores and user experience."
              },
              {
                    "icon": "📤",
                    "title": "Meet upload size limits",
                    "text": "Many platforms cap image uploads — compress first to stay within the allowed limit."
              },
              {
                    "icon": "📧",
                    "title": "Reduce email attachment size",
                    "text": "Compress images before attaching them to emails to avoid rejection by size-limited mail servers."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
