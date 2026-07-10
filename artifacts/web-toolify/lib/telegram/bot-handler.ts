/**
 * Telegram Bot — Message & Callback Handler
 *
 * Professional admin dashboard with clean layout, icons and structured sections.
 *
 * Main keyboard:
 *   [📊 GA4 Live]     [🌍 الدول]
 *   [📈 إحصائيات]    [📄 الصفحات]
 *   [💬 الفيدباك]    [🔔 آخر الرسائل]
 *   [🔧 الجلسة]      [👋 خروج]
 */

import {
  isAuthenticated,
  isKeyOnlyMode,
  sessionRemainingMs,
  getLoginState,
  startLogin,
  processAuthInput,
  logout,
  renewSession,
  formatCountdown,
  formatSession,
  LOCKOUT_DURATION_MS,
} from './bot-auth'
import { dbGetFeedback, type FeedbackRow } from './db'
import { getGa4Snapshot } from './ga4-monitor'
import { getDomainRating } from './dr-service'

// ── Telegram types ────────────────────────────────────────────────────────────

interface TgUser    { id: number; first_name: string }
interface TgChat    { id: number }
interface TgMessage { message_id: number; from?: TgUser; chat: TgChat; text?: string }
interface TgCallbackQuery {
  id: string; from: TgUser; message?: TgMessage; data?: string
}
export interface TgUpdate {
  update_id:       number
  message?:        TgMessage
  callback_query?: TgCallbackQuery
}

interface IKButton { text: string; callback_data: string }
type IKMarkup = { inline_keyboard: IKButton[][] }

// Reply keyboard (persistent bottom keyboard)
type RKButton  = { text: string }
type RKMarkup  = { keyboard: RKButton[][]; resize_keyboard: boolean; persistent: boolean; is_persistent: boolean }
type RKRemove  = { remove_keyboard: true }
type AnyMarkup = IKMarkup | RKMarkup | RKRemove

// ── Reply keyboard — main nav ──────────────────────────────────────────────────

const REPLY_KB: RKMarkup = {
  keyboard: [
    [{ text: '🏠 الرئيسية' },  { text: '📊 GA4' }],
    [{ text: '🌍 الدول' },      { text: '📄 الصفحات' }],
    [{ text: '📈 إحصائيات' },  { text: '💬 الفيدباك' }],
    [{ text: '🔔 آخر الرسائل' }, { text: '🔧 الجلسة' }],
    [{ text: '👋 خروج' }],
  ],
  resize_keyboard: true,
  persistent:      true,
  is_persistent:   true,
}

const REPLY_KB_REMOVE: RKRemove = { remove_keyboard: true }

// ── Telegram API helpers ──────────────────────────────────────────────────────

const TOKEN = () => process.env.TELEGRAM_BOT_TOKEN ?? ''

async function tgPost(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = TOKEN()
  if (!token) return
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  }).catch((err: Error) => { console.warn(`[Bot] ${method} failed:`, err.message); return null })
  return res ? res.json().catch(() => null) : null
}

async function send(chatId: number, text: string, keyboard?: AnyMarkup): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }
  if (keyboard) body.reply_markup = keyboard
  await tgPost('sendMessage', body)
}

async function editText(chatId: number, msgId: number, text: string, keyboard?: IKMarkup): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', disable_web_page_preview: true }
  if (keyboard) body.reply_markup = keyboard
  await tgPost('editMessageText', body)
}

async function answerCb(callbackId: string, text?: string): Promise<void> {
  await tgPost('answerCallbackQuery', { callback_query_id: callbackId, text: text ?? '' })
}

// ── Keyboards ─────────────────────────────────────────────────────────────────

const MAIN_MENU: IKMarkup = {
  inline_keyboard: [
    [
      { text: '📊 GA4 Live',      callback_data: 'ga4' },
      { text: '🌍 الدول',          callback_data: 'countries' },
    ],
    [
      { text: '📈 إحصائيات',       callback_data: 'stats' },
      { text: '📄 الصفحات',        callback_data: 'pages' },
    ],
    [
      { text: '💬 الفيدباك',       callback_data: 'feedback:0' },
      { text: '🔔 آخر الرسائل',    callback_data: 'latest' },
    ],
    [
      { text: '🔧 حالة الجلسة',    callback_data: 'status' },
      { text: '👋 تسجيل الخروج',   callback_data: 'logout' },
    ],
  ],
}

const BACK_MENU: IKMarkup = {
  inline_keyboard: [
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
  ],
}

