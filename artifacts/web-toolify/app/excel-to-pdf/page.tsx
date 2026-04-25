import type { Metadata } from 'next'
import { ExcelToPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Excel to PDF - Convert Spreadsheets to PDF | Toolify',
  description: 'Convert Excel spreadsheets (.xlsx, .xls, .csv) to PDF files. Free online Excel to PDF converter with table formatting preserved.',
}

export default function ExcelToPdfPage() {
  return <ExcelToPdfClient />
}
