import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DevOpsAccess() {
  // In production, this shortcut is disabled — use /ops directly
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const key = process.env.DEV_ADMIN_KEY ?? ''
  if (!key) redirect('/ops')

  redirect(`/ops?key=${key}`)
}

export const dynamic = 'force-dynamic'