const GA4_KEYBOARD: IKMarkup = {
  inline_keyboard: [
    [
      { text: '🔄 تحديث',          callback_data: 'ga4' },
      { text: '🌍 الدول',           callback_data: 'countries' },
    ],
    [
      { text: '📄 الصفحات',         callback_data: 'pages' },
      { text: '🏠 القائمة',         callback_data: 'menu' },
    ],
  ],
}

const COUNTRIES_KEYBOARD: IKMarkup = {
  inline_keyboard: [
    [
      { text: '🔄 تحديث',           callback_data: 'countries' },
      { text: '📊 GA4 Live',        callback_data: 'ga4' },
    ],
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
  ],
}

const PAGES_KEYBOARD: IKMarkup = {
  inline_keyboard: [
    [
      { text: '🔄 تحديث',           callback_data: 'pages' },
      { text: '📊 GA4 Live',        callback_data: 'ga4' },
    ],
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
  ],
}

const STATS_KEYBOARD: IKMarkup = {
  inline_keyboard: [
    [
      { text: '🔄 تحديث',           callback_data: 'stats' },
      { text: '📊 GA4 Live',        callback_data: 'ga4' },
    ],
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
  ],
}

const LATEST_KEYBOARD: IKMarkup = {
  inline_keyboard: [
    [
      { text: '🔄 تحديث',           callback_data: 'latest' },
      { text: '💬 الفيدباك',        callback_data: 'feedback:0' },
    ],
    [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
  ],
}

function feedbackNav(page: number, totalPages: number): IKMarkup {
  const nav: IKButton[] = []
  if (page > 0)              nav.push({ text: '⬅️ السابق',  callback_data: `feedback:${page - 1}` })
  if (page < totalPages - 1) nav.push({ text: 'التالي ➡️', callback_data: `feedback:${page + 1}` })
  return {
    inline_keyboard: [
      ...(nav.length ? [nav] : []),
      [
        { text: '🔄 تحديث',           callback_data: 'feedback:0' },
        { text: '🏠 القائمة',         callback_data: 'menu' },
      ],
    ],
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, string> = {
  suggestion: '💡', bug: '🐛', feature: '✨', general: '💬',
}
const TYPE_AR: Record<string, string> = {
  suggestion: 'اقتراح', bug: 'مشكلة', feature: 'طلب ميزة', general: 'عام',
}

const COUNTRY_FLAGS: Record<string, string> = {
  'Saudi Arabia': '🇸🇦', 'United States': '🇺🇸', 'United Arab Emirates': '🇦🇪',
  'Egypt': '🇪🇬', 'Kuwait': '🇰🇼', 'Qatar': '🇶🇦', 'Bahrain': '🇧🇭',
  'Jordan': '🇯🇴', 'Iraq': '🇮🇶', 'Lebanon': '🇱🇧', 'Morocco': '🇲🇦',
  'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Libya': '🇱🇾', 'Sudan': '🇸🇩',
  'Yemen': '🇾🇪', 'Oman': '🇴🇲', 'Syria': '🇸🇾', 'Palestine': '🇵🇸',
  'United Kingdom': '🇬🇧', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Canada': '🇨🇦',
  'Australia': '🇦🇺', 'India': '🇮🇳', 'Pakistan': '🇵🇰', 'Turkey': '🇹🇷',
  'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾', 'Netherlands': '🇳🇱', 'Spain': '🇪🇸',
  'Italy': '🇮🇹', 'Russia': '🇷🇺', 'Brazil': '🇧🇷', 'China': '🇨🇳',
  'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Nigeria': '🇳🇬', 'Singapore': '🇸🇬',
}

function flag(country: string): string { return COUNTRY_FLAGS[country] ?? '🌐' }

function bar(ratio: number, len = 8): string {
  const f = Math.max(0, Math.min(len, Math.round(ratio * len)))
  return '█'.repeat(f) + '░'.repeat(len - f)
}
function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length)
}
function timeAgo(ms: number): string {
  const d = Date.now() - ms
  const m = Math.floor(d / 60_000), h = Math.floor(d / 3_600_000), dy = Math.floor(d / 86_400_000)
  if (dy >= 1) return `${dy}ي`
  if (h  >= 1) return `${h}س`
  if (m  >= 1) return `${m}د`
  return 'الآن'
}
function fmtAgo(ts: number): string {
  const m = Math.round((Date.now() - ts) / 60_000)
  return m === 0 ? 'أقل من دقيقة' : `${m} دقيقة`
}
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
}
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function deviceIcon(d: string): string {
  if (d === 'mobile') return '📱'
  if (d === 'tablet') return '📟'
  return '🖥'
}
function sourceIcon(s: string): string {
  if (s.includes('Organic')) return '🔍'
  if (s.includes('Social'))  return '📲'
  if (s.includes('Referral'))return '🔗'
  return '🚀'
}
function divider(): string { return `<code>▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰</code>` }
function thinLine(): string { return `<code>──────────────────────────</code>` }

