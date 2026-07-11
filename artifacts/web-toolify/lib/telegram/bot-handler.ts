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

// Auth system disabled — bot is always open
import { dbGetFeedback, type FeedbackRow } from './db'
import { getGa4Snapshot } from './ga4-monitor'
import { getDomainMetrics } from './dr-service'
import { checkRank } from './rank-checker'
import { analyzeSeo } from './seo-analyzer'
import { analyzeCompetitors, type CompetitorAnalysis } from './seo-compare'
import {
  suggestTitle, suggestMeta, suggestKeywords,
  formatTitleSuggestion, formatMetaSuggestion, formatKeywordSuggestion,
} from './seo-suggestions'

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
    [{ text: '🔍 DR Checker' }, { text: '📈 ترتيب الكلمة' }],
    [{ text: '📊 تقييم SEO' }],
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

/** Send a message and return its message_id (needed for later edits). */
async function sendGetId(chatId: number, text: string, keyboard?: AnyMarkup): Promise<number | null> {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }
  if (keyboard) body.reply_markup = keyboard
  const res = await tgPost('sendMessage', body) as { result?: { message_id?: number } } | null
  return (res as any)?.result?.message_id ?? null
}

async function editText(chatId: number, msgId: number, text: string, keyboard?: IKMarkup): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML', disable_web_page_preview: true }
  if (keyboard) body.reply_markup = keyboard
  await tgPost('editMessageText', body)
}

async function answerCb(callbackId: string, text?: string): Promise<void> {
  await tgPost('answerCallbackQuery', { callback_query_id: callbackId, text: text ?? '' })
}

/** Send a message with ForceReply so the next user message is auto-routed. */
async function sendPrompt(chatId: number, text: string, placeholder: string): Promise<void> {
  await tgPost('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true,
    reply_markup: { force_reply: true, input_field_placeholder: placeholder, selective: true },
  })
}

// ── Pending-input state (force-reply routing) ─────────────────────────────────
// When a button triggers a force-reply prompt, we store chatId → command here.
// The next non-command message from that user is forwarded to that command.

const pendingInput = new Map<number, 'dr' | 'rank' | 'seo'>()

// ── SEO analysis sessions (for suggestion buttons) ────────────────────────────

import type { SeoResult } from './seo-analyzer'

interface SeoSession {
  url:      string
  keyword?: string
  analysis: SeoResult
  comp:     CompetitorAnalysis
  expires:  number
}

const seoSessions = new Map<string, SeoSession>()

