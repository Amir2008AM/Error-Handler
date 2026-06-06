import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { RotatePdfClient } from './client'
import { notFound } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Rotate PDF Pages — Toolify',
  description: 'Rotate PDF pages by 90, 180, or 270 degrees. Free online PDF rotation tool with instant processing.',
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