// ── GA4 section builders ──────────────────────────────────────────────────────

function buildGa4(): string {
  const snap = getGa4Snapshot()

  if (!snap) {
    return [
      ``,
      `📡 <b>GOOGLE ANALYTICS 4  —  LIVE</b>`,
      divider(),
      ``,
      `⏳  <i>جاري تهيئة الاتصال بـ GA4…</i>`,
      ``,
      `<i>تأكد من إعداد متغيرات البيئة:</i>`,
      `<code>  • GA_PROPERTY_ID</code>`,
      `<code>  • GOOGLE_SERVICE_ACCOUNT_KEY</code>`,
    ].join('\n')
  }

  const now = fmtTime(snap.fetchedAt)
  const ago = fmtAgo(snap.fetchedAt)

  // ── KPIs ──
  const kpiBlock = [
    `<code>┌─────────────────────────────┐</code>`,
    `<code>│  🟢 نشطون الآن    ${String(snap.realtimeActive).padStart(6)}      │</code>`,
    `<code>│  👥 زوار اليوم    ${String(snap.todayUsers).padStart(6)}      │</code>`,
    `<code>│  🆕 جدد اليوم     ${String(snap.newUsers).padStart(6)}      │</code>`,
    `<code>│  📋 جلسات اليوم   ${String(snap.todaySessions).padStart(6)}      │</code>`,
    `<code>└─────────────────────────────┘</code>`,
  ].join('\n')

  // ── Top pages ──
  const totalPageUsers = snap.activePages.reduce((s, p) => s + p.users, 0) || 1
  const pagesBlock = snap.activePages.length
    ? snap.activePages.slice(0, 5).map((p, i) => {
        const name = p.path === '/' ? '/ (الرئيسية)' : p.path
        const pct  = Math.round((p.users / totalPageUsers) * 100)
        return `<code>${String(i + 1).padStart(2)}.  ${pad(name.slice(0, 18), 18)}  ${String(p.users).padStart(3)} 👤  ${pct}%</code>`
      }).join('\n')
    : `<code>  — لا يوجد نشاط حالياً</code>`

  // ── Devices ──
  const totalDevUsers = snap.devices.reduce((s, d) => s + d.users, 0) || 1
  const deviceLines = snap.devices.map(d => {
    const pct = Math.round((d.users / totalDevUsers) * 100)
    return `<code>  ${deviceIcon(d.device)} ${pad(d.device, 9)} ${String(d.users).padStart(3)}  ${bar(d.users / totalDevUsers, 7)}  ${String(pct).padStart(3)}%</code>`
  }).join('\n')

  // ── Sources ──
  const totalSrcUsers = snap.sources.reduce((s, x) => s + x.users, 0) || 1
  const sourceLines = snap.sources.slice(0, 4).map(s => {
    const pct = Math.round((s.users / totalSrcUsers) * 100)
    return `<code>  ${sourceIcon(s.source)} ${pad(s.source, 14)} ${String(s.users).padStart(3)}  ${bar(s.users / totalSrcUsers, 5)}  ${pct}%</code>`
  }).join('\n')

  const flg = COUNTRY_FLAGS[snap.country] ?? '🌐'

  return [
    ``,
    `📡 <b>GOOGLE ANALYTICS 4  —  LIVE</b>`,
    divider(),
    ``,
    `<b>📊  إحصائيات اليوم</b>`,
    kpiBlock,
    ``,
    `<b>📄  أكثر الصفحات نشاطاً</b>`,
    thinLine(),
    pagesBlock,
    ``,
    `<b>📱  الأجهزة</b>`,
    thinLine(),
    deviceLines || `<code>  — لا بيانات</code>`,
    ``,
    `<b>📡  مصادر الزيارات</b>`,
    thinLine(),
    sourceLines || `<code>  — لا بيانات</code>`,
    ``,
    `<b>🌍  الموقع الجغرافي والجهاز</b>`,
    thinLine(),
    `<code>  ${flg} ${snap.country}   ${deviceIcon(snap.device)} ${snap.device}   🌐 ${snap.browser}</code>`,
    `<code>  ${sourceIcon(snap.source)} ${snap.source}</code>`,
    ``,
    divider(),
    `<code>  🕐 ${now}  ·  منذ ${ago}</code>`,
  ].join('\n')
}

