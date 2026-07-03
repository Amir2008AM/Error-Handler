/**
 * POST /api/telegram/webhook
 *
 * Receives Telegram Update objects and routes them to the bot handler.
 * Secured with a webhook secret token sent in the X-Telegram-Bot-Api-Secret-Token header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleUpdate } from '@/lib/telegram/bot-handler'

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify secret token
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (secret) {
    const incoming = req.headers.get('x-telegram-bot-api-secret-token')
    if (incoming !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Handle in background — Telegram expects 200 fast
  handleUpdate(body).catch((err) =>
    console.error('[Webhook] handler error:', err),
  )

  return NextResponse.json({ ok: true })
}
