import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { RotatePdfClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/rotate-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Rotate PDF Pages — Free Online Tool | Toolify' },
  description: 'Rotate PDF pages by 90, 180, or 270 degrees online for free. Free PDF rotation tool with instant processing. No account required.',
  openGraph: {
    title: 'Rotate PDF Pages — Free Online Tool | Toolify',
    description: 'Rotate PDF pages by 90, 180, or 270 degrees online for free. Free PDF rotation tool with instant processing. No account required.',
    url: 'https://www.toolifypdf.online/rotate-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Rotate PDF Pages — Free Online Tool | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rotate PDF Pages — Free Online Tool | Toolify',
    description: 'Rotate PDF pages by 90, 180, or 270 degrees online for free. Free PDF rotation tool with instant processing. No account required.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function RotatePdfPage() {
  const tool = getToolBySlug('rotate-pdf')
  if (!tool) notFound()

  return (
    <ToolPageServerLayout tool={tool}>
      <RotatePdfClient />
    </ToolPageServerLayout>
  )
}
