import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PptToPdfClient } from './client'

export const metadata: Metadata = {
  title: 'PPT to PDF - Convert PowerPoint to PDF | Toolify',
  description: 'Convert PowerPoint presentations (.pptx, .ppt) to PDF files. Free online PPT to PDF converter — preserves slides and formatting.',
}

export default function Page() {
  const tool = getToolBySlug('ppt-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PptToPdfClient />
    </ToolPageServerLayout>
  )
}
