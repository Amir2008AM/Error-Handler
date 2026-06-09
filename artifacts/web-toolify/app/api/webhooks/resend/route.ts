import { NextRequest, NextResponse } from 'next/server'
import { Resend, type EmailReceivedEvent } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
    const secret = process.env.RESEND_WEBHOOK_SECRET
    if (!secret) {
      console.error('[Webhook] RESEND_WEBHOOK_SECRET not set')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
    }

    const payload = await req.text()

    let event
    try {
      event = resend.webhooks.verify({
        payload,
        headers: {
          id:        req.headers.get('svix-id')        ?? '',
          timestamp: req.headers.get('svix-timestamp') ?? '',
          signature: req.headers.get('svix-signature') ?? '',
        },
        webhookSecret: secret,
      })
    } catch (err) {
      console.error('[Webhook] Signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    if (event.type === 'email.received') {
      const { email_id, from, subject } = (event as EmailReceivedEvent).data

      console.log(`[Webhook] 📩 New contact message — from: ${from}, subject: ${subject}, id: ${email_id}`)

      if (email_id) {
        try {
          const content = await resend.emails.receiving.get(email_id)
          const body    = (content as { data?: { text?: string; html?: string } }).data?.text
                       ?? (content as { data?: { text?: string; html?: string } }).data?.html
                       ?? '(no body)'
          console.log(`[Webhook] 📨 Message body:\n${body}`)
        } catch (err) {
          console.warn('[Webhook] Could not fetch email content:', err)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Webhook] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
