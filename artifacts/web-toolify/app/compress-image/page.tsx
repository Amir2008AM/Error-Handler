import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
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
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <CompressImageClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
