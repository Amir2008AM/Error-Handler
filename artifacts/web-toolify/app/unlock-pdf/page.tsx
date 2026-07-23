import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { UnlockPdfClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/unlock-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Unlock PDF — Remove Password Protection | Toolify' },
  description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
  openGraph: {
    title: 'Unlock PDF — Remove Password Protection | Toolify',
    description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
    url: 'https://toolifypdf.online/unlock-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Unlock PDF — Remove Password Protection | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unlock PDF — Remove Password Protection | Toolify',
    description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('unlock-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <UnlockPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "🔑",
                    "title": "Access your own file",
                    "text": "Use this when you own the PDF but have forgotten the password you set on it."
              },
              {
                    "icon": "✏️",
                    "title": "Edit a restricted document",
                    "text": "Remove restrictions from a PDF you are authorised to edit, such as your own templates."
              },
              {
                    "icon": "📂",
                    "title": "Recover archived files",
                    "text": "Old documents protected with outdated passwords can be unlocked to regain full access."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
