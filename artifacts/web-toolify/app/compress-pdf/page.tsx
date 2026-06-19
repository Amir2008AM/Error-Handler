import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { CompressPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/compress-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Compress PDF — Reduce PDF File Size Free | Toolify' },
  description: 'Compress PDF files to reduce file size while maintaining quality. Free online PDF compressor for easy sharing and storage. No sign-up needed.',
  openGraph: {
    title: 'Compress PDF — Reduce PDF File Size Free | Toolify',
    description: 'Compress PDF files to reduce file size while maintaining quality. Free online PDF compressor for easy sharing and storage. No sign-up needed.',
    url: 'https://www.toolifypdf.online/compress-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Compress PDF — Reduce PDF File Size Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compress PDF — Reduce PDF File Size Free | Toolify',
    description: 'Compress PDF files to reduce file size while maintaining quality. Free online PDF compressor for easy sharing and storage. No sign-up needed.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  return (
    <ToolPageServerLayout toolId="compress-pdf"
      title="Compress PDF">
      <CompressPdfClient />
    </ToolPageServerLayout>
  )
}
