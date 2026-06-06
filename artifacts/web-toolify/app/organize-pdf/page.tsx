import type { Metadata } from 'next'
import { OrganizePdfClient } from './client'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.toolifypdf.online/organize-pdf' },
  robots: { index: true, follow: true },
  title: 'Organize PDF - Rearrange, Delete & Duplicate Pages | Toolify',
  description: 'Organize your PDF documents by rearranging pages, deleting unwanted pages, or duplicating important ones. Free online PDF organizer.',
}

export default function OrganizePdfPage() {
  return (
    <ToolPageServerLayout toolId="organize-pdf">
      <OrganizePdfClient />
    </ToolPageServerLayout>
  )
}
