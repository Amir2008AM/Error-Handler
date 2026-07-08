/**
 * GA4 Monitor — Background Service
 *
 * Polls Google Analytics every 2 minutes.
 * Sends a Telegram alert for EVERY new user detected.
 *
 * Alert types:
 *   new_user     — every time todayUsers count increases (cooldown 60 s)
 *   first_user   — site went from 0 → ≥ 1 active (cooldown 4 h)
 *   spike        — sudden ≥ 50% jump AND ≥ 3 extra users (cooldown 10 min)
 *   milestone    — hits 5 / 10 / 25 / 50 / 100 total today (once per day each)
 *   tool_active  — important tool has active visitor (cooldown 5 min per tool)
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'

// ── Env ───────────────────────────────────────────────────────────────────────

const env = {
  propertyId: () => (process.env.GA_PROPERTY_ID ?? '').replace(/^properties\//i, '').trim(),
  saKey:      () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '',
  botToken:   () => process.env.TELEGRAM_BOT_TOKEN ?? '',
  chatId:     () => process.env.TELEGRAM_CHAT_ID ?? '',
}

function isConfigured(): boolean {
  return !!(env.propertyId() && env.saKey() && env.botToken() && env.chatId())
}

// ── GA4 client (globalThis singleton — HMR safe) ──────────────────────────────

declare global { var __ga4client: BetaAnalyticsDataClient | undefined }

function getClient(): BetaAnalyticsDataClient {
  if (!globalThis.__ga4client) {
    const raw = env.saKey()
    let creds: Record<string, unknown>
    try { creds = JSON.parse(raw) as Record<string, unknown> }
    catch { creds = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8')) as Record<string, unknown> }
    globalThis.__ga4client = new BetaAnalyticsDataClient({ credentials: creds })
  }
  return globalThis.__ga4client
}

function resetClient(): void { globalThis.__ga4client = undefined }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GA4RealtimeSnapshot {
  realtimeActive: number                            // truly live (runRealtimeReport)
  activeUsers:    number                            // today's active users
  todayUsers:     number                            // total users today
  todaySessions:  number                            // total sessions today
  newUsers:       number                            // new users today
  topPage:        string
  topPageUsers:   number
  country:        string
  device:         string
  browser:        string
  source:         string
  activeSources:  string[]
  activePages:    Array<{ path: string; users: number }>
  topCountries:   Array<{ country: string; users: number }>
  devices:        Array<{ device: string; users: number }>
  sources:        Array<{ source: string; users: number }>
  fetchedAt:      number
}

interface AlertState {
  lastFirstUser:     number
  lastSpike:         number
  lastNewUser:       number           // last "new user" alert timestamp
  lastKnownNewUsers: number           // snapshot of newUsers count at last poll
  milestonesHit:     Set<number>
  lastToolAlert:     Record<string, number>
  lastActiveCount:   number
  milestonesDate:    string
}

// ── GlobalThis state ──────────────────────────────────────────────────────────

const KEY_SNAP  = Symbol.for('toolify.ga4.snapshot')
const KEY_STATE = Symbol.for('toolify.ga4.alertstate')
const KEY_TIMER = Symbol.for('toolify.ga4.timer')

type G = typeof globalThis & Record<symbol, unknown>
const g = globalThis as G

function gs<T>(key: symbol, init: T): { value: T } {
  if ((g[key] as { value: T } | undefined) === undefined) g[key] = { value: init }
  return g[key] as { value: T }
}

const _snap  = gs<GA4RealtimeSnapshot | null>(KEY_SNAP, null)
const _state = gs<AlertState>(KEY_STATE, {
  lastFirstUser:     0,
  lastSpike:         0,
  lastNewUser:       0,
  lastKnownNewUsers: -1,
  milestonesHit:     new Set(),
  lastToolAlert:     {},
  lastActiveCount:   0,
  milestonesDate:    '',
})
const _timer = gs<{ id: ReturnType<typeof setInterval> | null }>(KEY_TIMER, { id: null })

export const getGa4Snapshot = (): GA4RealtimeSnapshot | null => _snap.value

// ── Constants ─────────────────────────────────────────────────────────────────

const IMPORTANT_TOOLS = [
  '/merge-pdf', '/compress-pdf', '/split-pdf', '/pdf-to-word',
  '/word-to-pdf', '/pdf-to-jpg', '/image-to-pdf', '/ppt-to-pdf',
]
const MILESTONES = [5, 10, 25, 50, 100, 250, 500]

// ── Country flags ─────────────────────────────────────────────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  'Saudi Arabia': '🇸🇦', 'United States': '🇺🇸', 'United Arab Emirates': '🇦🇪',
  'Egypt': '🇪🇬', 'Kuwait': '🇰🇼', 'Qatar': '🇶🇦', 'Bahrain': '🇧🇭',
  'Jordan': '🇯🇴', 'Iraq': '🇮🇶', 'Lebanon': '🇱🇧', 'Morocco': '🇲🇦',
  'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Libya': '🇱🇾', 'Sudan': '🇸🇩',
  'Yemen': '🇾🇪', 'Oman': '🇴🇲', 'Syria': '🇸🇾', 'Palestine': '🇵🇸',
  'United Kingdom': '🇬🇧', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Canada': '🇨🇦',
  'Australia': '🇦🇺', 'India': '🇮🇳', 'Pakistan': '🇵🇰', 'Turkey': '🇹🇷',
  'Indonesia': '🇮🇩', 'Malaysia': '🇲🇾', 'Netherlands': '🇳🇱',
  'Spain': '🇪🇸', 'Italy': '🇮🇹', 'Russia': '🇷🇺', 'Brazil': '🇧🇷',
  'China': '🇨🇳', 'Japan': '🇯🇵', 'South Korea': '🇰🇷', 'Nigeria': '🇳🇬',
  'South Africa': '🇿🇦', 'Kenya': '🇰🇪', 'Singapore': '🇸🇬',
}

function countryFlag(name: string): string {
  return COUNTRY_FLAGS[name] ?? '🌐'
}

// ── Source label helper ───────────────────────────────────────────────────────

export function labelSource(raw: string): string {
  const r = raw.toLowerCase()
  if (r === 'organic' || r === 'cpc') return 'Organic Search'
  if (r === '(none)' || r === 'none' || r === 'direct' || r === '') return 'Direct'
  if (['referral', 'email', 'affiliate'].includes(r)) return 'Referral'
  if (['social', 'facebook', 'instagram', 'twitter', 'tiktok', 'linkedin', 'youtube'].includes(r)) return 'Social'
  return raw || 'Direct'
}

// ── GA4 fetch ─────────────────────────────────────────────────────────────────

/** Progress callback: pct 0-100, human-readable stage label */
export type ProgressCb = (pct: number, label: string) => void

