import type { Metadata } from 'next'
import { OrganizePdfClient } from './client'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/organize-pdf' },
  robots: { index: true, follow: true },
  title: { absolute: 'Organize PDF — Rearrange & Delete Pages | Toolify' },
  description: 'Organize your PDF documents by rearranging pages, deleting unwanted pages, or duplicating important ones. Free online PDF organizer.',
  openGraph: {
    title: 'Organize PDF — Rearrange & Delete Pages | Toolify',
    description: 'Organize your PDF documents by rearranging pages, deleting unwanted pages, or duplicating important ones. Free online PDF organizer.',
    url: 'https://www.toolifypdf.online/organize-pdf',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Organize PDF — Rearrange & Delete Pages | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Organize PDF — Rearrange & Delete Pages | Toolify',
    description: 'Organize your PDF documents by rearranging pages, deleting unwanted pages, or duplicating important ones. Free online PDF organizer.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
}
export default function OrganizePdfPage() {
  return (
    <ToolPageServerLayout toolId="organize-pdf">
      <OrganizePdfClient />
    </ToolPageServerLayout>
  )
}
