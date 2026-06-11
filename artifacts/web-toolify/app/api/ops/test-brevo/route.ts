import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '@/app/api/ops/auth/route'

export async function POST(req: NextRequest) {
  if (!verifyOpsSession(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey  = process.env.BREVO_API_KEY
  const toEmail = process.env.SUPPORT_EMAIL ?? 'amirsaleh098am@gmail.com'
  const sender  = 'amirsaleh098am@gmail.com'

  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'BREVO_API_KEY not set in environment' }, { status: 500 })
  }

  const body = {
    sender:      { name: 'Toolify Test', email: sender },
    to:          [{ email: toEmail }],
    subject:     '[Toolify] Brevo connection test ✅',
    textContent: 'Brevo is connected and working correctly. This is an automated test.',
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(10_000),
    })

    const text = await res.text().catch(() => '')

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, status: res.status, error: text.slice(0, 300) },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, sentTo: toEmail, brevoStatus: res.status })
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 })
  }
}
