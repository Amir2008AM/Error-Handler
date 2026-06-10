import { NextRequest, NextResponse } from 'next/server'

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

async function sendViaBrevoApi(email: string, message: string): Promise<void> {
  const apiKey      = process.env.BREVO_API_KEY
  const toEmail     = process.env.SUPPORT_EMAIL ?? 'amirsaleh098am@gmail.com'
  const fromEmail   = process.env.SENDER_EMAIL  ?? 'support@toolifypdf.online'
  const fromName    = 'Toolify Contact'

  if (!apiKey) throw new Error('BREVO_API_KEY not set')

  const body = {
    sender:      { name: fromName, email: fromEmail },
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

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key':      apiKey,
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Brevo API error ${res.status}: ${text}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    if (message.length < 10) {
      return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
    }

    if (message.length > 5000) {
      return NextResponse.json({ error: 'Message is too long (max 5000 characters).' }, { status: 400 })
    }

    try {
      await sendViaBrevoApi(email, message)
      console.log(`[Contact] Email sent via Brevo API from ${email}`)
    } catch (err) {
      console.error('[Contact] Brevo API failed:', err)
      console.log(`[Contact] Fallback log — From: ${email}\n${message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Contact] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
