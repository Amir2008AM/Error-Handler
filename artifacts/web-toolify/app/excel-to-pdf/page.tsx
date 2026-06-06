import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { ExcelToPdfClient } from './client'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/excel-to-pdf' },
  robots: { index: true, follow: true },
  title: 'Excel to PDF - Convert Spreadsheets to PDF | Toolify',
  description: 'Convert Excel spreadsheets (.xlsx, .xls, .csv) to PDF files. Free online Excel to PDF converter with table formatting preserved.',
}

export default function Page() {
  const tool = getToolBySlug('excel-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ExcelToPdfClient />
    </ToolPageServerLayout>
  )
}
