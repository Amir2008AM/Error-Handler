/**
 * GET /api/telegram/setup
 *
 * Registers the webhook URL with Telegram.
 * Protected by DEV_ADMIN_KEY header.
 * Call once after deployment whenever the domain changes.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Simple admin protection
  const adminKey = process.env.DEV_ADMIN_KEY
  if (adminKey) {
    const provided = req.headers.get('x-admin-key') ?? req.nextUrl.searchParams.get('key')
    if (provided !== adminKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const token  = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN not set' }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`
  const webhookUrl = `${baseUrl}/api/telegram/webhook`

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET

  const body: Record<string, string> = { url: webhookUrl }
  if (secret) body.secret_token = secret

  const res  = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
  const data = await res.json()

  return NextResponse.json({ webhookUrl, telegram: data })
}