function buildCountries(): string {
  const snap = getGa4Snapshot()

  if (!snap) {
    return [
      `🌍 <b>COUNTRIES  —  اليوم</b>`,
      divider(),
      ``,
      `⏳  <i>البيانات غير متوفرة بعد…</i>`,
    ].join('\n')
  }

  if (!snap.topCountries.length) {
    return [
      `🌍 <b>COUNTRIES  —  اليوم</b>`,
      divider(),
      ``,
      `<i>لا توجد زيارات اليوم بعد.</i>`,
    ].join('\n')
  }

  const total = snap.topCountries.reduce((s, c) => s + c.users, 0) || 1
  const lines = snap.topCountries.map((c, i) => {
    const pct = Math.round((c.users / total) * 100)
    const b   = bar(c.users / total, 7)
    return `<code>${String(i + 1).padStart(2)}.  ${flag(c.country)} ${pad(c.country, 16)}  ${String(c.users).padStart(3)}  ${b}  ${String(pct).padStart(3)}%</code>`
  })

  return [
    ``,
    `🌍 <b>COUNTRIES  —  اليوم</b>`,
    divider(),
    ``,
    `<code>  👥 إجمالي زوار اليوم:  ${snap.todayUsers}   🆕 جدد: ${snap.newUsers}</code>`,
    ``,
    thinLine(),
    ...lines,
    thinLine(),
    ``,
    `<code>  🕐 منذ ${fmtAgo(snap.fetchedAt)}</code>`,
  ].join('\n')
}

function buildPages(): string {
  const snap = getGa4Snapshot()

  if (!snap) {
    return [
      `📄 <b>PAGES  —  اليوم</b>`,
      divider(),
      ``,
      `⏳  <i>البيانات غير متوفرة بعد…</i>`,
    ].join('\n')
  }

  if (!snap.activePages.length) {
    return [
      `📄 <b>PAGES  —  اليوم</b>`,
      divider(),
      ``,
      `<i>لا توجد زيارات اليوم بعد.</i>`,
    ].join('\n')
  }

  const total = snap.activePages.reduce((s, p) => s + p.users, 0) || 1
  const lines = snap.activePages.map((p, i) => {
    const pct  = Math.round((p.users / total) * 100)
    const b    = bar(p.users / total, 6)
    const name = p.path === '/' ? '/ (الرئيسية)' : p.path
    return `<code>${String(i + 1).padStart(2)}.  ${pad(name.slice(0, 19), 19)}  ${String(p.users).padStart(3)}  ${b}  ${String(pct).padStart(3)}%</code>`
  })

  return [
    ``,
    `📄 <b>PAGES  —  اليوم</b>`,
    divider(),
    ``,
    `<code>  🟢 نشطون الآن: ${snap.realtimeActive}   👥 اليوم: ${snap.todayUsers}</code>`,
    ``,
    thinLine(),
    ...lines,
    thinLine(),
    ``,
    `<code>  🕐 منذ ${fmtAgo(snap.fetchedAt)}</code>`,
  ].join('\n')
}

// ── Feedback section builders ─────────────────────────────────────────────────

