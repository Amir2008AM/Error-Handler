import type { Metadata } from 'next'
import { SignPdfClient } from './client'

export const metadata: Metadata = {
  title: 'Sign PDF Online — Free PDF Signature Tool | Toolify',
  description: 'Add a signature to a PDF online privately in your browser.',
}

export default function SignPdfPage() {
  return <SignPdfClient />
}
