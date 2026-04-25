import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ToolPageLayout } from '@/components/tool-page-layout'
import { ConvertImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  title: 'Convert Image — JPG, PNG, WebP, AVIF Converter Online Free',
  description:
    'Convert images between JPG, PNG, WebP, and AVIF formats online for free. Fast, no registration, instant download.',
  keywords: ['convert image online', 'jpg to png', 'png to webp', 'image format converter', 'webp to jpg free'],
}

export default function ConvertImagePage() {
  const tool = getToolBySlug('convert-image')!
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <ToolPageLayout tool={tool}>
        <ConvertImageClient />
      </ToolPageLayout>
      <Footer />
    </div>
  )
}
