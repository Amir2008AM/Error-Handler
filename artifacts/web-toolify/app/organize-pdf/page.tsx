import type { Metadata } from 'next'
import { OrganizePdfClient } from './client'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { ToolInfoSection } from '@/components/tool-info-section'

export const metadata: Metadata = {
  alternates: { canonical: 'https://toolifypdf.online/organize-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Organize PDF — Reorder & Delete Pages Free | Toolify' },
  description: 'Reorder and delete PDF pages free online. Drag and drop thumbnails to rearrange pages instantly — no signup, no install, 100% secure. Works on any device.',
  openGraph: {
    title: 'Organize PDF — Reorder & Delete Pages Free | Toolify',
    description: 'Reorder and delete PDF pages free online. Drag and drop thumbnails to rearrange pages instantly — no signup, no install, 100% secure. Works on any device.',
    url: 'https://toolifypdf.online/organize-pdf',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Organize PDF — Reorder & Delete Pages Free | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organize PDF — Reorder & Delete Pages Free | Toolify',
    description: 'Reorder and delete PDF pages free online. Drag and drop thumbnails to rearrange pages instantly — no signup, no install, 100% secure. Works on any device.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}
export default function OrganizePdfPage() {
  return (
    <ToolPageServerLayout toolId="organize-pdf">
      <OrganizePdfClient />
      <ToolInfoSection tips={[
              {
                    "icon": "📋",
                    "title": "Fix scanning order",
                    "text": "Scanners sometimes capture pages out of sequence — drag pages to restore the correct order."
              },
              {
                    "icon": "🗑️",
                    "title": "Remove blank or duplicate pages",
                    "text": "Delete empty pages inserted by scanners or duplicate pages before sharing the file."
              },
              {
                    "icon": "📌",
                    "title": "Move the cover to the front",
                    "text": "Place a title, cover, or summary page at the top without rebuilding the entire document."
              }
        ]} />
    </ToolPageServerLayout>
  )
}
