import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { WordToPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Word to PDF - Convert DOCX to PDF | Toolify',
  description: 'Convert Microsoft Word documents (.docx, .doc) to PDF files. Free online Word to PDF converter with formatting preserved.',
}

export default function Page() {
  const tool = getToolBySlug('word-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <WordToPdfClient />
    </ToolPageServerLayout>
  )
}