function buildMainMenuText(rows: FeedbackRow[]): string {
  const snap  = getGa4Snapshot()
  const total = rows.length
  const now   = Date.now()
  const h24   = rows.filter(r => now - r.created_at < 86_400_000).length
  const d7    = rows.filter(r => now - r.created_at < 7 * 86_400_000).length

  const counts = { suggestion: 0, bug: 0, feature: 0, general: 0 }
  for (const r of rows) {
    const k = r.type as keyof typeof counts
    if (k in counts) counts[k]++
  }

  const ga4Status = snap
    ? [
        `<code>┌─────────────────────────────┐</code>`,
        `<code>│  🟢 نشطون الآن    ${String(snap.realtimeActive).padStart(6)}      │</code>`,
        `<code>│  👥 زوار اليوم    ${String(snap.todayUsers).padStart(6)}      │</code>`,
        `<code>│  🆕 جدد اليوم     ${String(snap.newUsers).padStart(6)}      │</code>`,
        `<code>│  📋 جلسات اليوم   ${String(snap.todaySessions).padStart(6)}      │</code>`,
        `<code>└─────────────────────────────┘</code>`,
      ].join('\n')
    : `<code>  ⏳ GA4 — جاري الاتصال…</code>`

  const feedbackBreakdown = (['suggestion', 'bug', 'feature', 'general'] as const).map((type) => {
    const count = counts[type]
    const pct   = total > 0 ? Math.round((count / total) * 100) : 0
    const b     = bar(total > 0 ? count / total : 0, 6)
    return `<code>  ${TYPE_ICON[type]}  ${pad(TYPE_AR[type], 10)}  ${String(count).padStart(3)}  ${b}  ${String(pct).padStart(3)}%</code>`
  }).join('\n')

  return [
    ``,
    `🖥  <b>TOOLIFY  —  ADMIN DASHBOARD</b>`,
    divider(),
    ``,
    `<b>📡  Google Analytics 4</b>`,
    ga4Status,
    ``,
    `<b>📬  الفيدباك  —  ملخص</b>`,
    thinLine(),
    `<code>  📥 الإجمالي       ${String(total).padStart(5)} رسالة</code>`,
    `<code>  🕐 آخر 24 ساعة   ${String(h24).padStart(5)} رسالة</code>`,
    `<code>  📅 آخر 7 أيام    ${String(d7).padStart(5)} رسالة</code>`,
    ``,
    feedbackBreakdown,
    thinLine(),
    ``,
    `<i>اختر قسماً من الأزرار أدناه 👇</i>`,
  ].join('\n')
}

function buildLatestFeedback(rows: FeedbackRow[]): string {
  if (rows.length === 0) {
    return [
      `🔔 <b>LATEST MESSAGES</b>`,
      divider(),
      ``,
      `<i>لا توجد رسائل بعد.</i>`,
    ].join('\n')
  }

  const latest = rows.slice(0, 5)
  const lines: string[] = [
    ``,
    `🔔 <b>LATEST MESSAGES  —  آخر ${latest.length} رسائل</b>`,
    divider(),
  ]
  for (const r of latest) {
    const icon = TYPE_ICON[r.type] ?? '💬'
    const type = TYPE_AR[r.type]   ?? r.type
    const ago  = timeAgo(r.created_at)
    const msg  = r.message.length > 120 ? r.message.slice(0, 120) + '…' : r.message
    lines.push(``)
    lines.push(`${icon}  <b>${type}</b>   <code>${ago}</code>`)
    lines.push(`<i>${escHtml(msg)}</i>`)
    const meta: string[] = []
    if (r.country)     meta.push(`${flag(r.country)} ${r.country}`)
    if (r.device_type) meta.push(r.device_type === 'mobile' ? '📱' : '🖥️')
    if (r.page_name)   meta.push(`📄 ${r.page_name}`)
    if (meta.length)   lines.push(`<code>  ${meta.join('   ')}</code>`)
    lines.push(thinLine())
  }
  return lines.join('\n')
}

function buildFeedbackPage(rows: FeedbackRow[], page = 0, perPage = 4): { text: string; pages: number } {
  const total = rows.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  const slice = rows.slice(page * perPage, (page + 1) * perPage)

  if (slice.length === 0) return { text: `📭 لا توجد رسائل في هذه الصفحة.`, pages }

  const lines: string[] = [
    ``,
    `💬 <b>FEEDBACK  —  صفحة ${page + 1}/${pages}</b>  <code>(${total} إجمالي)</code>`,
    divider(),
  ]
  for (const r of slice) {
    const icon = TYPE_ICON[r.type] ?? '💬'
    const type = TYPE_AR[r.type]   ?? r.type
    const ago  = timeAgo(r.created_at)
    const msg  = r.message.length > 200 ? r.message.slice(0, 200) + '…' : r.message
    lines.push(``)
    lines.push(`${icon}  <b>${type}</b>   <code>${ago}</code>`)
    lines.push(escHtml(msg))
    if (r.email) lines.push(`📧  <code>${r.email}</code>`)
    const meta: string[] = []
    if (r.page_name)   meta.push(`📄 ${r.page_name}`)
    if (r.country)     meta.push(`${flag(r.country)} ${r.country}`)
    if (r.device_type) meta.push(r.device_type === 'mobile' ? '📱 mobile' : '🖥️ desktop')
    if (meta.length)   lines.push(`<code>  ${meta.join('   ')}</code>`)
    lines.push(thinLine())
  }
  return { text: lines.join('\n'), pages }
}

