import type { Metadata } from 'next'
import { OrganizePdfClient } from './client'
import { ToolPageLayout } from '@/components/tool-page-layout'

export const metadata: Metadata = {
  title: 'Organize PDF - Rearrange, Delete & Duplicate Pages | Toolify',
  description: 'Organize your PDF documents by rearranging pages, deleting unwanted pages, or duplicating important ones. Free online PDF organizer.',
}

export default function OrganizePdfPage() {
  return (
    <ToolPageLayout toolId="organize-pdf">
      <OrganizePdfClient />
    </ToolPageLayout>
  )
}
