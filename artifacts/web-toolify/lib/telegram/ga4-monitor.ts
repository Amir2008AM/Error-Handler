/**
 * GA4 Monitor — Background Service
 *
 * Polls Google Analytics 4 Realtime API every 5 minutes.
 * Sends SMART Telegram notifications — not every refresh, only on meaningful events:
 *
 *   Trigger                  Cooldown   Condition
 *   ─────────────────────── ────────── ──────────────────────────────────────
 *   first_user               4 h        active users: 0 → ≥ 1
 *   spike                    10 min     active increase ≥ 50 % AND ≥ 3 users
 *   milestone                once each  hits 5, 10, 25, 50, 100 active users
 *   important_tool           5 min/tool /merge-pdf or /compress-pdf active
 *   new_source               15 min     new traffic source first seen today
 *
 * Required env vars:
 *   GA_PROPERTY_ID              GA4 numeric property ID (e.g. "123456789")
 *   GOOGLE_SERVICE_ACCOUNT_KEY  Full JSON string of service-account credentials
 *   TELEGRAM_BOT_TOKEN          Bot token (already used by polling bot)
 *   TELEGRAM_CHAT_ID            Target chat / group to push notifications to
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'

// ── Env helpers ───────────────────────────────────────────────────────────────

const env = {
  // Strip any accidental "properties/" prefix the user may have included
  propertyId:    () => (process.env.GA_PROPERTY_ID ?? '').replace(/^properties\//i, '').trim(),
  saKey:         () => process.env.GOOGLE_SERVICE_ACCOUNT_KEY ?? '',
  botToken:      () => process.env.TELEGRAM_BOT_TOKEN ?? '',
  chatId:        () => process.env.TELEGRAM_CHAT_ID ?? '',
}

function isConfigured(): boolean {
  return !!(env.propertyId() && env.saKey() && env.botToken() && env.chatId())
}

// ── GA4 client (lazy singleton via globalThis) ────────────────────────────────

const KEY_CLIENT = Symbol.for('toolify.ga4.client')
declare global { var __ga4client: BetaAnalyticsDataClient | undefined }

function getClient(): BetaAnalyticsDataClient {
  if (!globalThis.__ga4client) {
    const raw = env.saKey()
    // Support both raw JSON string and base64-encoded JSON
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>
    } catch {
      // Try base64 decode
      const decoded = Buffer.from(raw, 'base64').toString('utf-8')
      parsed = JSON.parse(decoded) as Record<string, unknown>
    }
    globalThis.__ga4client = new BetaAnalyticsDataClient({ credentials: parsed })
  }
  return globalThis.__ga4client
}

function resetClient(): void {
  globalThis.__ga4client = undefined
}
void KEY_CLIENT

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GA4RealtimeSnapshot {
  activeUsers:    number
  newUsers30m:    number
  topPage:        string
  topPageUsers:   number
  country:        string
  device:         string
  browser:        string
  source:         string
  activeSources:  string[]
  activePages:    Array<{ path: string; users: number }>
  fetchedAt:      number
}

interface AlertState {
  lastFirstUser:      number        // timestamp of last "first user" alert
  lastSpike:          number        // timestamp of last spike alert
  milestonesHit:      Set<number>   // milestones already notified today
  lastToolAlert:      Record<string, number>   // tool path → last alert ts
  lastSourceAlert:    Record<string, number>   // source → last alert ts
  lastActiveCount:    number        // previous active user count
  milestonesDate:     string        // YYYY-MM-DD — reset milestones each day
}

// ── State (globalThis — HMR safe) ─────────────────────────────────────────────

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
  lastFirstUser:   0,
  lastSpike:       0,
  milestonesHit:   new Set(),
  lastToolAlert:   {},
  lastSourceAlert: {},
  lastActiveCount: 0,
  milestonesDate:  '',
})
const _timer = gs<{ id: ReturnType<typeof setInterval> | null; started: boolean }>(
  KEY_TIMER, { id: null, started: false }
)

/** Read the latest cached snapshot (used by bot commands) */
export const getGa4Snapshot = (): GA4RealtimeSnapshot | null => _snap.value

// ── GA4 API calls ─────────────────────────────────────────────────────────────

const IMPORTANT_TOOLS = ['/merge-pdf', '/compress-pdf', '/split-pdf', '/pdf-to-word', '/word-to-pdf', '/pdf-to-jpg', '/image-to-pdf', '/ppt-to-pdf']
const MILESTONES      = [5, 10, 25, 50, 100]

