import { NextRequest, NextResponse } from 'next/server'
import { dbSaveFeedback, dbMarkFeedbackTgSent } from '@/lib/telegram/db'

// ── Rate limiting: 1 submission per 30 s per IP ──────────────────────────────

const RATE_MAP = new Map<string, number>()
const RATE_WINDOW_MS = 30_000

function getIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

function isRateLimited(ip: string): boolean {
  const now  = Date.now()
  const last = RATE_MAP.get(ip) ?? 0
  if (now - last < RATE_WINDOW_MS) return true
  RATE_MAP.set(ip, now)
  // Prune old entries every 1000 entries to prevent unbounded growth
  if (RATE_MAP.size > 1000) {
    const cutoff = now - RATE_WINDOW_MS
    for (const [k, v] of RATE_MAP) if (v < cutoff) RATE_MAP.delete(k)
  }
  return false
}

// ── Telegram delivery ─────────────────────────────────────────────────────────

async function sendToTelegram(text: string): Promise<void> {
  const token    = process.env.TELEGRAM_BOT_TOKEN
  const adminIds = process.env.TELEGRAM_ADMIN_IDS

  if (!token || !adminIds) throw new Error('Telegram not configured')

  const ids = adminIds.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) throw new Error('No admin IDs')

  await Promise.all(
    ids.map((chatId) =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: AbortSignal.timeout(8_000),
      }).then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => '')
          throw new Error(`Telegram ${res.status}: ${body.slice(0, 200)}`)
        }
      }),
    ),
  )
}

// ── Sanitise helper ───────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// ── POST /api/feedback ────────────────────────────────────────────────────────

const ALLOWED_TYPES = ['suggestion', 'bug', 'feature', 'general'] as const

export async function POST(req: NextRequest) {
  const ip = getIp(req)

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Please wait 30 seconds before sending another message.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const type      = typeof body.type    === 'string' ? body.type.trim()    : 'general'
  const message   = typeof body.message === 'string' ? body.message.trim() : ''
  const email     = typeof body.email   === 'string' ? body.email.trim()   : ''
  const pageUrl   = typeof body.pageUrl === 'string' ? body.pageUrl.trim().slice(0, 500) : ''
  const pageName  = typeof body.pageName === 'string' ? body.pageName.trim().slice(0, 200) : ''
  const browser   = typeof body.browser  === 'string' ? body.browser.trim().slice(0, 200)  : ''
  const os        = typeof body.os       === 'string' ? body.os.trim().slice(0, 100)        : ''
  const deviceType = typeof body.deviceType === 'string' ? body.deviceType.trim().slice(0, 50) : ''
  const country   = typeof body.country  === 'string' ? body.country.trim().slice(0, 100)  : ''
  const language  = typeof body.language === 'string' ? body.language.trim().slice(0, 50)  : ''

  // Validate message
  if (!message || message.length < 5) {
    return NextResponse.json({ error: 'Message is too short (min 5 characters).' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: 'Message is too long (max 5 000 characters).' }, { status: 400 })
  }

  // Validate type
  const safeType = ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number]) ? type : 'general'

  // Validate optional email
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
  }

  // ── 1. Save to database first — never lose feedback ──────────────────────
  const rowId = dbSaveFeedback({
    type:        safeType,
    message,
    email,
    page_url:    pageUrl,
    page_name:   pageName,
    browser,
    os,
    device_type: deviceType,
    country,
    language,
    ip,
    tg_sent:     false,
  })

  // Enforce persistence contract: if DB write failed, reject immediately
  if (rowId === null) {
    console.error('[Feedback] DB write failed — rejecting to prevent data loss')
    return NextResponse.json(
      { error: 'Could not save your feedback. Please try again.' },
      { status: 500 },
    )
  }

  // ── 2. Send to Telegram (best-effort, never blocks success response) ─────
  const typeLabel: Record<string, string> = {
    suggestion: '💡 Suggestion',
    bug:        '🐛 Bug Report',
    feature:    '✨ Feature Request',
    general:    '💬 General Feedback',
  }

  const tgText = [
    `<b>📬 New Feedback — ${esc(typeLabel[safeType] ?? safeType)}</b>`,
    ``,
    `<b>Message:</b>`,
    esc(message),
    ``,
    email    ? `<b>Email:</b> ${esc(email)}`     : null,
    pageName ? `<b>Page:</b> ${esc(pageName)}`   : null,
    pageUrl  ? `<b>URL:</b> ${esc(pageUrl)}`     : null,
    ``,
    `<b>Device:</b> ${esc([deviceType, os, browser].filter(Boolean).join(' · '))}`,
    country  ? `<b>Country:</b> ${esc(country)}` : null,
    language ? `<b>Lang:</b> ${esc(language)}`   : null,
    `<b>IP:</b> ${esc(ip)}`,
    `<b>Time:</b> ${new Date().toUTCString()}`,
  ]
    .filter((l) => l !== null)
    .join('\n')

  try {
    await sendToTelegram(tgText)
    if (rowId !== null) dbMarkFeedbackTgSent(rowId)
  } catch (err) {
    // Log but don't fail — feedback already saved in DB
    console.warn('[Feedback] Telegram delivery failed:', (err as Error).message)
  }

  return NextResponse.json({ ok: true })
}
