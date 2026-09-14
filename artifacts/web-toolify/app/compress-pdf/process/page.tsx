import type { Metadata } from 'next'
import { CompressPdfProcessClient } from './process-client'

export const metadata: Metadata = {
  title: 'Compress PDF — Processing | ToolifyPDF',
  description: 'Process and download your compressed PDF.',
}

export default function CompressPdfProcessPage() {
  return <CompressPdfProcessClient />
}
