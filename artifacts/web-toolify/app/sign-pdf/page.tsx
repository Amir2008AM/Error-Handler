import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ToolInfoSection } from '@/components/tool-info-section'
import { PdfEditorClient } from '@/app/pdf-editor/client'
import { getToolBySlug } from '@/lib/tools'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/sign-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Sign PDF Online Free — Add Your Signature | ToolifyPDF' },
  description:
    'Sign PDF files online for free. Draw, type, or upload a signature, add initials and dates, then download your signed PDF without registration.',
  keywords: [
    'sign pdf online',
    'add signature to pdf',
    'electronic signature pdf',
    'type signature on pdf',
    'draw signature on pdf',
  ],
  openGraph: {
    title: 'Sign PDF Online Free — Add Your Signature | ToolifyPDF',
    description:
      'Draw, type, or upload a signature, add initials and dates, then download your signed PDF without registration.',
    url: 'https://toolifypdf.online/sign-pdf',
    type: 'website',
    images: [
      {
        url: 'https://toolifypdf.online/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Sign PDF online with ToolifyPDF',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign PDF Online Free — Add Your Signature | ToolifyPDF',
    description:
      'Draw, type, or upload a signature, add initials and dates, then download your signed PDF without registration.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

export default function SignPdfPage() {
  const tool = getToolBySlug('sign-pdf')!

  return (
    <ToolPageServerLayout
      tool={tool}
      trustBadgeLabels={['Processed in your browser', 'No server upload required', 'No registration needed']}
    >
      <PdfEditorClient mode="sign" />
      <ToolInfoSection
        tips={[
          {
            icon: '✍️',
            title: 'Create your signature three ways',
            text: 'Draw a handwritten signature, type one in a script style, or upload a signature image.',
          },
          {
            icon: '📄',
            title: 'Place it on any page',
            text: 'Drag, resize, rotate, and duplicate signatures or initials wherever they belong in the document.',
          },
          {
            icon: '🔒',
            title: 'Keep documents private',
            text: 'PDF editing and signing happen in your browser. Download the finished PDF when you are ready.',
          },
        ]}
      />
    </ToolPageServerLayout>
  )
}