async function fetchSnapshot(onProgress?: ProgressCb): Promise<GA4RealtimeSnapshot> {
  const client   = getClient()
  const property = `properties/${env.propertyId()}`
  const now      = Date.now()

  // ── 1. Truly realtime active users (no dimensions = always works) ──────────
  onProgress?.(10, 'الاتصال بـ Google Analytics…')
  let realtimeActive = 0
  try {
    onProgress?.(25, 'جاري جلب البيانات الفورية…')
    const [rt] = await client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
    })
    realtimeActive = parseInt(rt.totals?.[0]?.metricValues?.[0]?.value ?? '0', 10)
    if (!realtimeActive && rt.rows?.length) {
      realtimeActive = rt.rows.reduce(
        (s, r) => s + parseInt(r.metricValues?.[0]?.value ?? '0', 10), 0
      )
    }
  } catch { /* fallback to today's data */ }

  // ── 2. Today's full breakdown (runReport always works) ────────────────────
  onProgress?.(55, 'جاري جلب بيانات اليوم…')
  const [main] = await client.runReport({
    property,
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    dimensions: [
      { name: 'pagePath' },
      { name: 'deviceCategory' },
      { name: 'country' },
      { name: 'sessionMedium' },
      { name: 'browser' },
    ],
    metrics: [
      { name: 'activeUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
    ],
    limit: 100,
  })

  // ── Aggregate ─────────────────────────────────────────────────────────────

  const pageMap:    Map<string, number> = new Map()
  const countryMap: Map<string, number> = new Map()
  const deviceMap:  Map<string, number> = new Map()
  const sourceMap:  Map<string, number> = new Map()
  const browserMap: Map<string, number> = new Map()
  let totalActive   = 0
  let totalNew      = 0
  let totalSessions = 0

  for (const row of main.rows ?? []) {
    const page    = row.dimensionValues?.[0]?.value ?? '/'
    const device  = row.dimensionValues?.[1]?.value ?? 'unknown'
    const country = row.dimensionValues?.[2]?.value ?? 'Unknown'
    const source  = row.dimensionValues?.[3]?.value ?? '(none)'
    const browser = row.dimensionValues?.[4]?.value ?? 'N/A'
    const active  = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const newU    = parseInt(row.metricValues?.[1]?.value ?? '0', 10)
    const sess    = parseInt(row.metricValues?.[2]?.value ?? '0', 10)

    pageMap.set(page,       (pageMap.get(page)        ?? 0) + active)
    countryMap.set(country, (countryMap.get(country)  ?? 0) + active)
    deviceMap.set(device,   (deviceMap.get(device)    ?? 0) + active)
    sourceMap.set(source,   (sourceMap.get(source)    ?? 0) + active)
    browserMap.set(browser, (browserMap.get(browser)  ?? 0) + active)
    totalActive   += active
    totalNew      += newU
    totalSessions += sess
  }

  const sortedPages     = [...pageMap.entries()].sort((a, b) => b[1] - a[1])
  const sortedCountries = [...countryMap.entries()].sort((a, b) => b[1] - a[1])
  const sortedDevices   = [...deviceMap.entries()].sort((a, b) => b[1] - a[1])
  const sortedSources   = [...sourceMap.entries()].sort((a, b) => b[1] - a[1])
  const topSource       = sortedSources[0]?.[0] ?? '(none)'
  const topCountry      = sortedCountries[0]?.[0] ?? 'N/A'
  const topDevice       = sortedDevices[0]?.[0] ?? 'N/A'
  const topBrowser      = [...browserMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

  onProgress?.(85, 'معالجة الإحصائيات…')

  // Deduplicate page-level count
  const uniqueActive = [...pageMap.values()].reduce((a, b) => a + b, 0)
  totalActive = uniqueActive || totalActive

  // Prefer realtime for "right now"; fallback to today's data
  if (!realtimeActive) realtimeActive = totalActive

  onProgress?.(100, 'اكتملت البيانات ✓')

  return {
    realtimeActive,
    activeUsers:   totalActive,
    todayUsers:    totalActive,
    todaySessions: totalSessions,
    newUsers:      totalNew,
    topPage:       sortedPages[0]?.[0] ?? '/',
    topPageUsers:  sortedPages[0]?.[1] ?? 0,
    country:       topCountry,
    device:        topDevice,
    browser:       topBrowser,
    source:        labelSource(topSource),
    activeSources: [...new Set(sortedSources.map(([s]) => labelSource(s)))].filter(Boolean),
    activePages:   sortedPages.slice(0, 7).map(([path, users]) => ({ path, users })),
    topCountries:  sortedCountries.slice(0, 8).map(([country, users]) => ({ country, users })),
    devices:       sortedDevices.map(([device, users]) => ({ device, users })),
    sources:       sortedSources.slice(0, 5).map(([source, users]) => ({ source: labelSource(source), users })),
    fetchedAt:     now,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }) + ' UTC'
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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Telegram send ─────────────────────────────────────────────────────────────

async function tgSend(html: string): Promise<void> {
  const token  = env.botToken()
  const chatId = env.chatId()
  if (!token || !chatId) return
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:                  chatId,
      text:                     html,
      parse_mode:               'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err: Error) => console.warn('[GA4Monitor] Telegram send failed:', err.message))
}

// ── Notification builder ──────────────────────────────────────────────────────

function buildNewUserAlert(snap: GA4RealtimeSnapshot, newCount: number, prevCount: number): string {
  const gained  = newCount - prevCount
  const flag    = countryFlag(snap.country)
  const devIco  = deviceIcon(snap.device)
  const srcIco  = sourceIcon(snap.source)
  const topPg   = snap.topPage === '/' ? 'الصفحة الرئيسية' : snap.topPage

  return [
    gained > 1
      ? `🆕 <b>${gained} مستخدمون جدد دخلوا ToolifyPDF!</b>`
      : `🆕 <b>مستخدم جديد دخل ToolifyPDF!</b>`,
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `🟢 <b>نشطون الآن:</b>       <b>${snap.realtimeActive}</b>`,
    `👥 <b>زوار اليوم:</b>       <b>${snap.todayUsers}</b>`,
    `🆕 <b>جدد اليوم:</b>        <b>${snap.newUsers}</b>`,
    `📋 <b>جلسات اليوم:</b>      <b>${snap.todaySessions}</b>`,
    ``,
    `${flag} <b>الدولة:</b>   ${snap.country}`,
    `${devIco} <b>الجهاز:</b>  ${snap.device}`,
    `🌐 <b>المتصفح:</b> ${snap.browser}`,
    `${srcIco} <b>المصدر:</b>  ${snap.source}`,
    ``,
    `📄 <b>الصفحة الأكثر نشاطاً:</b> <code>${topPg}</code>`,
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `🕐 ${fmtTime(snap.fetchedAt)}`,
  ].join('\n')
}

function buildGeneralAlert(snap: GA4RealtimeSnapshot, header: string): string {
  const flag   = countryFlag(snap.country)
  const devIco = deviceIcon(snap.device)
  const srcIco = sourceIcon(snap.source)

  const pagesBlock = snap.activePages.slice(0, 3)
    .map((p, i) => `  ${i + 1}. <code>${p.path}</code> — ${p.users} 👤`)
    .join('\n')

  return [
    header,
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `🟢 <b>نشطون الآن:</b>  <b>${snap.realtimeActive}</b>`,
    `👥 <b>زوار اليوم:</b>  <b>${snap.todayUsers}</b>`,
    `🆕 <b>جدد اليوم:</b>   <b>${snap.newUsers}</b>`,
    ``,
    `📄 <b>أكثر الصفحات:</b>`,
    pagesBlock || `  <code>${snap.topPage}</code>`,
    ``,
    `${flag} <b>الدولة:</b>   ${snap.country}`,
    `${devIco} <b>الجهاز:</b>  ${snap.device}`,
    `${srcIco} <b>المصدر:</b>  ${snap.source}`,
    ``,
    `<code>━━━━━━━━━━━━━━━━━━━━━━━━━━</code>`,
    `🕐 ${fmtTime(snap.fetchedAt)}`,
  ].join('\n')
}

// ── Smart alert engine ────────────────────────────────────────────────────────

async function checkAlerts(snap: GA4RealtimeSnapshot): Promise<void> {
  const st  = _state.value
  const now = Date.now()

  // Reset daily state at midnight
  if (st.milestonesDate !== todayStr()) {
    st.milestonesDate    = todayStr()
    st.milestonesHit     = new Set()
    st.lastKnownNewUsers = -1   // force baseline reset each day
  }

  const prevActive = st.lastActiveCount
  const currActive = snap.realtimeActive
  const currNew    = snap.newUsers

  // ── First baseline (first poll of the day or startup) ─────────────────────
  if (st.lastKnownNewUsers < 0) {
    st.lastKnownNewUsers = currNew
    st.lastActiveCount   = currActive
    console.log(`[GA4Monitor] Baseline set — new users today: ${currNew}, active: ${currActive}`)
    return
  }

  // ── Trigger A: NEW USER(S) detected ───────────────────────────────────────
  // Fires whenever GA4 reports more new users than last poll
  // Cooldown: 60 s (avoids burst if multiple polls catch same users)
  if (currNew > st.lastKnownNewUsers && now - st.lastNewUser > 60_000) {
    st.lastNewUser       = now
    const prev           = st.lastKnownNewUsers
    st.lastKnownNewUsers = currNew
    await tgSend(buildNewUserAlert(snap, currNew, prev))

    // After sending new-user alert, skip other alert types this cycle
    st.lastActiveCount = currActive
    return
  }

  // Keep lastKnownNewUsers in sync even if no alert fired
  st.lastKnownNewUsers = currNew

  // ── Trigger B: First visitor (site was idle, now has active users) ─────────
  if (currActive >= 1 && prevActive === 0 && now - st.lastFirstUser > 4 * 3_600_000) {
    st.lastFirstUser = now
    await tgSend(buildGeneralAlert(snap, `🟢 <b>ToolifyPDF — أول زائر اليوم!</b>`))
  }

  // ── Trigger C: Traffic spike (≥ 50% jump, ≥ 3 extra users) ───────────────
  else if (
    prevActive > 0 &&
    currActive - prevActive >= 3 &&
    (currActive - prevActive) / prevActive >= 0.5 &&
    now - st.lastSpike > 10 * 60_000
  ) {
    st.lastSpike = now
    await tgSend(buildGeneralAlert(snap,
      `📈 <b>قفزة في الزوار! +${currActive - prevActive} مستخدم</b> (${prevActive} ← ${currActive})`
    ))
  }

  // ── Trigger D: Today total user milestones ────────────────────────────────
  else {
    for (const m of MILESTONES) {
      if (snap.todayUsers >= m && (st.lastKnownNewUsers < m || !st.milestonesHit.has(m)) && !st.milestonesHit.has(m)) {
        if (snap.todayUsers >= m) {
          st.milestonesHit.add(m)
          await tgSend(buildGeneralAlert(snap, `🎯 <b>إنجاز: ${m} زائر اليوم!</b>`))
          break
        }
      }
    }
  }

  // ── Trigger E: Important tool active ──────────────────────────────────────
  for (const toolPath of IMPORTANT_TOOLS) {
    const page = snap.activePages.find(p => p.path === toolPath || p.path.startsWith(toolPath))
    if (page && page.users >= 1) {
      const last = st.lastToolAlert[toolPath] ?? 0
      if (now - last > 5 * 60_000) {
        st.lastToolAlert[toolPath] = now
        const name = toolPath.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        await tgSend(buildGeneralAlert(snap,
          `🛠 <b>${name}</b> — ${page.users} مستخدم نشط الآن`
        ))
      }
    }
  }

  st.lastActiveCount = currActive
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2 * 60_000   // 2 minutes — fast enough to catch new users

declare global { var __ga4monitorStarted: boolean | undefined }

/**
 * Fetch fresh GA4 data and update the cached snapshot.
 * Optionally accepts a progress callback for UI feedback.
 * Safe to call from bot-handler for "Refresh" button presses.
 */
export async function fetchFreshSnapshot(onProgress?: ProgressCb): Promise<GA4RealtimeSnapshot> {
  if (!isConfigured()) throw new Error('GA4 not configured')
  const snap = await fetchSnapshot(onProgress)
  _snap.value = snap
  return snap
}

async function runOnce(): Promise<void> {
  if (!isConfigured()) return
  try {
    const snap = await fetchSnapshot()
    _snap.value = snap
    await checkAlerts(snap)
    console.log(
      `[GA4Monitor] ✓ realtime:${snap.realtimeActive} today:${snap.todayUsers} new:${snap.newUsers} sessions:${snap.todaySessions} top:${snap.topPage}`
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('INVALID_ARGUMENT')) {
      console.warn(`[GA4Monitor] INVALID_ARGUMENT — check GA_PROPERTY_ID="${env.propertyId()}" and Service Account permissions`)
      resetClient()
    } else if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      console.warn(`[GA4Monitor] PERMISSION_DENIED — grant Service Account "Viewer" in GA4 Admin`)
      resetClient()
    } else if (!msg.includes('Could not load the default credentials')) {
      console.warn('[GA4Monitor] Poll failed:', msg.slice(0, 300))
    }
  }
}

/** Call once at server startup — guarded against HMR double-init */
export function startGa4Monitor(): void {
  if (globalThis.__ga4monitorStarted) return
  globalThis.__ga4monitorStarted = true

  if (!isConfigured()) {
    console.warn('[GA4Monitor] Skipped — missing env vars (GA_PROPERTY_ID / GOOGLE_SERVICE_ACCOUNT_KEY / TELEGRAM_CHAT_ID)')
    return
  }

  // Delay first run so other services boot first
  setTimeout(() => {
    void runOnce()
    const id = setInterval(() => void runOnce(), POLL_INTERVAL_MS)
    if (typeof id === 'object' && id !== null && 'unref' in id) id.unref()
    _timer.value.id = id
  }, 15_000)

  console.log('[GA4Monitor] Started — polling every 2 minutes ✓')
}
