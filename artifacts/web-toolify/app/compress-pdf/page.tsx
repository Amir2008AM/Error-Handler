import type { Metadata } from 'next'
import { CompressPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Compress PDF - Reduce PDF File Size | Toolify',
  description: 'Compress PDF files to reduce file size while maintaining quality. Free online PDF compressor for easy sharing and storage.',
}

export default function CompressPdfPage() {
  return <CompressPdfClient />
}
