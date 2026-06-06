import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { CompressPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/compress-pdf' },
  robots: { index: true, follow: true },
  title: 'Compress PDF - Reduce PDF File Size | Toolify',
  description: 'Compress PDF files to reduce file size while maintaining quality. Free online PDF compressor for easy sharing and storage.',
}

export default function Page() {
  return (
    <ToolPageServerLayout toolId="compress-pdf"
      title="Compress PDF">
      <CompressPdfClient />
    </ToolPageServerLayout>
  )
}
