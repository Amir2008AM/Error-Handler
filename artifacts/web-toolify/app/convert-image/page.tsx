import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ConvertImageClient } from './client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/convert-image' },
  robots: { index: true, follow: true },
  title: { absolute: 'Convert Image — JPG PNG WebP AVIF Converter | Toolify' },
  description: 'Convert images between JPG, PNG, WebP, and AVIF formats online for free. Fast, no registration, instant download.',
  keywords: ['convert image online', 'jpg to png', 'png to webp', 'image format converter', 'webp to jpg free'],
  openGraph: {
    title: 'Convert Image — JPG PNG WebP AVIF Converter | Toolify',
    description: 'Convert images between JPG, PNG, WebP, and AVIF formats online for free. Fast, no registration, instant download.',
    url: 'https://toolifypdf.online/convert-image',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Convert Image — JPG PNG WebP AVIF Converter | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Convert Image — JPG PNG WebP AVIF Converter | Toolify',
    description: 'Convert images between JPG, PNG, WebP, and AVIF formats online for free. Fast, no registration, instant download.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function ConvertImagePage() {
  const tool = getToolBySlug('convert-image')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ConvertImageClient />
    </ToolPageServerLayout>
  )
}
