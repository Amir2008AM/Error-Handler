import type { Metadata } from 'next'
import { UnlockPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Unlock PDF - Remove Password Protection | Toolify',
  description: 'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires original password).',
}

export default function UnlockPdfPage() {
  return <UnlockPdfClient />
}