function buildStats(rows: FeedbackRow[]): string {
  const snap  = getGa4Snapshot()
  const total = rows.length

  const ga4Block = snap ? [
    ``,
    `<b>📡  Google Analytics 4  —  اليوم</b>`,
    thinLine(),
    `<code>  🟢 نشطون الآن:    ${String(snap.realtimeActive).padStart(6)}</code>`,
    `<code>  👥 زوار اليوم:    ${String(snap.todayUsers).padStart(6)}</code>`,
    `<code>  🆕 جدد اليوم:     ${String(snap.newUsers).padStart(6)}</code>`,
    `<code>  📋 جلسات اليوم:   ${String(snap.todaySessions).padStart(6)}</code>`,
    ``,
    `<b>🌍  أهم 5 دول اليوم</b>`,
    thinLine(),
    ...snap.topCountries.slice(0, 5).map((c, i) => {
      const pct = snap.todayUsers > 0 ? Math.round((c.users / snap.todayUsers) * 100) : 0
      const b   = bar(c.users / (snap.todayUsers || 1), 6)
      return `<code>  ${i + 1}.  ${flag(c.country)} ${pad(c.country, 15)}  ${String(c.users).padStart(3)}  ${b}  ${pct}%</code>`
    }),
  ] : []

  if (total === 0) {
    return [
      ``,
      `📈 <b>DETAILED STATS  —  إحصائيات</b>`,
      divider(),
      ...ga4Block,
      ``,
      `<i>لا توجد بيانات فيدباك بعد.</i>`,
    ].join('\n')
  }

  const pageCount:    Record<string, number> = {}
  const countryCount: Record<string, number> = {}
  const deviceCount:  Record<string, number> = {}
  for (const r of rows) {
    if (r.page_name)   pageCount[r.page_name]     = (pageCount[r.page_name]     ?? 0) + 1
    if (r.country)     countryCount[r.country]    = (countryCount[r.country]    ?? 0) + 1
    if (r.device_type) deviceCount[r.device_type] = (deviceCount[r.device_type] ?? 0) + 1
  }
  const topPages   = Object.entries(pageCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const topCountry = Object.entries(countryCount).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const withEmail  = rows.filter(r => r.email).length

  return [
    ``,
    `📈 <b>DETAILED STATS  —  إحصائيات</b>`,
    divider(),
    ...ga4Block,
    ``,
    `<b>📊  الفيدباك  —  ${total} رسالة</b>`,
    thinLine(),
    ``,
    `<b>📱  الأجهزة</b>`,
    ...Object.entries(deviceCount).sort((a, b) => b[1] - a[1]).map(([d, c]) =>
      `<code>  ${deviceIcon(d)} ${pad(d, 10)}  ${String(c).padStart(3)}  ${bar(c / total, 7)}</code>`
    ),
    ``,
    `<b>🌍  أكثر الدول (فيدباك)</b>`,
    ...topCountry.map(([c, n]) =>
      `<code>  ${flag(c)} ${pad(c, 14)}  ${String(n).padStart(3)}  ${bar(n / total, 6)}</code>`
    ),
    ``,
    `<b>📄  أكثر الصفحات (فيدباك)</b>`,
    ...topPages.map(([p, n]) =>
      `<code>  ${String(n).padStart(3)}×  ${escHtml(p.slice(0, 24))}</code>`
    ),
    ``,
    thinLine(),
    `<code>  📧 مع إيميل:   ${String(withEmail).padStart(4)} / ${total}</code>`,
  ].join('\n')
}

// ── Callback handler ──────────────────────────────────────────────────────────

async function handleCallback(cb: TgCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id
  const msgId  = cb.message?.message_id
  if (!chatId) return

  if (!isAuthenticated(chatId)) {
    await answerCb(cb.id, '🔒 انتهت جلستك — أرسل /start')
    return
  }

  // Renew session on every interaction so active users stay logged in
  renewSession(chatId)

  const data = cb.data ?? ''
  await answerCb(cb.id)

  if (data === 'menu') {
    const text = buildMainMenuText(dbGetFeedback(200))
    if (msgId) await editText(chatId, msgId, text, MAIN_MENU)
    else       await send(chatId, text, MAIN_MENU)
    return
  }

  if (data === 'ga4') {
    const text = buildGa4()
    if (msgId) await editText(chatId, msgId, text, GA4_KEYBOARD)
    else       await send(chatId, text, GA4_KEYBOARD)
    return
  }

  if (data === 'countries') {
    const text = buildCountries()
    if (msgId) await editText(chatId, msgId, text, COUNTRIES_KEYBOARD)
    else       await send(chatId, text, COUNTRIES_KEYBOARD)
    return
  }

  if (data === 'pages') {
    const text = buildPages()
    if (msgId) await editText(chatId, msgId, text, PAGES_KEYBOARD)
    else       await send(chatId, text, PAGES_KEYBOARD)
    return
  }

  if (data === 'stats') {
    const text = buildStats(dbGetFeedback(500))
    if (msgId) await editText(chatId, msgId, text, STATS_KEYBOARD)
    else       await send(chatId, text, STATS_KEYBOARD)
    return
  }

  if (data === 'latest') {
    const text = buildLatestFeedback(dbGetFeedback(200))
    if (msgId) await editText(chatId, msgId, text, LATEST_KEYBOARD)
    else       await send(chatId, text, LATEST_KEYBOARD)
    return
  }

  if (data.startsWith('feedback:')) {
    const page = parseInt(data.split(':')[1] ?? '0', 10) || 0
    const rows = dbGetFeedback(500)
    const { text, pages } = buildFeedbackPage(rows, page)
    const kb = feedbackNav(page, pages)
    if (msgId) await editText(chatId, msgId, text, kb)
    else       await send(chatId, text, kb)
    return
  }

  if (data === 'status') {
    const rem  = sessionRemainingMs(chatId)
    const text = rem <= 0
      ? `⏰ <b>انتهت الجلسة</b>\n\nأرسل /start للدخول مجدداً.`
      : [
          ``,
          `🔐 <b>SESSION STATUS</b>`,
          divider(),
          ``,
          `<code>  ✅ الجلسة نشطة</code>`,
          `<code>  ⏳ تنتهي بعد:  ${formatSession(rem)}</code>`,
          ``,
          `<i>الجلسة تتجدد تلقائياً مع كل تفاعل.</i>`,
        ].join('\n')
    if (msgId) await editText(chatId, msgId, text, BACK_MENU)
    else       await send(chatId, text, BACK_MENU)
    return
  }

  if (data === 'logout') {
    logout(chatId)
    const text = [
      ``,
      `🔒 <b>تم تسجيل الخروج</b>`,
      divider(),
      ``,
      `<i>أرسل /start للدخول مجدداً.</i>`,
    ].join('\n')
    if (msgId) await editText(chatId, msgId, text)
    await send(chatId, '🔒 تم قفل الجلسة.', REPLY_KB_REMOVE)
  }
}

// ── Reply keyboard button labels → canonical command mapping ──────────────────

const REPLY_BTN_MAP: Record<string, string> = {
  '🏠 الرئيسية':    '/dashboard',
  '📊 GA4':          '/ga4',
  '🌍 الدول':        '/countries',
  '📄 الصفحات':      '/pages',
  '📈 إحصائيات':    '/stats',
  '💬 الفيدباك':    '/feedback',
  '🔔 آخر الرسائل': '/latest',
  '🔧 الجلسة':      '/status',
  '👋 خروج':         '/logout',
}

// ── Command handler ───────────────────────────────────────────────────────────

async function handleCommand(chatId: number, text: string): Promise<void> {
  // Renew session on every authenticated command
  renewSession(chatId)

  // Normalize reply-keyboard button text → slash command
  const normalized = REPLY_BTN_MAP[text.trim()] ?? text.trim()
  const cmd = normalized.split(/\s+/)[0].toLowerCase()

  if (cmd === '/dashboard' || cmd === '/start') {
    await send(chatId, buildMainMenuText(dbGetFeedback(200)), MAIN_MENU)
    return
  }
  if (cmd === '/ga4') {
    await send(chatId, buildGa4(), GA4_KEYBOARD)
    return
  }
  if (cmd === '/countries') {
    await send(chatId, buildCountries(), COUNTRIES_KEYBOARD)
    return
  }
  if (cmd === '/pages') {
    await send(chatId, buildPages(), PAGES_KEYBOARD)
    return
  }
  if (cmd === '/stats') {
    await send(chatId, buildStats(dbGetFeedback(500)), STATS_KEYBOARD)
    return
  }
  if (cmd === '/feedback') {
    const rows = dbGetFeedback(500)
    const { text: t, pages } = buildFeedbackPage(rows, 0)
    await send(chatId, t, feedbackNav(0, pages))
    return
  }
  if (cmd === '/latest') {
    await send(chatId, buildLatestFeedback(dbGetFeedback(200)), LATEST_KEYBOARD)
    return
  }
  if (cmd === '/status') {
    const rem = sessionRemainingMs(chatId)
    const msg = rem <= 0
      ? `⏰ انتهت جلستك. أرسل /start للدخول مجدداً.`
      : [
          ``,
          `🔐 <b>SESSION STATUS</b>`,
          divider(),
          ``,
          `<code>  ✅ الجلسة نشطة</code>`,
          `<code>  ⏳ تنتهي بعد:  ${formatSession(rem)}</code>`,
          ``,
          `<i>الجلسة تتجدد تلقائياً مع كل تفاعل.</i>`,
        ].join('\n')
    await send(chatId, msg, BACK_MENU)
    return
  }
  if (cmd === '/logout') {
    logout(chatId)
    await send(chatId, [
      ``,
      `🔒 <b>تم تسجيل الخروج</b>`,
      divider(),
      ``,
      `<i>أرسل /start للدخول مجدداً.</i>`,
    ].join('\n'), REPLY_KB_REMOVE)
    return
  }
  if (cmd === '/help') {
    await send(chatId, [
      ``,
      `🤖 <b>TOOLIFY ADMIN  —  المساعدة</b>`,
      divider(),
      ``,
      `<i>الأزرار في أسفل الشاشة للتنقل السريع 👇</i>`,
      ``,
      `<b>الأوامر المتاحة:</b>`,
      thinLine(),
      `<code>  /ga4        Google Analytics Live</code>`,
      `<code>  /countries  أكثر الدول زيارةً</code>`,
      `<code>  /pages      أكثر الصفحات زيارةً</code>`,
      `<code>  /stats      إحصائيات تفصيلية</code>`,
      `<code>  /feedback   قائمة الفيدباك</code>`,
      `<code>  /latest     آخر الرسائل</code>`,
      `<code>  /status     حالة الجلسة</code>`,
      `<code>  /logout     تسجيل الخروج</code>`,
    ].join('\n'), BACK_MENU)
    return
  }

  // Unknown — show main menu
  await send(chatId, buildMainMenuText(dbGetFeedback(200)), MAIN_MENU)
}

// ── Login prompt helper ───────────────────────────────────────────────────────

function loginStartPrompt(): string {
  const keyOnly = isKeyOnlyMode()
  return [
    ``,
    `🔐 <b>TOOLIFY ADMIN  —  تسجيل الدخول</b>`,
    divider(),
    ``,
    keyOnly
      ? `أدخل <b>كلمة المرور</b>:`
      : `أدخل <b>الاسم الثلاثي</b> للمطور:`,
  ].join('\n')
}

// ── Allowlist — only respond to known admin chat IDs ─────────────────────────
// Parsed once and cached; env var is a comma-separated list of numeric IDs.
// When the list is empty the check is skipped (fail-open during initial setup).

function getAllowedIds(): Set<number> {
  const raw = process.env.TELEGRAM_ADMIN_IDS ?? ''
  const ids  = raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0)
  return new Set(ids)
}

