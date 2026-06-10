import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS      = 60 * 60 * 1000
const MAX_PER_WINDOW = 5
const SMTP_TIMEOUT_MS = 10_000

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

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT ?? '587', 10)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout:   SMTP_TIMEOUT_MS,
    socketTimeout:     SMTP_TIMEOUT_MS,
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
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

    const transporter = createTransporter()

    if (!transporter) {
      console.warn('[Contact] SMTP not configured — logging message only')
      console.log(`[Contact] From: ${email}\n${message}`)
      return NextResponse.json({ ok: true })
    }

    const supportEmail = process.env.SUPPORT_EMAIL ?? process.env.SMTP_USER!
    const senderEmail  = process.env.SENDER_EMAIL  ?? process.env.SMTP_USER!

    try {
      await withTimeout(
        transporter.sendMail({
          from:    `"Toolify Contact" <${senderEmail}>`,
          to:      supportEmail,
          replyTo: email,
          subject: `[Contact] New message from ${email}`,
          text:    `From: ${email}\n\n${message}`,
          html:    `
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
        }),
        SMTP_TIMEOUT_MS,
        'SMTP sendMail'
      )
      console.log(`[Contact] Email sent from ${email}`)
    } catch (smtpErr) {
      console.error('[Contact] SMTP error — falling back to log:', smtpErr)
      console.log(`[Contact] Fallback log — From: ${email}\n${message}`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[Contact] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
