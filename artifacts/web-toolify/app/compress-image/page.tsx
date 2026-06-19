import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { CompressImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/compress-image' },
  robots: { index: true, follow: true },
  title: { absolute: 'Compress Image — Reduce Image File Size Free | Toolify' },
  description: 'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required, instant results.',
  keywords: ['compress image', 'reduce image size', 'image optimizer', 'jpg compressor', 'png optimizer online free'],
  openGraph: {
    title: 'Compress Image — Reduce Image File Size Free | Toolify',
    description: 'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required, instant results.',
    url: 'https://www.toolifypdf.online/compress-image',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Compress Image — Reduce Image File Size Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compress Image — Reduce Image File Size Free | Toolify',
    description: 'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required, instant results.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function CompressImagePage() {
  const tool = getToolBySlug('compress-image')!
  return (
    <ToolPageServerLayout tool={tool}>
      <CompressImageClient />
    </ToolPageServerLayout>
  )
}
