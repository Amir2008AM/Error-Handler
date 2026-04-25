import type { Metadata } from 'next'
import { ProtectPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Protect PDF - Add Password Protection | Toolify',
  description: 'Add password protection to your PDF documents. Secure sensitive files with encryption. Free online PDF protection tool.',
}

export default function ProtectPdfPage() {
  return <ProtectPdfClient />
}
