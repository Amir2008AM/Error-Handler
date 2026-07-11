import type { Metadata } from 'next'
import { OrganizePdfClient } from './client'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'

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
    </ToolPageServerLayout>
  )
}
