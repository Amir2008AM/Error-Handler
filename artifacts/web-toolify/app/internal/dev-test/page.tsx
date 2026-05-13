import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { makeOpsToken } from '@/app/api/internal/auth/route'
import DevTestPanel from './panel'

export const metadata = {
  title: 'Dev Test Mode',
  robots: 'noindex, nofollow',
}

export default async function DevTestPage() {
  const adminKey = process.env.DEV_ADMIN_KEY ?? ''
  if (!adminKey) notFound()

  const cookieStore = await cookies()
  const session     = cookieStore.get('ops_session_v2')?.value ?? ''
  const expected    = makeOpsToken(adminKey)

  if (session !== expected) notFound()

  return <DevTestPanel />
}
