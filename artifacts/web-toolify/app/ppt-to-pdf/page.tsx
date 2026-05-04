import type { Metadata } from 'next'
import { PptToPdfClient } from './client'

export const metadata: Metadata = {
  title: 'PPT to PDF - Convert PowerPoint to PDF | Toolify',
  description: 'Convert PowerPoint presentations (.pptx, .ppt) to PDF files. Free online PPT to PDF converter — preserves slides and formatting.',
}

export default function PptToPdfPage() {
  return <PptToPdfClient />
}
