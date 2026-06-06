import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { CompressImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/compress-image' },
  robots: { index: true, follow: true },
  title: 'Compress Image — Reduce Image File Size Online Free',
  description:
    'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required. Instant results.',
  keywords: ['compress image', 'reduce image size', 'image optimizer', 'jpg compressor', 'png optimizer online free'],
}

export default function CompressImagePage() {
  const tool = getToolBySlug('compress-image')!
  return (
    <ToolPageServerLayout tool={tool}>
      <CompressImageClient />
    </ToolPageServerLayout>
  )
}