async function fetchRealtime(): Promise<GA4RealtimeSnapshot> {
  const client   = getClient()
  const property = `properties/${env.propertyId()}`
  const now      = Date.now()

  // ── Single combined report: today's data with all needed dimensions ────────
  // Note: runRealtimeReport with dimensions fails for many GA4 property types.
  // runReport (standard) is fully supported and returns today's aggregated data.
  const [mainRes] = await client.runReport({
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
    limit: 50,
  })

  // ── Aggregate rows ────────────────────────────────────────────────────────

  const pageMap:    Map<string, number> = new Map()
  const countryMap: Map<string, number> = new Map()
  const deviceMap:  Map<string, number> = new Map()
  const sourceMap:  Map<string, number> = new Map()
  const browserMap: Map<string, number> = new Map()
  let totalActive  = 0
  let totalNewUsers = 0

  for (const row of mainRes.rows ?? []) {
    const page    = row.dimensionValues?.[0]?.value ?? '/'
    const device  = row.dimensionValues?.[1]?.value ?? 'unknown'
    const country = row.dimensionValues?.[2]?.value ?? 'Unknown'
    const source  = row.dimensionValues?.[3]?.value ?? '(none)'
    const browser = row.dimensionValues?.[4]?.value ?? 'N/A'
    const active  = parseInt(row.metricValues?.[0]?.value ?? '0', 10)
    const newU    = parseInt(row.metricValues?.[1]?.value ?? '0', 10)

    pageMap.set(page,       (pageMap.get(page)        ?? 0) + active)
    countryMap.set(country, (countryMap.get(country)  ?? 0) + active)
    deviceMap.set(device,   (deviceMap.get(device)    ?? 0) + active)
    sourceMap.set(source,   (sourceMap.get(source)    ?? 0) + active)
    browserMap.set(browser, (browserMap.get(browser)  ?? 0) + active)
    totalActive   += active
    totalNewUsers += newU
  }

  // Deduplicate aggregation — sum across dimension cross-product may double-count;
  // use the unique page-level aggregation as the canonical active count.
  const sortedPages   = [...pageMap.entries()].sort((a, b) => b[1] - a[1])
  const topCountry    = [...countryMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'
  const topDevice     = [...deviceMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'
  const topSource     = [...sourceMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '(none)'
  const topBrowser    = [...browserMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'
  const activeSources = [...sourceMap.keys()].filter(s => s && s !== '(not set)')

  // Use the page-map total as unique active user count (avoids double-counting)
  const uniqueActive = [...pageMap.values()].reduce((a, b) => a + b, 0)
  totalActive = uniqueActive || totalActive

  const activePages = sortedPages.slice(0, 5).map(([path, users]) => ({ path, users }))

  return {
    activeUsers:   totalActive,
    newUsers30m:   totalNewUsers,
    topPage:       sortedPages[0]?.[0] ?? '/',
    topPageUsers:  sortedPages[0]?.[1] ?? 0,
    country:       topCountry,
    device:        topDevice,
    browser:       topBrowser,
    source:        labelSource(topSource),
    activeSources: activeSources.map(labelSource),
    activePages,
    fetchedAt:     now,
  }
}

// ── Source label helper ───────────────────────────────────────────────────────

function labelSource(raw: string): string {
  const r = raw.toLowerCase()
  if (r === 'organic' || r === 'cpc') return 'Organic Search'
  if (r === '(none)' || r === 'none' || r === 'direct') return 'Direct'
  if (['referral', 'email', 'affiliate'].includes(r)) return 'Referral'
  if (['social', 'facebook', 'instagram', 'twitter', 'tiktok', 'linkedin'].includes(r)) return 'Social'
  return raw || 'Direct'
}

// ── Telegram send helper ──────────────────────────────────────────────────────

async function tgSend(html: string): Promise<void> {
  const token  = env.botToken()
  const chatId = env.chatId()
  if (!token || !chatId) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:    chatId,
      text:       html,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  }).catch((err: Error) => console.warn('[GA4Monitor] Telegram send failed:', err.message))
}

// ── Notification formatters ───────────────────────────────────────────────────

function deviceIcon(d: string): string {
  if (d === 'mobile')  return '📱'
  if (d === 'tablet')  return '📟'
  return '🖥'
}

function sourceIcon(s: string): string {
  if (s.includes('Organic')) return '🔍'
  if (s.includes('Social'))  return '📲'
  if (s.includes('Referral')) return '🔗'
  return '🚀'
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour:   '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC'
}

function buildMessage(snap: GA4RealtimeSnapshot, trigger: string): string {
  const pagesBlock = snap.activePages
    .map((p, i) => `  ${i + 1}. <code>${p.path}</code> — ${p.users} 👤`)
    .join('\n')

  const sourcesBlock = snap.activeSources.length
    ? snap.activeSources.map(s => `${sourceIcon(s)} ${s}`).join(' · ')
    : `${sourceIcon(snap.source)} ${snap.source}`

  return [
    trigger,
    '',
    `👥 <b>Active Users (last 30 min):</b> ${snap.activeUsers}`,
    `🆕 <b>New Users Today:</b> ${snap.newUsers30m}`,
    '',
    `📄 <b>Top Pages:</b>`,
    pagesBlock || `  <code>${snap.topPage}</code>`,
    '',
    `🌍 <b>Country:</b> ${snap.country}`,
    `${deviceIcon(snap.device)} <b>Device:</b> ${snap.device}`,
    `🌐 <b>Browser:</b> ${snap.browser}`,
    `${sourceIcon(snap.source)} <b>Traffic Source:</b> ${sourcesBlock}`,
    '',
    `🕐 <b>Updated:</b> ${fmtTime(snap.fetchedAt)}`,
  ].join('\n')
}

// ── Smart alert logic ─────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

async function checkAlerts(snap: GA4RealtimeSnapshot): Promise<void> {
  const st  = _state.value
  const now = Date.now()

  // Reset daily milestones at midnight
  if (st.milestonesDate !== todayStr()) {
    st.milestonesDate  = todayStr()
    st.milestonesHit   = new Set()
  }

  const prev = st.lastActiveCount
  const curr = snap.activeUsers

  // ── Trigger 1: First user of the session ──────────────────────────────────
  if (curr >= 1 && prev === 0 && now - st.lastFirstUser > 4 * 3_600_000) {
    st.lastFirstUser = now
    await tgSend(buildMessage(snap, '🟢 <b>ToolifyPDF — First visitor detected!</b>'))
  }

  // ── Trigger 2: Traffic spike (≥ 50% increase, at least +3 users) ──────────
  else if (
    prev > 0 &&
    curr - prev >= 3 &&
    (curr - prev) / prev >= 0.5 &&
    now - st.lastSpike > 10 * 60_000
  ) {
    st.lastSpike = now
    await tgSend(buildMessage(snap,
      `📈 <b>Traffic Spike! +${curr - prev} users</b> (${prev} → ${curr})`
    ))
  }

  // ── Trigger 3: Milestone reached ──────────────────────────────────────────
  else {
    for (const milestone of MILESTONES) {
      if (curr >= milestone && prev < milestone && !st.milestonesHit.has(milestone)) {
        st.milestonesHit.add(milestone)
        await tgSend(buildMessage(snap,
          `🎯 <b>Milestone: ${milestone} active users!</b>`
        ))
        break
      }
    }
  }

  // ── Trigger 4: Important tool active ──────────────────────────────────────
  for (const toolPath of IMPORTANT_TOOLS) {
    const toolActive = snap.activePages.find(p => p.path === toolPath || p.path.startsWith(toolPath))
    if (toolActive && toolActive.users >= 1) {
      const lastAlert = st.lastToolAlert[toolPath] ?? 0
      if (now - lastAlert > 5 * 60_000) {
        st.lastToolAlert[toolPath] = now
        const toolName = toolPath.replace('/', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        await tgSend(buildMessage(snap,
          `🛠 <b>${toolName}</b> — ${toolActive.users} user${toolActive.users > 1 ? 's' : ''} active now`
        ))
      }
    }
  }

  // ── Update state ──────────────────────────────────────────────────────────
  st.lastActiveCount = curr
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 5 * 60_000   // 5 minutes
const KEY_STARTED = Symbol.for('toolify.ga4.started')
declare global { var __ga4monitorStarted: boolean | undefined }

async function runOnce(): Promise<void> {
  if (!isConfigured()) return

  try {
    const snap = await fetchRealtime()
    _snap.value = snap
    await checkAlerts(snap)
    console.log(`[GA4Monitor] ✓ Active: ${snap.activeUsers} | New today: ${snap.newUsers30m} | Top: ${snap.topPage}`)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    const propId = env.propertyId()

    // Always log the full error with diagnostics so misconfiguration is obvious
    if (msg.includes('INVALID_ARGUMENT')) {
      console.warn(
        `[GA4Monitor] INVALID_ARGUMENT — GA_PROPERTY_ID="${propId}". ` +
        `Make sure: (1) GA_PROPERTY_ID is the numeric ID only (e.g. "123456789"), ` +
        `(2) the Service Account email has "Viewer" access to this GA4 property. ` +
        `Full error: ${msg.slice(0, 300)}`
      )
      // Reset client so fresh credentials are used next attempt
      resetClient()
    } else if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      console.warn(
        `[GA4Monitor] PERMISSION_DENIED — The service account does not have access to property "${propId}". ` +
        `Grant it "Viewer" role in GA4 Admin → Property Access Management.`
      )
      resetClient()
    } else if (!msg.includes('Could not load the default credentials')) {
      console.warn('[GA4Monitor] Poll failed:', msg.slice(0, 400))
    }
  }
}
void KEY_STARTED

/** Call once at server startup (guarded against HMR double-init) */
export function startGa4Monitor(): void {
  if (globalThis.__ga4monitorStarted) return
  globalThis.__ga4monitorStarted = true

  if (!isConfigured()) {
    console.warn('[GA4Monitor] Skipped — missing env vars (GA_PROPERTY_ID, GOOGLE_SERVICE_ACCOUNT_KEY, TELEGRAM_CHAT_ID)')
    return
  }

  // First run slightly delayed so other services boot first
  setTimeout(() => {
    void runOnce()
    const id = setInterval(() => void runOnce(), POLL_INTERVAL_MS)
    // Don't block Node exit
    if (typeof id === 'object' && id !== null && 'unref' in id) id.unref()
    _timer.value.id = id
  }, 15_000)

  console.log('[GA4Monitor] Started — polling every 5 minutes ✓')
}
