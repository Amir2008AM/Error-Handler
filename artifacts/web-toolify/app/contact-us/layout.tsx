import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: { absolute: 'Contact ToolifyPDF — Get Help & Support' },
  description:
    'Contact the ToolifyPDF team. Have a question, report an issue, or send us feedback — we respond as quickly as possible.',
  alternates: { canonical: 'https://toolifypdf.online/contact-us' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Contact ToolifyPDF — Get Help & Support',
    description:
      'Contact the ToolifyPDF team. Have a question, report an issue, or send us feedback.',
    url: 'https://toolifypdf.online/contact-us',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Contact ToolifyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact ToolifyPDF — Get Help & Support',
    description:
      'Contact the ToolifyPDF team. Have a question, report an issue, or send us feedback.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