function isAllowed(chatId: number): boolean {
  const ids = getAllowedIds()
  return ids.size === 0 || ids.has(chatId)
}

// ── Main entry ────────────────────────────────────────────────────────────────

export async function handleUpdate(update: TgUpdate): Promise<void> {
  if (update.callback_query) {
    // Silently drop callbacks from non-admin accounts
    if (!isAllowed(update.callback_query.from.id)) return
    await handleCallback(update.callback_query)
    return
  }

  const message = update.message
  if (!message?.text) return

  const chatId = message.chat.id

  // Silently drop messages from non-admin accounts — do NOT reveal bot existence
  if (!isAllowed(chatId)) return

  const text = message.text.trim()

  if (isAuthenticated(chatId)) {
    await handleCommand(chatId, text)
    return
  }

  if (text.toLowerCase() === '/start') {
    startLogin(chatId)
    await send(chatId, loginStartPrompt())
    return
  }

  const loginState = getLoginState(chatId)

  if (loginState === 'idle') {
    await send(chatId, [
      ``,
      `🔒 <b>هذا البوت مقيّد.</b>`,
      ``,
      `أرسل /start للبدء.`,
    ].join('\n'))
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
        ``,
        `✅ <b>تم الدخول بنجاح</b>`,
        divider(),
        ``,
        `<code>  🔐 جلستك نشطة لمدة ساعة كاملة</code>`,
        `<code>  🔄 تتجدد تلقائياً مع كل تفاعل</code>`,
        ``,
        `<i>الأزرار ظاهرة في أسفل الشاشة 👇</i>`,
      ].join('\n'), REPLY_KB)
      await new Promise(r => setTimeout(r, 600))
      await send(chatId, buildMainMenuText(dbGetFeedback(200)), MAIN_MENU)
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
