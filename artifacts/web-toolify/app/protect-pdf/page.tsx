import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ProtectPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/protect-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Protect PDF — Add Password to PDF | Toolify' },
  description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool, no sign-up needed.',
  openGraph: {
    title: 'Protect PDF — Add Password to PDF | Toolify',
    description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool, no sign-up needed.',
    url: 'https://www.toolifypdf.online/protect-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Protect PDF — Add Password to PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Protect PDF — Add Password to PDF | Toolify',
    description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool, no sign-up needed.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  return (
    <ToolPageServerLayout toolId="protect-pdf"
      title="Protect PDF">
      <ProtectPdfClient />
    </ToolPageServerLayout>
  )
}
