import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { WatermarkPdfClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Add Watermark to PDF — Toolify',
  description: 'Add text watermarks to your PDF documents. Customize position, opacity, and font size. Free online tool.',
}

export default function WatermarkPdfPage() {
  const tool = getToolBySlug('watermark-pdf')
  if (!tool) notFound()

  return (
    <ToolPageServerLayout tool={tool}>
      <WatermarkPdfClient />
    </ToolPageServerLayout>
  )
}
