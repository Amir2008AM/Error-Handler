import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { ResizeImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Resize Image — Change Image Dimensions Online Free',
  description:
    'Resize images to exact dimensions or by percentage online for free. Maintain aspect ratio or set custom width and height. No sign-up required.',
  keywords: ['resize image online', 'change image dimensions', 'image resizer free', 'reduce image resolution'],
}

export default function ResizeImagePage() {
  const tool = getToolBySlug('resize-image')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <ResizeImageClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
