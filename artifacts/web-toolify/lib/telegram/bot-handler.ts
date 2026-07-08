/**
 * Telegram Bot — Message Handler + Dashboard
 */

import {
  isAuthenticated,
  sessionRemainingMs,
  getLoginState,
  startLogin,
  processAuthInput,
  logout,
  formatCountdown,
  formatSession,
  LOCKOUT_DURATION_MS,
} from './bot-auth'
import { dbGetFeedback, type FeedbackRow } from './db'
import { getGa4Snapshot } from './ga4-monitor'

// ── Telegram helpers ──────────────────────────────────────────────────────────

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''

async function send(chatId: number, text: string, extra: Record<string, unknown> = {}): Promise<void> {
  const token = TOKEN()
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
    signal:  AbortSignal.timeout(8_000),
  }).catch((err) => console.warn('[Bot] send failed:', err.message))
}

// send multiple messages sequentially (avoids Telegram flood)
async function sendAll(chatId: number, messages: string[]): Promise<void> {
  for (const msg of messages) {
    await send(chatId, msg)
    await new Promise((r) => setTimeout(r, 300))
  }
}

// ── Telegram Update type ──────────────────────────────────────────────────────

interface TgMessage { message_id: number; from?: { id: number; first_name: string }; chat: { id: number }; text?: string }
interface TgUpdate  { update_id: number; message?: TgMessage }

// ── Dashboard formatting ──────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  suggestion: '💡',
  bug:        '🐛',
  feature:    '✨',
  general:    '💬',
}
const TYPE_AR: Record<string, string> = {
  suggestion: 'اقتراح',
  bug:        'مشكلة',
  feature:    'طلب ميزة',
  general:    'عام',
}

function bar(ratio: number, total = 8): string {
  const filled = Math.round(ratio * total)
  return '█'.repeat(filled) + '░'.repeat(total - filled)
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  const min  = Math.floor(diff / 60_000)
  const hr   = Math.floor(diff / 3_600_000)
  const day  = Math.floor(diff / 86_400_000)
  if (day >= 1)  return `${day}ي`
  if (hr  >= 1)  return `${hr}س`
  if (min >= 1)  return `${min}د`
  return 'الآن'
}

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length)
}

