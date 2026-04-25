import type { Metadata } from 'next'
import { OcrImageClient } from './client'

export const metadata: Metadata = {
  title: 'Image to Text (OCR) - Extract Text from Images | Toolify',
  description: 'Extract text from images using OCR technology. Supports multiple languages and various image formats. Free online OCR tool.',
}

export default function OcrImagePage() {
  return <OcrImageClient />
}
