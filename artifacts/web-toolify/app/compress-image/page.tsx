import type { Metadata } from 'next'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { CompressImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Compress Image — Reduce Image File Size Online Free',
  description:
    'Compress JPG, PNG, and WebP images online for free. Reduce image file size while maintaining quality. No sign-up required. Instant results.',
  keywords: ['compress image', 'reduce image size', 'image optimizer', 'jpg compressor', 'png optimizer online free'],
}

export default function CompressImagePage() {
  const tool = getToolBySlug('compress-image')!
  return (
    <ToolPageLayout tool={tool}>
      <CompressImageClient />
    </ToolPageLayout>
  )
}
