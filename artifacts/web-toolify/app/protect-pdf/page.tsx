import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ProtectPdfClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/protect-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Protect PDF — Add Password to PDF | Toolify' },
  description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool, no sign-up needed.',
  openGraph: {
    title: 'Protect PDF — Add Password to PDF | Toolify',
    description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool, no sign-up needed.',
    url: 'https://toolifypdf.online/protect-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Protect PDF — Add Password to PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Protect PDF — Add Password to PDF | Toolify',
    description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool, no sign-up needed.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  return (
    <ToolPageServerLayout toolId="protect-pdf"
      title="Protect PDF">
      <ProtectPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📧",
                    "title": "Secure files sent by email",
                    "text": "Encrypt a PDF with a password before emailing contracts or personal documents."
              },
              {
                    "icon": "✏️",
                    "title": "Prevent editing",
                    "text": "Lock a form or template so recipients can read it but cannot modify the content."
              },
              {
                    "icon": "🖨️",
                    "title": "Restrict printing or copying",
                    "text": "Allow viewing while blocking users from printing the document or copying its text."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
