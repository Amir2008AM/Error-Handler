import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToExcelClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/pdf-to-excel' },
  robots: { index: true, follow: true },
  title: 'PDF to Excel — Extract Tables from PDF | Toolify',
  description:
    'Extract tables from any PDF and download them as a clean Excel spreadsheet. Works on text-based and scanned PDFs using OCR. Free, fast, no registration.',
}

export default function Page() {
  const tool = getToolBySlug('pdf-to-excel')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToExcelClient />
    </ToolPageServerLayout>
  )
}
