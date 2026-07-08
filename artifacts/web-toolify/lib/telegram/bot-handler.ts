/**
 * Telegram Bot — Message & Callback Handler
 *
 * Full inline-keyboard UI. Every section is a button — no manual commands needed.
 *
 * Keyboard layout after login:
 *   [📊 GA4 Live]       [📈 إحصائيات]
 *   [💬 الفيدباك]       [🔔 آخر الرسائل]
 *   [🔧 حالة الجلسة]   [👋 تسجيل الخروج]
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

// ── Telegram types ────────────────────────────────────────────────────────────

interface TgUser    { id: number; first_name: string }
interface TgChat    { id: number }
interface TgMessage { message_id: number; from?: TgUser; chat: TgChat; text?: string }
interface TgCallbackQuery {
  id: string
  from: TgUser
  message?: TgMessage
  data?: string
}
export interface TgUpdate {
  update_id:       number
  message?:        TgMessage
  callback_query?: TgCallbackQuery
}

// ── Inline keyboard types ─────────────────────────────────────────────────────

interface IKButton { text: string; callback_data: string }
type IKMarkup = { inline_keyboard: IKButton[][] }

// ── Telegram API helpers ──────────────────────────────────────────────────────

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''

async function tgPost(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = TOKEN()
  if (!token) return
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(10_000),
  }).catch((err: Error) => { console.warn(`[Bot] ${method} failed:`, err.message); return null })
  return res ? res.json().catch(() => null) : null
}

async function send(chatId: number, text: string, keyboard?: IKMarkup): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML' }
  if (keyboard) body.reply_markup = keyboard
  await tgPost('sendMessage', body)
}

async function editText(chatId: number, msgId: number, text: string, keyboard?: IKMarkup): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML' }
  if (keyboard) body.reply_markup = keyboard
  await tgPost('editMessageText', body)
}

async function answerCb(callbackId: string, text?: string): Promise<void> {
  await tgPost('answerCallbackQuery', { callback_query_id: callbackId, text: text ?? '' })
}

async function sendAll(chatId: number, messages: string[], keyboard?: IKMarkup): Promise<void> {
  for (let i = 0; i < messages.length; i++) {
    const isLast = i === messages.length - 1
    await send(chatId, messages[i], isLast ? keyboard : undefined)
    if (!isLast) await new Promise((r) => setTimeout(r, 350))
  }
}

// ── Keyboards ─────────────────────────────────────────────────────────────────

const MAIN_MENU: IKMarkup = {
  inline_keyboard: [
    [
      { text: '📊 GA4 Live',     callback_data: 'ga4' },
      { text: '📈 إحصائيات',     callback_data: 'stats' },
    ],
    [
      { text: '💬 الفيدباك',     callback_data: 'feedback:0' },
      { text: '🔔 آخر الرسائل',  callback_data: 'latest' },
    ],
    [
      { text: '🔧 حالة الجلسة',  callback_data: 'status' },
      { text: '👋 تسجيل الخروج', callback_data: 'logout' },
    ],
  ],
}

const BACK_MENU: IKMarkup = {
  inline_keyboard: [
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
  ],
}

function feedbackNav(page: number, totalPages: number): IKMarkup {
  const nav: IKButton[] = []
  if (page > 0)             nav.push({ text: '⬅️ السابق', callback_data: `feedback:${page - 1}` })
  if (page < totalPages - 1) nav.push({ text: 'التالي ➡️', callback_data: `feedback:${page + 1}` })
  return {
    inline_keyboard: [
      nav.length ? nav : [],
      [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
    ].filter((r) => r.length > 0),
  }
}

const GA4_KEYBOARD: IKMarkup = {
  inline_keyboard: [
    [
      { text: '🔄 تحديث',             callback_data: 'ga4' },
      { text: '🏠 القائمة الرئيسية', callback_data: 'menu' },
    ],
  ],
}

// ── Formatters ────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  suggestion: '💡', bug: '🐛', feature: '✨', general: '💬',
}
const TYPE_AR: Record<string, string> = {
  suggestion: 'اقتراح', bug: 'مشكلة', feature: 'طلب ميزة', general: 'عام',
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
  if (day >= 1) return `${day}ي`
  if (hr  >= 1) return `${hr}س`
  if (min >= 1) return `${min}د`
  return 'الآن'
}

function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length)
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ── Section builders ──────────────────────────────────────────────────────────

function buildMainMenuText(rows: FeedbackRow[]): string {
  const total = rows.length
  const now   = Date.now()
  const h24   = rows.filter((r) => now - r.created_at < 86_400_000).length
  const d7    = rows.filter((r) => now - r.created_at < 7 * 86_400_000).length

  const counts = { suggestion: 0, bug: 0, feature: 0, general: 0 }
  for (const r of rows) {
    const k = r.type as keyof typeof counts
    if (k in counts) counts[k]++
  }

  return [
    `<b>╔══════════════════════════╗</b>`,
    `<b>║   🖥  TOOLIFY ADMIN      ║</b>`,
    `<b>╚══════════════════════════╝</b>`,
    ``,
    `<b>📊 ملخص الفيدباك</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `<code>📥 الإجمالي    ${String(total).padStart(4)} رسالة</code>`,
    `<code>🕐 آخر 24 ساعة ${String(h24).padStart(4)} رسالة</code>`,
    `<code>📅 آخر 7 أيام  ${String(d7).padStart(4)} رسالة</code>`,
    ``,
    ...(['suggestion', 'bug', 'feature', 'general'] as const).map((type) => {
      const count = counts[type]
      const pct   = total > 0 ? Math.round((count / total) * 100) : 0
      const b     = bar(total > 0 ? count / total : 0, 6)
      return `<code>${TYPE_ICON[type]} ${pad(TYPE_AR[type], 9)} ${String(count).padStart(3)}  ${b}  ${String(pct).padStart(3)}%</code>`
    }),
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `<i>اختر قسماً من الأزرار أدناه 👇</i>`,
  ].join('\n')
}

function buildLatestFeedback(rows: FeedbackRow[]): string {
  if (rows.length === 0) {
    return `<b>🔔 آخر الرسائل</b>\n\n<i>لا توجد رسائل بعد.</i>`
  }
  const latest = rows.slice(0, 5)
  const lines  = [
    `<b>🔔 آخر ${latest.length} رسائل</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
  ]
  for (const r of latest) {
    const icon = TYPE_ICON[r.type] ?? '💬'
    const type = TYPE_AR[r.type]   ?? r.type
    const ago  = timeAgo(r.created_at)
    const msg  = r.message.length > 100 ? r.message.slice(0, 100) + '…' : r.message
    lines.push(``)
    lines.push(`${icon} <b>${type}</b>  ·  <i>${ago}</i>`)
    lines.push(`<i>${escHtml(msg)}</i>`)
    const meta: string[] = []
    if (r.country)     meta.push(`🌍 ${r.country}`)
    if (r.device_type) meta.push(r.device_type === 'mobile' ? '📱' : '🖥️')
    if (r.page_name)   meta.push(`📄 ${r.page_name}`)
    if (meta.length)   lines.push(`<code>${meta.join('  ')}</code>`)
  }
  return lines.join('\n')
}

function buildFeedbackPage(rows: FeedbackRow[], page = 0, perPage = 4): { text: string; pages: number } {
  const total  = rows.length
  const pages  = Math.max(1, Math.ceil(total / perPage))
  const slice  = rows.slice(page * perPage, (page + 1) * perPage)

  if (slice.length === 0) {
    return { text: `📭 لا توجد رسائل في هذه الصفحة.`, pages }
  }

  const lines = [
    `<b>💬 الفيدباك — صفحة ${page + 1}/${pages}</b>  <code>(${total} إجمالي)</code>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
  ]
  for (const r of slice) {
    const icon = TYPE_ICON[r.type] ?? '💬'
    const type = TYPE_AR[r.type]   ?? r.type
    const ago  = timeAgo(r.created_at)
    const msg  = r.message.length > 180 ? r.message.slice(0, 180) + '…' : r.message
    lines.push(``)
    lines.push(`${icon} <b>${type}</b>  ·  <i>${ago}</i>`)
    lines.push(escHtml(msg))
    if (r.email)       lines.push(`📧 <code>${r.email}</code>`)
    const meta: string[] = []
    if (r.page_name)   meta.push(`📄 ${r.page_name}`)
    if (r.country)     meta.push(`🌍 ${r.country}`)
    if (r.device_type) meta.push(r.device_type === 'mobile' ? '📱 mobile' : '🖥️ desktop')
    if (meta.length)   lines.push(`<code>${meta.join('  ')}</code>`)
    lines.push(`<code>─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─</code>`)
  }
  return { text: lines.join('\n'), pages }
}

function buildStats(rows: FeedbackRow[]): string {
  const total = rows.length
  if (total === 0) return `📈 <b>الإحصائيات</b>\n\n<i>لا توجد بيانات بعد.</i>`

  const pageCount:   Record<string, number> = {}
  const countryCount: Record<string, number> = {}
  const deviceCount: Record<string, number> = {}
  for (const r of rows) {
    if (r.page_name)   pageCount[r.page_name]     = (pageCount[r.page_name]     ?? 0) + 1
    if (r.country)     countryCount[r.country]     = (countryCount[r.country]     ?? 0) + 1
    if (r.device_type) deviceCount[r.device_type]  = (deviceCount[r.device_type]  ?? 0) + 1
  }
  const topPages   = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const withEmail  = rows.filter((r) => r.email).length

  return [
    `<b>📈 إحصائيات تفصيلية</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    ``,
    `<b>📱 الأجهزة</b>`,
    ...Object.entries(deviceCount).sort((a, b) => b[1] - a[1]).map(([d, c]) =>
      `<code>${d === 'mobile' ? '📱' : '🖥️'} ${pad(d, 10)} ${String(c).padStart(3)}  ${bar(c / total, 6)}</code>`
    ),
    ``,
    `<b>🌍 أكثر الدول</b>`,
    ...topCountry.map(([c, n]) =>
      `<code>🌐 ${pad(c, 12)} ${String(n).padStart(3)}  ${bar(n / total, 6)}</code>`
    ),
    ``,
    `<b>📄 أكثر الصفحات</b>`,
    ...topPages.map(([p, n]) =>
      `<code>${String(n).padStart(3)}×  ${escHtml(p.slice(0, 22))}</code>`
    ),
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `<code>📧 مع إيميل   ${String(withEmail).padStart(4)} / ${total}</code>`,
  ].join('\n')
}

function buildGa4(): string {
  const snap = getGa4Snapshot()

  if (!snap) {
    return [
      `📊 <b>Google Analytics 4 — Live</b>`,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      ``,
      `⏳ <b>جاري جمع البيانات…</b>`,
      ``,
      `<i>تأكد من ضبط المتغيرات:</i>`,
      `<code>GA_PROPERTY_ID</code>`,
      `<code>GOOGLE_SERVICE_ACCOUNT_KEY</code>`,
    ].join('\n')
  }

  const deviceIcon = snap.device === 'mobile' ? '📱' : snap.device === 'tablet' ? '📟' : '🖥️'
  const srcIcon    = snap.source.includes('Organic')  ? '🔍'
                   : snap.source.includes('Social')   ? '📲'
                   : snap.source.includes('Referral') ? '🔗' : '🚀'
  const updatedAgo = Math.round((Date.now() - snap.fetchedAt) / 60_000)

  const pagesBlock = snap.activePages.length
    ? snap.activePages.map((p, i) =>
        `<code>${i + 1}. ${p.path.slice(0, 25).padEnd(25)} ${String(p.users).padStart(3)} 👤</code>`
      ).join('\n')
    : `<code>  — لا يوجد نشاط حالياً</code>`

  return [
    `📊 <b>Google Analytics — Live</b>`,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    ``,
    `👥 <b>نشطون الآن (30 د):</b>  <b>${snap.activeUsers}</b>`,
    `🆕 <b>جدد اليوم:</b>           <b>${snap.newUsers30m}</b>`,
    ``,
    `<b>📄 أكثر الصفحات نشاطاً</b>`,
    pagesBlock,
    ``,
    `🌍 <b>الدولة:</b>    ${snap.country}`,
    `${deviceIcon} <b>الجهاز:</b>   ${snap.device}`,
    `🌐 <b>المتصفح:</b>  ${snap.browser}`,
    `${srcIcon} <b>المصدر:</b>   ${snap.source}`,
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `🕐 آخر تحديث: منذ ${updatedAgo === 0 ? 'أقل من دقيقة' : `${updatedAgo} دقيقة`}`,
  ].join('\n')
}

// ── Handle callback_query (button press) ──────────────────────────────────────

async function handleCallback(cb: TgCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id
  const msgId  = cb.message?.message_id
  if (!chatId) return

  // Must be authenticated
  if (!isAuthenticated(chatId)) {
    await answerCb(cb.id, '🔒 انتهت جلستك — أرسل /start')
    return
  }

  const data = cb.data ?? ''
  await answerCb(cb.id)

  // ── menu ──────────────────────────────────────────────────────────────────
  if (data === 'menu') {
    const rows = dbGetFeedback(200)
    const text = buildMainMenuText(rows)
    if (msgId) await editText(chatId, msgId, text, MAIN_MENU)
    else       await send(chatId, text, MAIN_MENU)
    return
  }

  // ── ga4 ───────────────────────────────────────────────────────────────────
  if (data === 'ga4') {
    const text = buildGa4()
    if (msgId) await editText(chatId, msgId, text, GA4_KEYBOARD)
    else       await send(chatId, text, GA4_KEYBOARD)
    return
  }

  // ── stats ─────────────────────────────────────────────────────────────────
  if (data === 'stats') {
    const rows = dbGetFeedback(500)
    const text = buildStats(rows)
    if (msgId) await editText(chatId, msgId, text, BACK_MENU)
    else       await send(chatId, text, BACK_MENU)
    return
  }

  // ── latest ────────────────────────────────────────────────────────────────
  if (data === 'latest') {
    const rows = dbGetFeedback(200)
    const text = buildLatestFeedback(rows)
    if (msgId) await editText(chatId, msgId, text, BACK_MENU)
    else       await send(chatId, text, BACK_MENU)
    return
  }

  // ── feedback:<page> ───────────────────────────────────────────────────────
  if (data.startsWith('feedback:')) {
    const page = parseInt(data.split(':')[1] ?? '0', 10) || 0
    const rows = dbGetFeedback(500)
    const { text, pages } = buildFeedbackPage(rows, page)
    const kb = feedbackNav(page, pages)
    if (msgId) await editText(chatId, msgId, text, kb)
    else       await send(chatId, text, kb)
    return
  }

  // ── status ────────────────────────────────────────────────────────────────
  if (data === 'status') {
    const rem  = sessionRemainingMs(chatId)
    const text = rem <= 0
      ? `⏰ <b>انتهت الجلسة</b>\n\nأرسل /start للدخول مجدداً.`
      : [`<b>🔐 الجلسة نشطة</b>`, `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`, `⏳ تنتهي بعد: <b>${formatSession(rem)}</b>`].join('\n')
    if (msgId) await editText(chatId, msgId, text, BACK_MENU)
    else       await send(chatId, text, BACK_MENU)
    return
  }

  // ── logout ────────────────────────────────────────────────────────────────
  if (data === 'logout') {
    logout(chatId)
    const text = [`<b>👋 تم تسجيل الخروج</b>`, ``, `أرسل /start للدخول مجدداً.`].join('\n')
    if (msgId) await editText(chatId, msgId, text)
    else       await send(chatId, text)
  }
}

// ── Handle text commands (kept for power users) ───────────────────────────────

async function handleCommand(chatId: number, text: string): Promise<void> {
  const cmd = text.trim().split(/\s+/)[0].toLowerCase()

  if (cmd === '/dashboard' || cmd === '/start') {
    const rows = dbGetFeedback(200)
    await sendAll(chatId, [buildMainMenuText(rows)], MAIN_MENU)
    return
  }
  if (cmd === '/ga4') {
    await send(chatId, buildGa4(), GA4_KEYBOARD)
    return
  }
  if (cmd === '/stats') {
    const rows = dbGetFeedback(500)
    await send(chatId, buildStats(rows), BACK_MENU)
    return
  }
  if (cmd === '/feedback') {
    const rows        = dbGetFeedback(500)
    const { text: t, pages } = buildFeedbackPage(rows, 0)
    await send(chatId, t, feedbackNav(0, pages))
    return
  }
  if (cmd === '/latest') {
    const rows = dbGetFeedback(200)
    await send(chatId, buildLatestFeedback(rows), BACK_MENU)
    return
  }
  if (cmd === '/status') {
    const rem  = sessionRemainingMs(chatId)
    const msg  = rem <= 0
      ? `⏰ انتهت جلستك. أرسل /start للدخول مجدداً.`
      : [`<b>🔐 الجلسة نشطة</b>`, `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`, `⏳ تنتهي بعد: <b>${formatSession(rem)}</b>`].join('\n')
    await send(chatId, msg, BACK_MENU)
    return
  }
  if (cmd === '/logout') {
    logout(chatId)
    await send(chatId, `<b>👋 تم تسجيل الخروج</b>\n\nأرسل /start للدخول مجدداً.`)
    return
  }
  if (cmd === '/help') {
    await send(chatId, [
      `<b>🤖 لوحة تحكم Toolify</b>`,
      `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
      ``,
      `استخدم <b>الأزرار</b> في الداشبورد للتنقل بين الأقسام.`,
      ``,
      `أوامر متاحة:`,
      `/dashboard — الداشبورد الرئيسي`,
      `/ga4       — Google Analytics Live`,
      `/stats     — إحصائيات تفصيلية`,
      `/feedback  — قائمة الفيدباك`,
      `/latest    — آخر الرسائل`,
      `/status    — حالة الجلسة`,
      `/logout    — تسجيل الخروج`,
    ].join('\n'), BACK_MENU)
    return
  }

  // Unknown command — show main menu
  const rows = dbGetFeedback(200)
  await send(chatId, buildMainMenuText(rows), MAIN_MENU)
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function handleUpdate(update: TgUpdate): Promise<void> {

  // ── callback_query (button press) ─────────────────────────────────────────
  if (update.callback_query) {
    await handleCallback(update.callback_query)
    return
  }

  const message = update.message
  if (!message?.text) return

  const chatId = message.chat.id
  const text   = message.text.trim()

  // ── Already authenticated ─────────────────────────────────────────────────
  if (isAuthenticated(chatId)) {
    await handleCommand(chatId, text)
    return
  }

  // ── /start → begin login ──────────────────────────────────────────────────
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
      await send(chatId, [
        `<b>╔══════════════════════════╗</b>`,
        `<b>║  ✅  تم الدخول بنجاح     ║</b>`,
        `<b>╚══════════════════════════╝</b>`,
        ``,
        `🔐 جلستك نشطة لمدة <b>ساعة كاملة</b>`,
        ``,
        `جاري تحميل الداشبورد…`,
      ].join('\n'))
      await new Promise((r) => setTimeout(r, 600))
      const rows = dbGetFeedback(200)
      await send(chatId, buildMainMenuText(rows), MAIN_MENU)
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
