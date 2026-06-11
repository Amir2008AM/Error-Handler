import { NextRequest, NextResponse } from 'next/server'
import { dbSaveContact } from '@/lib/telegram/db'

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS      = 60 * 60 * 1000
const MAX_PER_WINDOW = 5

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function isRateLimited(ip: string): boolean {
  const now   = Date.now()
  const entry = RATE_LIMIT_MAP.get(ip)
  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  if (entry.count >= MAX_PER_WINDOW) return true
  entry.count++
  return false
}

const VERIFIED_SENDER = 'amirsaleh098am@gmail.com'

async function sendViaBrevo(email: string, message: string): Promise<void> {
  const apiKey  = process.env.BREVO_API_KEY
  const toEmail = process.env.SUPPORT_EMAIL ?? VERIFIED_SENDER

  if (!apiKey) throw new Error('BREVO_API_KEY not configured')

  const body = {
    sender:      { name: 'Toolify Contact', email: VERIFIED_SENDER },
    to:          [{ email: toEmail }],
    replyTo:     { email },
    subject:     `[Contact] New message from ${email}`,
    textContent: `From: ${email}\n\n${message}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#3b6ef5">New Contact Message</h2>
        <p><strong>From:</strong> <a href="mailto:${email}">${email}</a></p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
        <p style="white-space:pre-wrap;line-height:1.6">${message
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>')}</p>
      </div>
    `,
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(10_000),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Brevo ${res.status}: ${text.slice(0, 200)}`)
  }
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before sending another message.' },
      { status: 429 }
    )
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const email   = typeof body.email   === 'string' ? body.email.trim()   : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (!email || !message) {
    return NextResponse.json({ error: 'Email and message are required.' }, { status: 400 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  if (message.length < 10) {
    return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
  }

  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long (max 5000 characters).' }, { status: 400 })
  }

  let delivered = false
  let channel   = 'none'

  if (process.env.BREVO_API_KEY) {
    try {
      await sendViaBrevo(email, message)
      console.log(`[Contact] Delivered via Brevo from ${email}`)
      delivered = true
      channel   = 'brevo'
    } catch (err) {
      console.error('[Contact] Brevo failed:', (err as Error).message)
    }
  }

  dbSaveContact(email, message, ip, delivered, channel)

  if (!delivered) {
    console.warn(`[Contact] No delivery channel available — message from ${email} saved to DB only`)
  }

  return NextResponse.json({ ok: true })
}
