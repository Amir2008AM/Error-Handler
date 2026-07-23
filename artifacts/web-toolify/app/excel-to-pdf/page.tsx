import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { ExcelToPdfClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/excel-to-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Excel to PDF — Convert Spreadsheets to PDF | Toolify' },
  description: 'Convert Excel spreadsheets (.xlsx, .xls, .csv) to PDF files. Free online Excel to PDF converter with table formatting preserved.',
  openGraph: {
    title: 'Excel to PDF — Convert Spreadsheets to PDF | Toolify',
    description: 'Convert Excel spreadsheets (.xlsx, .xls, .csv) to PDF files. Free online Excel to PDF converter with table formatting preserved.',
    url: 'https://toolifypdf.online/excel-to-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Excel to PDF — Convert Spreadsheets to PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Excel to PDF — Convert Spreadsheets to PDF | Toolify',
    description: 'Convert Excel spreadsheets (.xlsx, .xls, .csv) to PDF files. Free online Excel to PDF converter with table formatting preserved.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('excel-to-pdf')!
  return (
    <ToolPageServerLayout tool={tool}>
      <ExcelToPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📨",
                    "title": "Send invoices and reports",
                    "text": "Convert your spreadsheet to PDF so recipients see exactly what you intended, with no formula errors."
              },
              {
                    "icon": "📐",
                    "title": "Preserve column widths and colours",
                    "text": "Borders, colours, and column widths are fixed in PDF format and will not shift during printing."
              },
              {
                    "icon": "🖨️",
                    "title": "Print-ready output",
                    "text": "PDF output respects page breaks and margins so no columns are cut off when printing."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
