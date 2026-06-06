import type { Metadata } from 'next'
import { ToolPageServerLayout } from '@/components/tool-page-server-layout'
import { RepairPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Repair PDF - Fix Corrupted PDF Files | Toolify',
  description: 'Repair and recover corrupted or damaged PDF files. Fix PDF errors and restore document accessibility. Free online PDF repair tool.',
}

export default function Page() {
  return (
    <ToolPageServerLayout toolId="repair-pdf"
      title="Repair PDF">
      <RepairPdfClient />
    </ToolPageServerLayout>
  )
}
