import type { Metadata } from 'next'
import { PdfToExcelClient } from './client'

export const metadata: Metadata = {
  title: 'PDF to Excel — Extract Tables from PDF | Toolify',
  description:
    'Extract tables from any PDF and download them as a clean Excel spreadsheet. Works on text-based and scanned PDFs using OCR. Free, fast, no registration.',
}

export default function PdfToExcelPage() {
  return <PdfToExcelClient />
}
