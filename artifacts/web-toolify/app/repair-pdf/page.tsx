import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { RepairPdfClient } from './client'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/repair-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Repair PDF — Fix Corrupted PDF Files | Toolify' },
  description: 'Repair and recover corrupted or damaged PDF files. Fix PDF errors and restore document accessibility. Free online PDF repair tool.',
  openGraph: {
    title: 'Repair PDF — Fix Corrupted PDF Files | Toolify',
    description: 'Repair and recover corrupted or damaged PDF files. Fix PDF errors and restore document accessibility. Free online PDF repair tool.',
    url: 'https://toolifypdf.online/repair-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Repair PDF — Fix Corrupted PDF Files | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Repair PDF — Fix Corrupted PDF Files | Toolify',
    description: 'Repair and recover corrupted or damaged PDF files. Fix PDF errors and restore document accessibility. Free online PDF repair tool.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function Page() {
  return (
    <ToolPageServerLayout toolId="repair-pdf"
      title="Repair PDF">
      <RepairPdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "⬇️",
                    "title": "Fix incomplete downloads",
                    "text": "Files interrupted during download often open with errors — repair restores them to full readability."
              },
              {
                    "icon": "💾",
                    "title": "Recover after storage errors",
                    "text": "PDFs can become unreadable after a hard drive error or failed file transfer; repair recovers the content."
              },
              {
                    "icon": "📎",
                    "title": "Rescue broken email attachments",
                    "text": "Attachments that fail to open in any viewer can often be repaired and read normally."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
