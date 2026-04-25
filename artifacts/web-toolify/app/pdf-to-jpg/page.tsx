import type { Metadata } from 'next'
import { PdfToJpgClient } from './client'

export const metadata: Metadata = {
  title: 'PDF to JPG - Convert PDF Pages to Images | Toolify',
  description: 'Convert PDF pages to high-quality JPG, PNG, or WebP images. Free online PDF to image converter with customizable DPI and quality settings.',
}

export default function PdfToJpgPage() {
  return <PdfToJpgClient />
}
