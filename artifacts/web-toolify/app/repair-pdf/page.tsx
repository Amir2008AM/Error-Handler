import type { Metadata } from 'next'
import { RepairPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Repair PDF - Fix Corrupted PDF Files | Toolify',
  description: 'Repair and recover corrupted or damaged PDF files. Fix PDF errors and restore document accessibility. Free online PDF repair tool.',
}

export default function RepairPdfPage() {
  return <RepairPdfClient />
}
