import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { getToolBySlug } from '@/lib/tools'
import { PdfToExcelClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/pdf-to-excel' },
  robots: { index: true, follow: true },
  title: { absolute: 'PDF to Excel — Extract Tables from PDF | Toolify' },
  description: 'Extract tables from any PDF and download them as a clean Excel spreadsheet. Works on text-based and scanned PDFs using OCR. Free, fast.',
  openGraph: {
    title: 'PDF to Excel — Extract Tables from PDF | Toolify',
    description: 'Extract tables from any PDF and download them as a clean Excel spreadsheet. Works on text-based and scanned PDFs using OCR. Free, fast.',
    url: 'https://toolifypdf.online/pdf-to-excel',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'PDF to Excel — Extract Tables from PDF | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PDF to Excel — Extract Tables from PDF | Toolify',
    description: 'Extract tables from any PDF and download them as a clean Excel spreadsheet. Works on text-based and scanned PDFs using OCR. Free, fast.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  const tool = getToolBySlug('pdf-to-excel')!
  return (
    <ToolPageServerLayout tool={tool}>
      <PdfToExcelClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📊",
                    "title": "Extract tables from reports",
                    "text": "Recover data from financial or statistical PDFs so you can analyse or chart the figures in Excel."
              },
              {
                    "icon": "🔢",
                    "title": "Edit imported numbers directly",
                    "text": "Once in Excel, apply formulas, filters, or pivot tables to the extracted data immediately."
              },
              {
                    "icon": "🔗",
                    "title": "Combine with existing spreadsheets",
                    "text": "Merge extracted tables with data you already have in Excel without manual copy-pasting."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