function buildDashboard(rows: FeedbackRow[]): string[] {
  const total   = rows.length
  const now     = Date.now()
  const h24     = rows.filter((r) => now - r.created_at < 86_400_000).length
  const d7      = rows.filter((r) => now - r.created_at < 7 * 86_400_000).length
  const d30     = rows.filter((r) => now - r.created_at < 30 * 86_400_000).length

  const counts  = { suggestion: 0, bug: 0, feature: 0, general: 0 }
  for (const r of rows) {
    const k = r.type as keyof typeof counts
    if (k in counts) counts[k]++
  }

  // ── Message 1: Header + Stats ─────────────────────────────────────────────
  const msg1 = [
    `<b>╔══════════════════════════╗</b>`,
    `<b>║   🖥  TOOLIFY ADMIN      ║</b>`,
    `<b>╚══════════════════════════╝</b>`,
    ``,
    `<b>📊 إحصائيات الفيدباك</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `<code>📥 الإجمالي   ${String(total).padStart(4)} رسالة</code>`,
    ``,
    ...(['suggestion', 'bug', 'feature', 'general'] as const).map((type) => {
      const count  = counts[type]
      const pct    = total > 0 ? Math.round((count / total) * 100) : 0
      const b      = bar(total > 0 ? count / total : 0)
      const icon   = TYPE_ICON[type]
      const label  = pad(TYPE_AR[type], 9)
      return `<code>${icon} ${label} ${String(count).padStart(3)}  ${b}  ${String(pct).padStart(3)}%</code>`
    }),
    ``,
    `<b>⏱ النشاط الأخير</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `<code>🕐 آخر 24 ساعة  ${String(h24).padStart(4)} رسالة</code>`,
    `<code>📅 آخر 7 أيام   ${String(d7).padStart(4)} رسالة</code>`,
    `<code>📆 آخر 30 يوم   ${String(d30).padStart(4)} رسالة</code>`,
  ].join('\n')

  if (total === 0) {
    return [msg1 + '\n\n<i>لا توجد رسائل بعد.</i>']
  }

  // ── Message 2: Latest feedbacks ───────────────────────────────────────────
  const latest = rows.slice(0, 5)
  const lines  = [
    `<b>📋 آخر ${latest.length} رسائل</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
  ]

  for (let i = 0; i < latest.length; i++) {
    const r    = latest[i]
    const icon = TYPE_ICON[r.type] ?? '💬'
    const type = TYPE_AR[r.type]   ?? r.type
    const ago  = timeAgo(r.created_at)
    const msg  = r.message.length > 120 ? r.message.slice(0, 120) + '…' : r.message
    const meta: string[] = []
    if (r.email)       meta.push(`📧 ${r.email}`)
    if (r.country)     meta.push(`🌍 ${r.country}`)
    if (r.device_type) meta.push(`${r.device_type === 'mobile' ? '📱' : '🖥'} ${r.device_type}`)
    if (r.page_name)   meta.push(`📄 ${r.page_name}`)

    lines.push(``)
    lines.push(`<b>${i + 1}. ${icon} ${type}</b>  ·  <i>${ago}</i>`)
    lines.push(`<i>${escHtml(msg)}</i>`)
    if (meta.length) lines.push(`<code>${meta.join('  ')}</code>`)
    if (i < latest.length - 1) lines.push(`<code>· · · · · · · · · · · · ·</code>`)
  }

  lines.push(``)
  lines.push(`<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`)
  lines.push(`/feedback — المزيد   /stats — إحصائيات   /logout`)

  return [msg1, lines.join('\n')]
}

function buildFeedbackPage(rows: FeedbackRow[], page = 0, perPage = 5): string {
  const slice  = rows.slice(page * perPage, (page + 1) * perPage)
  const total  = rows.length
  const pages  = Math.ceil(total / perPage)

  if (slice.length === 0) return `📭 لا توجد رسائل في هذه الصفحة.`

  const lines = [
    `<b>📋 الفيدباك — صفحة ${page + 1}/${pages} (${total} إجمالي)</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
  ]

  for (const r of slice) {
    const icon = TYPE_ICON[r.type] ?? '💬'
    const type = TYPE_AR[r.type]   ?? r.type
    const ago  = timeAgo(r.created_at)
    const date = new Date(r.created_at).toLocaleDateString('ar-EG')
    const msg  = r.message.length > 200 ? r.message.slice(0, 200) + '…' : r.message

    lines.push(``)
    lines.push(`${icon} <b>${type}</b>  ·  <code>${date}</code>  ·  <i>${ago}</i>`)
    lines.push(escHtml(msg))
    if (r.email)       lines.push(`📧 <code>${r.email}</code>`)
    if (r.page_name)   lines.push(`📄 ${r.page_name}`)
    const meta: string[] = []
    if (r.country)     meta.push(r.country)
    if (r.device_type) meta.push(r.device_type)
    if (r.browser)     meta.push(r.browser.slice(0, 30))
    if (meta.length)   lines.push(`<code>${meta.join(' · ')}</code>`)
    lines.push(`<code>─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</code>`)
  }

  if (pages > 1) {
    lines.push(``)
    lines.push(`الصفحة التالية: <code>/feedback ${page + 2}</code>  (لو في المزيد)`)
  }

  return lines.join('\n')
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Commands (authenticated) ──────────────────────────────────────────────────

const HELP_TEXT = [
  `<b>🤖 لوحة تحكم Toolify</b>`,
  `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
  ``,
  `/dashboard — الداشبورد الرئيسي`,
  `/feedback  — قائمة الفيدباك`,
  `/stats     — إحصائيات تفصيلية`,
  `/ga4       — إحصائيات Google Analytics`,
  `/status    — حالة الجلسة`,
  `/logout    — تسجيل الخروج`,
  `/help      — هذه القائمة`,
].join('\n')

async function handleCommand(chatId: number, text: string): Promise<void> {
  const parts   = text.trim().split(/\s+/)
  const command = parts[0].toLowerCase()

  // ── /dashboard or /start ─────────────────────────────────────────────────
  if (command === '/dashboard' || command === '/start') {
    const rows     = dbGetFeedback(200)
    const messages = buildDashboard(rows)
    await sendAll(chatId, messages)
    return
  }

  // ── /feedback [page] ──────────────────────────────────────────────────────
  if (command === '/feedback') {
    const page = Math.max(0, (parseInt(parts[1] ?? '1', 10) || 1) - 1)
    const rows = dbGetFeedback(200)
    await send(chatId, buildFeedbackPage(rows, page))
    return
  }

  // ── /stats ────────────────────────────────────────────────────────────────
  if (command === '/stats') {
    const rows  = dbGetFeedback(500)
    const total = rows.length
    if (total === 0) {
      await send(chatId, `📭 لا توجد بيانات بعد.`)
      return
    }

    // Top pages
    const pageCount: Record<string, number> = {}
    const countryCount: Record<string, number> = {}
    const deviceCount: Record<string, number> = {}
    for (const r of rows) {
      if (r.page_name) pageCount[r.page_name]   = (pageCount[r.page_name]   ?? 0) + 1
      if (r.country)   countryCount[r.country]   = (countryCount[r.country]   ?? 0) + 1
      if (r.device_type) deviceCount[r.device_type] = (deviceCount[r.device_type] ?? 0) + 1
    }

    const topPages   = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const topCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const withEmail  = rows.filter((r) => r.email).length

    const lines = [
      `<b>📈 إحصائيات تفصيلية</b>`,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      ``,
      `<b>📱 الأجهزة</b>`,
      ...Object.entries(deviceCount).sort((a, b) => b[1] - a[1]).map(([d, c]) =>
        `<code>${(d === 'mobile' ? '📱' : '🖥')} ${pad(d, 10)} ${String(c).padStart(3)}  ${bar(c / total, 6)}</code>`
      ),
      ``,
      `<b>🌍 أكثر الدول</b>`,
      ...topCountry.map(([c, n]) =>
        `<code>🌐 ${pad(c, 5)} ${String(n).padStart(3)}  ${bar(n / total, 6)}</code>`
      ),
      ``,
      `<b>📄 أكثر الصفحات</b>`,
      ...topPages.map(([p, n]) =>
        `<code>${String(n).padStart(3)}×  ${escHtml(p.slice(0, 22))}</code>`
      ),
      ``,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      `<code>📧 مع إيميل   ${String(withEmail).padStart(4)} / ${total}</code>`,
    ]

    await send(chatId, lines.join('\n'))
    return
  }

  // ── /status ───────────────────────────────────────────────────────────────
  if (command === '/status') {
    const rem = sessionRemainingMs(chatId)
    if (rem <= 0) {
      await send(chatId, `⏰ انتهت جلستك. أرسل /start للدخول مجدداً.`)
      return
    }
    await send(chatId, [
      `<b>🔐 الجلسة نشطة</b>`,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      `⏳ تنتهي بعد: <b>${formatSession(rem)}</b>`,
    ].join('\n'))
    return
  }

  // ── /logout ───────────────────────────────────────────────────────────────
  if (command === '/logout') {
    logout(chatId)
    await send(chatId, [
      `<b>👋 تم تسجيل الخروج</b>`,
      ``,
      `أرسل /start للدخول مجدداً.`,
    ].join('\n'))
    return
  }

  // ── /ga4 ──────────────────────────────────────────────────────────────────
  if (command === '/ga4') {
    const snap = getGa4Snapshot()
    if (!snap) {
      await send(chatId, [
        `📊 <b>Google Analytics 4</b>`,
        `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
        ``,
        `⏳ جاري جمع البيانات من GA4…`,
        ``,
        `<i>تأكد من ضبط:</i>`,
        `<code>GA_PROPERTY_ID</code>`,
        `<code>GOOGLE_SERVICE_ACCOUNT_KEY</code>`,
        `<code>TELEGRAM_CHAT_ID</code>`,
      ].join('\n'))
      return
    }

    const deviceIcon = snap.device === 'mobile' ? '📱' : snap.device === 'tablet' ? '📟' : '🖥'
    const srcIcon    = snap.source.includes('Organic') ? '🔍' : snap.source.includes('Social') ? '📲' : snap.source.includes('Referral') ? '🔗' : '🚀'
    const updatedAgo = Math.round((Date.now() - snap.fetchedAt) / 60_000)
    const pagesBlock = snap.activePages
      .map((p, i) => `<code>${i + 1}. ${p.path.slice(0, 28).padEnd(28)} ${String(p.users).padStart(3)} 👤</code>`)
      .join('\n')

    await send(chatId, [
      `📊 <b>Google Analytics — Live</b>`,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      ``,
      `👥 <b>Active Users (30 min):</b>  <b>${snap.activeUsers}</b>`,
      `🆕 <b>New Users Today:</b>        <b>${snap.newUsers30m}</b>`,
      ``,
      `<b>📄 Top Active Pages</b>`,
      pagesBlock || `<code>  — لا يوجد نشاط حالياً</code>`,
      ``,
      `🌍 <b>Country:</b>  ${snap.country}`,
      `${deviceIcon} <b>Device:</b>   ${snap.device}`,
      `🌐 <b>Browser:</b>  ${snap.browser}`,
      `${srcIcon} <b>Source:</b>   ${snap.source}`,
      ``,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      `🕐 آخر تحديث: منذ ${updatedAgo === 0 ? 'أقل من دقيقة' : `${updatedAgo} دقيقة`}`,
    ].join('\n'))
    return
  }

  // ── /help ─────────────────────────────────────────────────────────────────
  if (command === '/help') {
    await send(chatId, HELP_TEXT)
    return
  }

  // ── Unknown ───────────────────────────────────────────────────────────────
  await send(chatId, `❓ أمر غير معروف.\n\n${HELP_TEXT}`)
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function handleUpdate(update: TgUpdate): Promise<void> {
  const message = update.message
  if (!message?.text) return

  const chatId = message.chat.id
  const text   = message.text.trim()

  // ── Already authenticated ─────────────────────────────────────────────────
  if (isAuthenticated(chatId)) {
    await handleCommand(chatId, text)
    return
  }

  // ── /start when not authenticated — begin login ───────────────────────────
  if (text.toLowerCase() === '/start') {
    startLogin(chatId)
    await send(chatId, [
      `<b>╔══════════════════════════╗</b>`,
      `<b>║   🔐  TOOLIFY ADMIN      ║</b>`,
      `<b>╚══════════════════════════╝</b>`,
      ``,
      `للدخول، أدخل <b>الاسم الثلاثي</b> للمطور:`,
    ].join('\n'))
    return
  }

  // ── In login flow ─────────────────────────────────────────────────────────
  const loginState = getLoginState(chatId)

  if (loginState === 'idle') {
    await send(chatId, `🔒 <b>هذا البوت مقيّد.</b>\n\nأرسل /start للبدء.`)
    return
  }

  const result = processAuthInput(chatId, text)

  switch (result.action) {
    case 'locked':
      await send(chatId, [
        `🚫 <b>الوصول مجمّد مؤقتاً</b>`,
        ``,
        `يمكنك المحاولة بعد:`,
        `⏳ <b>${formatCountdown(result.remainingMs)}</b>`,
      ].join('\n'))
      break

    case 'locked_now':
      await send(chatId, [
        `🚫 <b>تم قفل الوصول ${formatCountdown(LOCKOUT_DURATION_MS)}</b>`,
        ``,
        `تجاوزت الحد الأقصى للمحاولات الخاطئة.`,
        `سيُفتح الوصول تلقائياً بعد انتهاء المدة.`,
      ].join('\n'))
      break

    case 'name_ok':
      await send(chatId, `✅ الاسم صحيح.\n\nأدخل الآن <b>كلمة المرور</b>:`)
      break

    case 'wrong_name':
      await send(chatId, [
        `❌ <b>الاسم غير صحيح.</b>`,
        ``,
        `المحاولات المتبقية: <b>${result.attemptsLeft}</b>`,
        result.attemptsLeft === 1 ? `⚠️ <b>محاولة أخيرة!</b> بعدها قفل 10 دقائق.` : ``,
      ].filter(Boolean).join('\n'))
      break

    case 'success': {
      // Show welcome + full dashboard immediately
      await send(chatId, [
        `<b>╔══════════════════════════╗</b>`,
        `<b>║  ✅  تم الدخول بنجاح     ║</b>`,
        `<b>╚══════════════════════════╝</b>`,
        ``,
        `🔐 جلستك نشطة لمدة <b>ساعة كاملة</b>`,
        ``,
        `جاري تحميل الداشبورد…`,
      ].join('\n'))
      // Small delay then send dashboard
      await new Promise((r) => setTimeout(r, 600))
      const rows     = dbGetFeedback(200)
      const messages = buildDashboard(rows)
      await sendAll(chatId, messages)
      break
    }

    case 'wrong_password':
      await send(chatId, [
        `❌ <b>كلمة المرور غير صحيحة.</b>`,
        ``,
        `المحاولات المتبقية: <b>${result.attemptsLeft}</b>`,
        result.attemptsLeft === 1 ? `⚠️ <b>محاولة أخيرة!</b> بعدها قفل 10 دقائق.` : ``,
      ].filter(Boolean).join('\n'))
      break

    case 'need_name':
      startLogin(chatId)
      await send(chatId, `🔐 أدخل <b>الاسم الثلاثي</b> للمطور:`)
      break

    case 'need_password':
      await send(chatId, `✏️ أدخل <b>كلمة المرور</b>:`)
      break
  }
}