function mkSeoKey(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

function cleanSeoSessions(): void {
  const now = Date.now()
  for (const [k, v] of seoSessions) if (v.expires < now) seoSessions.delete(k)
}

function seoSuggestionKb(key: string): IKMarkup {
  return {
    inline_keyboard: [
      [
        { text: '📝 اقترح عنوان',  callback_data: `seo_title:${key}` },
        { text: '📄 اقترح وصف',    callback_data: `seo_meta:${key}`  },
      ],
      [
        { text: '🔑 كلمات مقترحة', callback_data: `seo_kw:${key}` },
      ],
      [{ text: '🏠 القائمة الرئيسية', callback_data: 'menu' }],
    ],
  }
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
    [
      { text: '🔍 Domain Rating Checker', callback_data: 'dr_help' },
      { text: '📈 ترتيب الكلمة',          callback_data: 'rank_help' },
    ],
    [
      { text: '📊 تقييم SEO للمقال',       callback_data: 'seo_help' },
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
    const text = [
      ``,
      `🔐 <b>SESSION STATUS</b>`,
      divider(),
      ``,
      `<code>  ✅ البوت مفتوح دائماً</code>`,
      `<code>  🔓 لا يوجد نظام جلسات</code>`,
    ].join('\n')
    if (msgId) await editText(chatId, msgId, text, BACK_MENU)
    else       await send(chatId, text, BACK_MENU)
    return
  }

  if (data === 'logout') {
    const text = buildMainMenuText(dbGetFeedback(200))
    if (msgId) await editText(chatId, msgId, text, MAIN_MENU)
    else       await send(chatId, text, MAIN_MENU)
    return
  }

  if (data === 'dr_help') {
    pendingInput.set(chatId, 'dr')
    if (msgId) await editText(chatId, msgId, [
      `🔍 <b>Domain Rating Checker</b>`,
      divider(),
      `اكتب اسم الدومين مباشرةً 👇`,
      `<i>مثال:  toolifypdf.online</i>`,
    ].join('\n'), BACK_MENU)
    await sendPrompt(chatId, `🔍 أرسل الدومين:`, 'toolifypdf.online')
    return
  }

  if (data === 'rank_help') {
    pendingInput.set(chatId, 'rank')
    if (msgId) await editText(chatId, msgId, [
      `📈 <b>Rank Checker</b>`,
      divider(),
      `اكتب: <code>دومين.com كلمة مفتاحية</code> 👇`,
      `<i>مثال:  toolifypdf.online free pdf tools</i>`,
    ].join('\n'), BACK_MENU)
    await sendPrompt(chatId, `📈 أرسل الدومين والكلمة المفتاحية:`, 'toolifypdf.online free pdf tools')
    return
  }

  if (data === 'seo_help') {
    pendingInput.set(chatId, 'seo')
    if (msgId) await editText(chatId, msgId, [
      `📊 <b>SEO Analyzer</b>`,
      divider(),
      `اكتب: <code>رابط-المقال [كلمة مفتاحية]</code> 👇`,
      `<i>مثال:  example.com/article free pdf tools</i>`,
    ].join('\n'), BACK_MENU)
    await sendPrompt(chatId, `📊 أرسل رابط المقال (ويمكن إضافة الكلمة المفتاحية بعده):`, 'example.com/article keyword')
    return
  }

  // ── SEO suggestion callbacks ───────────────────────────────────────────────
  if (data.startsWith('seo_title:') || data.startsWith('seo_meta:') || data.startsWith('seo_kw:')) {
    const [type, key] = data.split(':') as [string, string]
    cleanSeoSessions()
    const session = seoSessions.get(key)
    if (!session) {
      if (msgId) await editText(chatId, msgId,
        `⚠️ انتهت صلاحية الجلسة. أعد تشغيل /seo للحصول على نتائج جديدة.`, BACK_MENU)
      return
    }
    const { analysis: r, comp, keyword } = session
    const plainText = r.title + ' ' + r.metaDesc  // used for keyword check

    let text = ''
    if (type === 'seo_title') {
      const s = suggestTitle(r.title, keyword ?? '', comp)
      text = formatTitleSuggestion(s, r.title)
    } else if (type === 'seo_meta') {
      const s = suggestMeta(r.metaDesc, keyword ?? '', r.wordCount, comp)
      text = formatMetaSuggestion(s, r.metaDesc)
    } else {
      const s = suggestKeywords(keyword ?? '', plainText, comp)
      text = formatKeywordSuggestion(s)
    }

    if (msgId) await editText(chatId, msgId, text, seoSuggestionKb(key)).catch(() =>
      send(chatId, text, seoSuggestionKb(key)))
    else await send(chatId, text, seoSuggestionKb(key))
    return
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
  '🔍 DR Checker':    '/dr',
  '📈 ترتيب الكلمة': '/rank',
  '📊 تقييم SEO':   '/seo',
  '👋 خروج':          '/logout',
}

// ── Command handler ───────────────────────────────────────────────────────────

async function handleCommand(chatId: number, text: string): Promise<void> {
  // ── Pending force-reply routing ────────────────────────────────────────────
  // If user is replying to a force-reply prompt, route their input directly.
  const pending = pendingInput.get(chatId)
  if (pending && !text.trim().startsWith('/')) {
    pendingInput.delete(chatId)
    return handleCommand(chatId, `/${pending} ${text.trim()}`)
  }

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
    await send(chatId, [
      ``,
      `🔐 <b>SESSION STATUS</b>`,
      divider(),
      ``,
      `<code>  ✅ البوت مفتوح دائماً</code>`,
      `<code>  🔓 لا يوجد نظام جلسات</code>`,
    ].join('\n'), BACK_MENU)
    return
  }
  if (cmd === '/logout') {
    // No session system — just show the main menu
    await send(chatId, buildMainMenuText(dbGetFeedback(200)), MAIN_MENU)
    return
  }
  if (cmd === '/dr') {
    // ── /dr <domain> — Ahrefs Domain Rating lookup ───────────────────────────
    const arg = normalized.slice(cmd.length).trim()
    if (!arg) {
      pendingInput.set(chatId, 'dr')
      await sendPrompt(chatId, `🔍 <b>DR Checker</b>\n\nأرسل اسم الدومين:`, 'toolifypdf.online')
      return
    }

    // Show a "checking…" message immediately so the user knows we're working
    await send(chatId, `⏳ جاري الاستعلام عن <code>${escHtml(arg)}</code>…`)

    const result = await getDomainMetrics(arg)

    if (!result.ok) {
      const errMsgs: Record<string, string> = {
        invalid_domain: `❌ <b>Invalid domain.</b>\n\nPlease enter a valid domain name.\n\n<b>Example:</b>  <code>/dr google.com</code>`,
        not_found:      `❌ <b>Not found.</b>\n\nThis domain was not found in the Ahrefs index.`,
        blocked:        `⚠️ <b>Request blocked.</b>\n\nThe API is behind Cloudflare and blocked this server's IP.\n\n<i>This works normally on the production server.</i>`,
        api_error:      `❌ <b>API error.</b>\n\nUnable to retrieve data at the moment. Please try again later.`,
      }
      await send(chatId, [
        ``,
        `📊 <b>DOMAIN RATING CHECKER</b>`,
        divider(),
        ``,
        errMsgs[result.error] ?? `❌ Unknown error.`,
      ].join('\n'), BACK_MENU)
      return
    }

    const { domain, domainRating, fetchedAt, full, hasFull } = result.data
    const fetchedTime = new Date(fetchedAt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    }) + ' UTC'

    // DR score bar and tier label
    const drScore = Math.max(0, Math.min(100, domainRating))
    const drBar   = bar(drScore / 100, 10)
    const drTier  =
      drScore >= 70 ? '🟢 High' :
      drScore >= 40 ? '🟡 Medium' :
      drScore >= 10 ? '🟠 Low' :
                      '🔴 Very Low'

    // Helper: format large numbers with K/M suffix
    function fmtNum(n: number | null): string {
      if (n === null) return '—'
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
      return String(n)
    }

    // ── Build message ─────────────────────────────────────────────────────────
    const lines: string[] = [
      ``,
      `📊 <b>DOMAIN RATING CHECKER</b>`,
      divider(),
      ``,
      `🌐 <b>Domain:</b>  <code>${escHtml(domain)}</code>`,
      ``,
      // DR score block — always shown
      `<code>┌──────────────────────────────┐</code>`,
      `<code>│  📈 DR Score   ${String(drScore).padStart(3)} / 100       │</code>`,
      `<code>│  ${drBar}  ${drTier.padEnd(11)}│</code>`,
      `<code>└──────────────────────────────┘</code>`,
    ]

    // Full metrics block — only when site-explorer call succeeded
    if (hasFull && full) {
      const arRankStr = full.ahrefsRank !== null ? `#${full.ahrefsRank.toLocaleString()}` : '—'

      lines.push(
        ``,
        `<b>🔗  Backlinks</b>`,
        thinLine(),
        `<code>  🔗 Total Backlinks    ${fmtNum(full.backlinks).padStart(8)}</code>`,
        `<code>  ✅ Dofollow           ${fmtNum(full.dofollowLinks).padStart(8)}</code>`,
        `<code>  🚫 Nofollow           ${fmtNum(full.nofollowLinks).padStart(8)}</code>`,
        ``,
        `<b>🌍  Referring Domains</b>`,
        thinLine(),
        `<code>  🌍 Total Ref Domains  ${fmtNum(full.refdomains).padStart(8)}</code>`,
        `<code>  ✅ Dofollow Domains   ${fmtNum(full.dofollowDomains).padStart(8)}</code>`,
        `<code>  🔗 Linked Out (RD)   ${fmtNum(full.linkedDomains).padStart(8)}</code>`,
        ``,
        `<b>🔍  Organic Search</b>`,
        thinLine(),
        `<code>  🔑 Keywords           ${fmtNum(full.orgKeywords).padStart(8)}</code>`,
        `<code>  👥 Est. Traffic/mo    ${fmtNum(full.orgTraffic).padStart(8)}</code>`,
        `<code>  💵 Traffic Value      ${fmtNum(full.orgCost).padStart(7)}</code>`,
        ``,
        `<b>📊  Ahrefs Rank</b>`,
        thinLine(),
        `<code>  🏆 AR                 ${arRankStr.padStart(8)}</code>`,
      )
    } else if (hasFull === false && process.env.AHREFS_API_KEY) {
      // Key is set but paid call failed — show a note
      lines.push(``, `<i>⚠️ Full metrics unavailable (API error). DR only shown.</i>`)
    }

    lines.push(
      ``,
      divider(),
      `<code>  🕒 ${fetchedTime}</code>`,
      hasFull ? `<code>  📡 Source: Ahrefs (DR + Site Explorer)</code>` : `<code>  📡 Source: Ahrefs (free tier — DR only)</code>`,
    )

    await send(chatId, lines.filter(l => l !== undefined).join('\n'), BACK_MENU)
    return
  }

  if (cmd === '/seo') {
    const arg   = normalized.slice(cmd.length).trim()
    const parts = arg.split(/\s+/)

    if (!arg || !parts[0]) {
      pendingInput.set(chatId, 'seo')
      await sendPrompt(chatId,
        `📊 <b>SEO Analyzer</b>\n\nأرسل رابط المقال (ويمكن إضافة الكلمة المفتاحية بعده):`,
        'example.com/article keyword here')
      return
    }

    const url     = parts[0]
    const keyword = parts.length > 1 ? parts.slice(1).join(' ') : undefined
    const ownDomain = (() => { try { const u = url.startsWith('http') ? url : 'https://' + url; return new URL(u).hostname.replace(/^www\./, '') } catch { return url } })()

    // Send static waiting message
    const msgId = await sendGetId(chatId, [
      `⏳ <b>SEO ANALYZER  —  جاري التحليل</b>`,
      divider(),
      `🔗 <code>${escHtml(url)}</code>`,
      keyword ? `🎯 <b>الكلمة:</b> <code>${escHtml(keyword)}</code>` : ``,
      keyword ? `<i>+ جاري تحليل المنافسين على Google…</i>` : `<i>جاري تحميل الصفحة…</i>`,
    ].filter(Boolean).join('\n'))

    // Run page analysis + competitor analysis in parallel
    const [r, comp] = await Promise.all([
      analyzeSeo(url, keyword),
      keyword ? analyzeCompetitors(keyword, ownDomain, 5) : Promise.resolve({ pages: [], avgTitleLen: 55, avgMetaLen: 150, avgWordCount: 1200, kwInTitle: 0, kwAtTitleStart: 0, kwInMeta: 0, topWords: [], topPhrases: [], titleExamples: [], metaExamples: [] } as CompetitorAnalysis),
    ])

    let text: string
    let kb: IKMarkup = BACK_MENU

    if (!r.ok) {
      text = [
        `📊 <b>SEO ANALYZER  —  خطأ</b>`,
        divider(),
        `❌ <b>${escHtml(r.error ?? 'فشل التحليل')}</b>`,
        `🔗 <code>${escHtml(url)}</code>`,
      ].join('\n')
    } else {
      // Store session for suggestion buttons
      cleanSeoSessions()
      const sessionKey = mkSeoKey()
      seoSessions.set(sessionKey, { url, keyword, analysis: r, comp, expires: Date.now() + 30 * 60_000 })

      const pct        = r.total
      const scoreBar   = bar(pct / 100, 14)
      const gradeEmoji = pct >= 80 ? '🏆' : pct >= 60 ? '📊' : pct >= 40 ? '⚠️' : '❌'

      const fRows = r.factors.map(f => {
        const label = f.label.slice(0, 18).padEnd(18)
        const sc    = `${f.score}/${f.max}`.padEnd(6)
        return `  ${f.icon} <code>${label} ${sc}</code> <i>${f.note}</i>`
      })

      const sRows = r.suggestions.length
        ? r.suggestions.map((s, i) => `  <b>${i + 1}.</b> ${escHtml(s)}`)
        : [`  ✅ المقال ممتاز — لا مقترحات رئيسية`]

      // Competitor comparison block (when keyword + competitor data available)
      const compBlock: string[] = []
      if (keyword && comp.pages.length > 0) {
        compBlock.push(
          ``,
          `🔍 <b>مقارنة مع المنافسين (أول ${comp.pages.length} نتائج):</b>`,
          thinLine(),
          `<code>  📄 متوسط الكلمات:   ${comp.avgWordCount}  (مقالك: ${r.wordCount})</code>`,
          `<code>  📝 متوسط العنوان:   ${comp.avgTitleLen} حرف  (مقالك: ${r.title.length})</code>`,
          `<code>  📋 متوسط الوصف:     ${comp.avgMetaLen} حرف  (مقالك: ${r.metaDesc.length})</code>`,
          `<code>  🎯 الكلمة في العنوان: ${comp.kwInTitle}/${comp.pages.length} منافس</code>`,
        )
        if (comp.topWords.length > 0) {
          compBlock.push(``, `<b>🔑 كلمات شائعة عند المنافسين:</b>  <code>${comp.topWords.slice(0,6).join(' · ')}</code>`)
        }
      }

      text = [
        `📊 <b>SEO REPORT  —  ${escHtml(r.domain)}</b>`,
        divider(),
        ``,
        `${gradeEmoji} <b>التقييم الكلي:  ${pct} / 100</b>  (${r.grade})`,
        `<code>${scoreBar}</code>`,
        keyword ? `🎯 <b>الكلمة:</b>  <code>${escHtml(keyword)}</code>` : ``,
        ``,
        `📋 <b>التفاصيل:</b>`,
        thinLine(),
        ...fRows,
        ...compBlock,
        ``,
        `💡 <b>مقترحات التحسين:</b>`,
        thinLine(),
        ...sRows,
        ``,
        divider(),
        `<code>  📄 ${r.wordCount} كلمة  |  H1:${r.h1} H2:${r.h2} H3:${r.h3}  |  🔗${r.internalLinks}</code>`,
      ].filter(l => l !== '').join('\n')

      // Show suggestion buttons only when keyword is provided (competitor data exists)
      kb = keyword ? seoSuggestionKb(sessionKey) : BACK_MENU
    }

    if (msgId) {
      await editText(chatId, msgId, text, kb).catch(() => send(chatId, text, kb))
    } else {
      await send(chatId, text, kb)
    }
    return
  }

  if (cmd === '/rank') {
    const arg   = normalized.slice(cmd.length).trim()
    const parts = arg.split(/\s+/)

    if (parts.length < 2) {
      pendingInput.set(chatId, 'rank')
      await sendPrompt(chatId,
        `📈 <b>Rank Checker</b>\n\nأرسل الدومين والكلمة المفتاحية:`,
        'toolifypdf.online free pdf tools')
      return
    }

    const domain  = parts[0]
    const keyword = parts.slice(1).join(' ')

    // ── Send static waiting message ──────────────────────────────────────────
    const progressMsgId = await sendGetId(chatId, [
      `⏳ <b>RANK CHECKER  —  جاري البحث</b>`,
      divider(),
      ``,
      `🎯 <b>الكلمة:</b>  <code>${escHtml(keyword)}</code>`,
      `🌐 <b>الموقع:</b>  <code>${escHtml(domain)}</code>`,
      ``,
      `<i>⏱ قد يستغرق البحث عدة دقائق…</i>`,
    ].join('\n'))

    const result = await checkRank({
      keyword,
      domain,
      maxPages: 100,
      lang:     'ar',
      country:  'sa',
    })

    // ── Build result card ────────────────────────────────────────────────────
    let resultText: string

    if (result.blocked) {
      resultText = [
        `🚫 <b>RANK CHECKER  —  محظور مؤقتاً</b>`,
        divider(),
        ``,
        `⚠️ <b>Google أوقف الطلبات مؤقتاً عند الصفحة ${result.blockedAtPage}</b>`,
        ``,
        `🎯 <code>${escHtml(keyword)}</code>`,
        `🌐 <code>${escHtml(domain)}</code>`,
        ``,
        `<code>  🔍 فُحص ${result.resultsSearched} نتيجة قبل الحظر</code>`,
        ``,
        thinLine(),
        `<i>حاول مرة أخرى بعد 15-20 دقيقة.</i>`,
      ].join('\n')
    } else if (result.found) {
      const r    = result.rank!
      const tier =
        r <= 3   ? '🏆 أول 3 نتائج!'   :
        r <= 10  ? '🥇 الصفحة الأولى'  :
        r <= 20  ? '🥈 الصفحة الثانية' :
        r <= 30  ? '🥉 الصفحة الثالثة' :
        r <= 100 ? '📊 أول 100 نتيجة'  :
        r <= 300 ? '📈 أول 300 نتيجة'  :
                   '📉 ترتيب متأخر'
      const scoreBar = bar(Math.max(0, (1000 - r) / 1000), 13)
      const urlShort = result.url!.length > 55
        ? result.url!.slice(0, 55) + '…'
        : result.url!
      resultText = [
        `📊 <b>RANK CHECKER  —  النتيجة</b>`,
        divider(),
        ``,
        `✅ <b>تم العثور على موقعك!</b>`,
        ``,
        `<code>┌───────────────────────────────┐</code>`,
        `<code>│  🎯 ${pad(escHtml(keyword).slice(0, 25), 26)}│</code>`,
        `<code>│  🌐 ${pad(escHtml(domain).slice(0, 25), 26)}│</code>`,
        `<code>│                               │</code>`,
        `<code>│  📊 الترتيب  #${String(r).padEnd(16)}│</code>`,
        `<code>│  ${scoreBar}  ${String(Math.round(Math.max(0,(1000-r)/10))).padStart(3)}%  │</code>`,
        `<code>│  ${tier.slice(0, 28).padEnd(29)}│</code>`,
        `<code>└───────────────────────────────┘</code>`,
        ``,
        `🔗 <b>الرابط:</b>`,
        `<code>${escHtml(urlShort)}</code>`,
        ``,
        thinLine(),
        `<code>  🔍 فُحص ${result.resultsSearched} نتيجة / ${result.pagesSearched} صفحة</code>`,
      ].join('\n')
    } else if (result.noMoreResults) {
      resultText = [
        `📊 <b>RANK CHECKER  —  النتيجة</b>`,
        divider(),
        ``,
        `❌ <b>الموقع غير مرتب لهذه الكلمة المفتاحية</b>`,
        ``,
        `🎯 <code>${escHtml(keyword)}</code>`,
        `🌐 <code>${escHtml(domain)}</code>`,
        ``,
        `<code>  🔍 فُحص ${result.resultsSearched} نتيجة (جميع ما وجده Google)</code>`,
        ``,
        thinLine(),
        `<i>الموقع غير موجود ضمن نتائج Google لهذه الكلمة.</i>`,
      ].join('\n')
    } else {
      resultText = [
        `📊 <b>RANK CHECKER  —  النتيجة</b>`,
        divider(),
        ``,
        `📉 <b>الموقع خارج أول 1000 نتيجة</b>`,
        ``,
        `🎯 <code>${escHtml(keyword)}</code>`,
        `🌐 <code>${escHtml(domain)}</code>`,
        ``,
        `<code>  🔍 فُحص ${result.resultsSearched} نتيجة / ${result.pagesSearched} صفحة</code>`,
        ``,
        thinLine(),
        `<i>Google لا يُظهر أكثر من 1000 نتيجة لأي بحث.</i>`,
        `<i>الموقع غير مرتب في أول 1000 نتيجة لهذه الكلمة.</i>`,
      ].join('\n')
    }

    if (progressMsgId) {
      await editText(chatId, progressMsgId, resultText, BACK_MENU).catch(() =>
        send(chatId, resultText, BACK_MENU),
      )
    } else {
      await send(chatId, resultText, BACK_MENU)
    }
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
      ``,
      `<b>🔍 SEO Tools:</b>`,
      thinLine(),
      `<code>  /dr   &lt;domain&gt;              Domain Rating</code>`,
      `<code>  /rank &lt;domain&gt; &lt;keyword&gt;  ترتيب الكلمة</code>`,
      `<code>  /seo  &lt;url&gt; [keyword]     تقييم مقال SEO</code>`,
      ``,
      `<b>أمثلة:</b>`,
      `<code>  /dr toolifypdf.online</code>`,
      `<code>  /rank toolifypdf.online أدوات PDF مجانية</code>`,
      `<code>  /seo toolifypdf.online/blog/pdf أدوات PDF</code>`,
    ].join('\n'), BACK_MENU)
    return
  }

  // Unknown — show main menu
  await send(chatId, buildMainMenuText(dbGetFeedback(200)), MAIN_MENU)
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
    if (!isAllowed(update.callback_query.from.id)) return
    await handleCallback(update.callback_query)
    return
  }

  const message = update.message
  if (!message?.text) return

  const chatId = message.chat.id
  if (!isAllowed(chatId)) return

  await handleCommand(chatId, message.text.trim())
}
