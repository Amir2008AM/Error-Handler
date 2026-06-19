import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { UnlockPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/unlock-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Unlock PDF — Remove Password Protection | Toolify' },
  description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
  openGraph: {
    title: 'Unlock PDF — Remove Password Protection | Toolify',
    description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
    url: 'https://www.toolifypdf.online/unlock-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Unlock PDF — Remove Password Protection | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unlock PDF — Remove Password Protection | Toolify',
    description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('unlock-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <UnlockPdfClient />
    </ToolPageServerLayout>
  )
}
