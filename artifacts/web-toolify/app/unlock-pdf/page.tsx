import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { UnlockPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/unlock-pdf' },
  robots: { index: true, follow: true },
  title: 'Unlock PDF - Remove Password Protection | Toolify',
  description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
}

export default function Page() {
  const tool = getToolBySlug('unlock-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <UnlockPdfClient />
    </ToolPageServerLayout>
  )
}
