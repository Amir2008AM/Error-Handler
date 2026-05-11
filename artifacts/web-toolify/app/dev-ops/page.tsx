import { redirect } from 'next/navigation'

export default function DevOpsAccess() {
  if (process.env.NODE_ENV === 'production') {
    redirect('/404-not-found')
  }

  const key = process.env.DEV_ADMIN_KEY ?? ''
  if (!key) redirect('/ops')

  redirect(`/ops?key=${key}`)
}

export const dynamic = 'force-dynamic'
