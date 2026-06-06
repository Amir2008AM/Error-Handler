import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { OcrImageClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/ocr-image' },
  robots: { index: true, follow: true },
  title: 'Image to Text (OCR) - Extract Text from Images | Toolify',
  description: 'Extract text from images using OCR technology. Supports multiple languages and various image formats. Free online OCR tool.',
}

export default function Page() {
  const tool = getToolBySlug('ocr-image')!
  return (
    <ToolPageServerLayout tool={tool}>
      <OcrImageClient />
    </ToolPageServerLayout>
  )
}
