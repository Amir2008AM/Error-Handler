'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import DeveloperDashboard from '@/components/developer-dashboard'

// ── Types ──────────────────────────────────────────────────────────────────────

interface OpsError {
  id:         string
  type:       string
  tool:       string
  severity:   string
  msg:        string
  createdAt:  number
  diagnosis?: { cause: string; fix: string; confidence: number }
}

interface ResolvedError {
  id:         string
  tool:       string
  msg:        string
  severity:   string
  errorType:  string
  createdAt:  number
  resolvedAt: number
}

interface LiveToolEvent {
  id:   number
  tool: string
  ok:   boolean
  ts:   number
}

interface ActiveUser {
  id:    string
  tool:  string
  since: number
}

interface ToolStat {
  name:          string
  count:         number
  successRate:   number
  avgDurationMs: number
  failureRate:   number
}

interface SecurityStats {
  failedAuthLast24h:   number
  rateLimitHitsLast1h: number
  topOffendingIps:     Array<{ ip: string; count: number }>
  threatLevel:         'none' | 'low' | 'medium' | 'high'
  recentEvents:        Array<{ type: string; ip: string; ts: number; detail?: string }>
}

interface OpsData {
  activeJobs:     number
  successRate:    number
  successCount:   number
  failedCount:    number
  usersToday:     number
  uptimeSeconds:  number
  totalJobs:      number
  pid:            number
  cpu:            number
  ram:            number
  memoryMB:       number
  snapshotAge:    number
  queue:          { waiting: number; active: number; completed: number; failed: number }
  redisOk:        boolean
  sqliteOk:       boolean
  supabaseOk:     boolean
  errors:         OpsError[]
  resolvedErrors: ResolvedError[]
  liveTools:      LiveToolEvent[]
  activeUsers:    ActiveUser[]
  toolStats:      ToolStat[]
  securityStats:  SecurityStats
  disabledTools:  string[]
}

interface DiagResult { cause: string; fix: string; confidence: number }

type TabId = 'errors' | 'tools' | 'live' | 'resolved' | 'security' | 'dev-tools'

// ── Helpers ────────────────────────────────────────────────────────────────────

function timeAgo(ts: number | string | undefined): string {
  const ms = typeof ts === 'string' ? new Date(ts).getTime() : Number(ts)
  if (!ms || isNaN(ms)) return 'just now'
  const diff = Math.floor((Date.now() - ms) / 1000)
  if (diff < 5)     return 'just now'
  if (diff < 60)    return `${diff}s ago`
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmtUptime(s: number): string {
  if (!s || isNaN(s)) return '00:00:00'
  const h   = Math.floor(s / 3600)
  const m   = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function fmtMs(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  root: {
    minHeight: '100vh', background: '#0d1117', color: '#c9d1d9',
    fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 13,
  } as React.CSSProperties,
  topBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', borderBottom: '1px solid #21262d',
    background: '#161b22', position: 'sticky', top: 0, zIndex: 100,
  } as React.CSSProperties,
  brand: { display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14, color: '#fff' } as React.CSSProperties,
  badge: {
    background: '#21262d', border: '1px solid #30363d',
    borderRadius: 4, padding: '1px 7px', fontSize: 11, color: '#8b949e',
  } as React.CSSProperties,
  statusRow: { display: 'flex', alignItems: 'center', gap: 12 } as React.CSSProperties,
  dot: (ok: boolean): React.CSSProperties => ({
    width: 7, height: 7, borderRadius: '50%',
    background: ok ? '#3fb950' : '#f85149',
    display: 'inline-block', marginRight: 4,
  }),
  refreshBtn: {
    background: '#1f6feb', border: 'none', color: '#fff',
    borderRadius: 6, padding: '5px 14px', cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
  } as React.CSSProperties,
  body: { padding: '16px' } as React.CSSProperties,
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 10, marginBottom: 12 } as React.CSSProperties,
  card: { background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 16px' } as React.CSSProperties,
  cardLabel: { fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 } as React.CSSProperties,
  cardValue: (color: string): React.CSSProperties => ({ fontSize: 26, fontWeight: 800, color, lineHeight: 1.1 }),
  cardSub: { fontSize: 11, color: '#8b949e', marginTop: 3 } as React.CSSProperties,
  section: { background: '#161b22', border: '1px solid #21262d', borderRadius: 8, padding: '14px 16px', marginBottom: 12 } as React.CSSProperties,
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#c9d1d9', marginBottom: 12 } as React.CSSProperties,
  barTrack: { height: 6, background: '#21262d', borderRadius: 3, overflow: 'hidden' } as React.CSSProperties,
  barFill: (pct: number, color: string): React.CSSProperties => ({
    height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`,
    background: pct > 80 ? '#f85149' : pct > 60 ? '#d29922' : color,
    borderRadius: 3, transition: 'width .7s ease',
  }),
  qGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 } as React.CSSProperties,
  qCell: { textAlign: 'center', background: '#0d1117', borderRadius: 6, padding: '12px 0' } as React.CSSProperties,
  qNum: (color: string): React.CSSProperties => ({ fontSize: 24, fontWeight: 800, color }),
  qLabel: { fontSize: 11, color: '#8b949e', marginTop: 2 } as React.CSSProperties,
  tabs: { display: 'flex', gap: 0, borderBottom: '1px solid #21262d', marginBottom: 12, flexWrap: 'wrap' as const } as React.CSSProperties,
  tab: (active: boolean): React.CSSProperties => ({
    padding: '8px 14px', fontSize: 12, cursor: 'pointer', border: 'none',
    background: 'transparent', color: active ? '#fff' : '#8b949e',
    borderBottom: active ? '2px solid #1f6feb' : '2px solid transparent',
    fontFamily: 'inherit',
  }),
  errorCard: (sev: string): React.CSSProperties => ({
    background: sev === 'CRITICAL' ? 'rgba(248,81,73,.06)' : 'rgba(210,153,34,.06)',
    border: `1px solid ${sev === 'CRITICAL' ? '#f8514933' : '#d2993244'}`,
    borderRadius: 6, padding: '10px 12px', marginBottom: 8, transition: 'all .3s ease',
  }),
  resolvedCard: {
    background: 'rgba(63,185,80,.04)',
    border: '1px solid #3fb95022',
    borderRadius: 6, padding: '10px 12px', marginBottom: 8,
  } as React.CSSProperties,
  errorTop: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 } as React.CSSProperties,
  sevBadge: (sev: string): React.CSSProperties => ({
    background: sev === 'CRITICAL' ? 'rgba(248,81,73,.2)' : 'rgba(210,153,34,.2)',
    color: sev === 'CRITICAL' ? '#f85149' : '#d29922',
    border: `1px solid ${sev === 'CRITICAL' ? '#f85149' : '#d29922'}44`,
    borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 700,
    letterSpacing: '.06em', flexShrink: 0,
  }),
  toolBadge: {
    background: '#21262d', border: '1px solid #30363d',
    borderRadius: 4, padding: '1px 7px', fontSize: 10, color: '#8b949e',
  } as React.CSSProperties,
  errorMsg: {
    fontSize: 11, color: '#8b949e', marginTop: 6,
    fontFamily: "'SF Mono','Fira Code',monospace",
    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
    maxHeight: 60, overflow: 'hidden',
  } as React.CSSProperties,
  diagnoseBtn: {
    background: '#1f6feb', border: 'none', color: '#fff',
    borderRadius: 5, padding: '4px 12px', fontSize: 11,
    cursor: 'pointer', fontWeight: 600, flexShrink: 0, fontFamily: 'inherit',
  } as React.CSSProperties,
  diagnosisBox: {
    marginTop: 10, background: '#0d1117',
    border: '1px solid #1f6feb44', borderRadius: 6, padding: '10px 12px',
  } as React.CSSProperties,
  diagRow: { marginBottom: 6 } as React.CSSProperties,
  diagLabel: { fontSize: 10, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '.07em' } as React.CSSProperties,
  diagVal: { fontSize: 12, color: '#c9d1d9', marginTop: 2 } as React.CSSProperties,
  copyBtn: {
    marginTop: 8, background: '#21262d', border: '1px solid #30363d',
    color: '#8b949e', borderRadius: 5, padding: '3px 10px',
    fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  } as React.CSSProperties,
  liveRow: (ok: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
    borderBottom: '1px solid #21262d11', fontSize: 11,
    color: ok ? '#3fb950' : '#f85149',
  }),
  userRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 0', borderBottom: '1px solid #21262d', fontSize: 11,
  } as React.CSSProperties,
  updatedDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#3fb950', display: 'inline-block', marginRight: 6,
  } as React.CSSProperties,
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 } as React.CSSProperties,
  threatBadge: (level: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      none:   { bg: 'rgba(63,185,80,.12)',   color: '#3fb950', border: '#3fb95033' },
      low:    { bg: 'rgba(121,192,255,.12)', color: '#79c0ff', border: '#79c0ff33' },
      medium: { bg: 'rgba(210,153,34,.15)',  color: '#d29922', border: '#d2992244' },
      high:   { bg: 'rgba(248,81,73,.15)',   color: '#f85149', border: '#f8514944' },
    }
    const t = map[level] ?? map.none
    return { background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 5, padding: '3px 10px', fontSize: 11, fontWeight: 700 }
  },
  secEventRow: (type: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0',
    borderBottom: '1px solid #21262d22', fontSize: 11,
    color: type === 'failed_auth' ? '#f85149' : type === 'rate_limit' ? '#d29922' : '#79c0ff',
  }),
}

// ── Login Screen ──────────────────────────────────────────────────────────────

function OpsLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [key, setKey]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await fetch('/api/ops/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
        credentials: 'include',
      })
      if (r.ok) {
        onSuccess()
      } else {
        setError('Invalid key. Please try again.')
      }
    } catch {
      setError('Could not reach server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ ...S.root, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '32px 28px', width: 320, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 6 }}>⚡ Toolify Ops</div>
        <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 24 }}>Enter your admin key to continue</div>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder="Admin key"
            autoFocus
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0d1117', border: '1px solid #30363d',
              borderRadius: 6, padding: '9px 12px', color: '#c9d1d9',
              fontSize: 13, fontFamily: 'inherit', marginBottom: 12, outline: 'none',
            }}
          />
          {error && <div style={{ color: '#f85149', fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <button
            type="submit"
            disabled={loading || !key.trim()}
            style={{
              width: '100%', background: loading ? '#21262d' : '#1f6feb',
              border: 'none', color: '#fff', borderRadius: 6,
              padding: '9px 0', fontSize: 13, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}
          >
            {loading ? 'Verifying…' : 'Access Dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function OpsDashboard() {
  const [data, setData]             = useState<OpsData | null>(null)
  const [tab, setTab]               = useState<TabId>('errors')
  const [diagMap, setDiagMap]       = useState<Record<string, DiagResult>>({})
  const [diagId, setDiagId]         = useState<string | null>(null)
  const [copiedId, setCopiedId]     = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<number | null>(null)
  const [connected, setConnected]   = useState(false)
  const [needsAuth, setNeedsAuth]   = useState(false)
  const [toggleBusy, setToggleBusy] = useState<Record<string, boolean>>({})
  const [testBusy, setTestBusy]     = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; durationMs: number; error: string | null }>>({})

  const esRef      = useRef<EventSource | null>(null)
  const retryRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)

  // ── Diagnose — must be before early returns ────────────────────────────────

  const handleDiagnose = useCallback(async (err: OpsError) => {
    setDiagId(err.id)
    try {
      const r = await fetch('/api/ops/diagnose', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tool: err.tool, message: err.msg, errorType: err.type, severity: err.severity }),
      })
      if (r.ok) {
        const d = await r.json() as {
          rootCause?: string; explanation?: string; fix?: string; confidence?: number;
          steps?: Array<{ action: string }>
        }
        setDiagMap(prev => ({
          ...prev,
          [err.id]: {
            cause:      d.rootCause || d.explanation || 'Unknown root cause',
            fix:        d.steps?.[0]?.action || d.fix || 'Review the diagnosis.',
            confidence: d.confidence ?? 80,
          },
        }))
      }
    } catch {
      setDiagMap(prev => ({
        ...prev,
        [err.id]: { cause: 'Could not reach diagnosis service.', fix: 'Check server logs.', confidence: 0 },
      }))
    } finally {
      setDiagId(null)
    }
  }, [])

  // ── Copy report ────────────────────────────────────────────────────────────

  const copyReport = useCallback((err: OpsError) => {
    const d = diagMap[err.id]
    const report = [
      '=== Diagnosis Report ===',
      `Tool:     ${err.tool}`,
      `Type:     ${err.type}`,
      `Severity: ${err.severity}`,
      `Time:     ${new Date(err.createdAt).toISOString()}`,
      '', 'Error:', err.msg,
      '', 'Root Cause:', d?.cause ?? '—',
      '', 'Fix:', d?.fix ?? '—',
      '', `Confidence: ${d?.confidence ?? '—'}%`,
    ].join('\n')
    navigator.clipboard.writeText(report).catch(() => {})
    setCopiedId(err.id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [diagMap])

  // ── Toggle tool enabled / disabled ─────────────────────────────────────────

  const handleToggle = useCallback(async (toolName: string) => {
    if (toggleBusy[toolName]) return
    setToggleBusy(prev => ({ ...prev, [toolName]: true }))
    try {
      await fetch(`/api/ops/tool/${encodeURIComponent(toolName)}/toggle`, {
        method: 'POST', credentials: 'include',
      })
    } catch {}
    setToggleBusy(prev => ({ ...prev, [toolName]: false }))
  }, [toggleBusy])

  // ── Test tool ──────────────────────────────────────────────────────────────

  const handleTest = useCallback(async (toolName: string) => {
    if (testBusy[toolName]) return
    setTestBusy(prev => ({ ...prev, [toolName]: true }))
    try {
      const r   = await fetch(`/api/ops/tool/${encodeURIComponent(toolName)}/test`, {
        method: 'POST', credentials: 'include',
      })
      const res = await r.json() as { success: boolean; durationMs: number; error: string | null }
      setTestResults(prev => ({ ...prev, [toolName]: res }))
      setTimeout(() => setTestResults(prev => { const n = { ...prev }; delete n[toolName]; return n }), 10_000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      setTestResults(prev => ({ ...prev, [toolName]: { success: false, durationMs: 0, error: msg } }))
      setTimeout(() => setTestResults(prev => { const n = { ...prev }; delete n[toolName]; return n }), 10_000)
    } finally {
      setTestBusy(prev => ({ ...prev, [toolName]: false }))
    }
  }, [testBusy])

  // ── SSE connection with exponential backoff ────────────────────────────────

  const connect = useCallback(() => {
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    if (retryRef.current) { clearTimeout(retryRef.current); retryRef.current = null }

    const es = new EventSource('/api/ops/stream', { withCredentials: true })
    esRef.current = es

    es.onopen = () => { setConnected(true); retryCount.current = 0; setNeedsAuth(false) }

    es.onmessage = (e: MessageEvent) => {
      try {
        const payload: OpsData = JSON.parse(e.data as string)
        setData(payload)
        setLastUpdate(Date.now())
        setConnected(true)
        setNeedsAuth(false)

        const incoming: Record<string, DiagResult> = {}
        for (const err of payload.errors ?? []) {
          if (err.diagnosis) incoming[err.id] = err.diagnosis
        }
        if (Object.keys(incoming).length > 0) {
          setDiagMap(prev => ({ ...prev, ...incoming }))
        }
      } catch {}
    }

    es.onerror = () => {
      setConnected(false)
      es.close()
      esRef.current = null
      if (!data) {
        setNeedsAuth(true)
        return
      }
      const delay = Math.min(3_000 * Math.pow(1.5, retryCount.current), 30_000)
      retryCount.current++
      retryRef.current = setTimeout(connect, delay)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    connect()
    return () => {
      esRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [connect])

  // ── Show login if unauthenticated ──────────────────────────────────────────

  if (needsAuth) {
    return (
      <OpsLoginScreen
        onSuccess={() => {
          setNeedsAuth(false)
          retryCount.current = 0
          connect()
        }}
      />
    )
  }

  // ── Loading screen ─────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div style={{ ...S.root, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <style>{`@keyframes slide{0%{transform:translateX(-200%)}100%{transform:translateX(400%)}}`}</style>
        <div style={{ textAlign: 'center', color: '#8b949e' }}>
          <div style={{ fontSize: 13, marginBottom: 8 }}>Connecting to server…</div>
          <div style={{ width: 120, height: 3, background: '#21262d', borderRadius: 2, overflow: 'hidden', margin: '0 auto' }}>
            <div style={{ height: '100%', width: '40%', background: '#1f6feb', animation: 'slide 1.2s infinite', borderRadius: 2 }} />
          </div>
        </div>
      </div>
    )
  }

  const errors         = data.errors         ?? []
  const resolvedErrors = data.resolvedErrors  ?? []
  const liveTools      = data.liveTools       ?? []
  const activeUsers    = data.activeUsers     ?? []
  const toolStats      = data.toolStats       ?? []
  const secStats       = data.securityStats   ?? { failedAuthLast24h: 0, rateLimitHitsLast1h: 0, topOffendingIps: [], threatLevel: 'none', recentEvents: [] }

  const threatColors: Record<string, string> = { none: '#3fb950', low: '#79c0ff', medium: '#d29922', high: '#f85149' }
  const threatColor = threatColors[secStats.threatLevel] ?? '#8b949e'

  return (
    <div style={S.root}>
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes slide{0%{transform:translateX(-200%)}100%{transform:translateX(400%)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .err-card{animation:fadeIn .3s ease}
        .diagnose-btn:hover{background:#388bfd !important}
        .copy-btn:hover{color:#c9d1d9 !important}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <div style={S.brand}>
          <span>⚡</span>
          <span>Toolify Ops</span>
          <span style={S.badge}>INTERNAL</span>
        </div>
        <div style={S.statusRow}>
          <span><span style={S.dot(data.redisOk)} />Redis</span>
          <span><span style={S.dot(data.sqliteOk)} />SQLite</span>
          <span><span style={S.dot(data.supabaseOk)} />Supabase</span>
          <span style={{ color: '#8b949e', fontSize: 11 }}>
            {connected && <span style={S.updatedDot} />}
            Updated {lastUpdate ? timeAgo(lastUpdate) : '—'}
          </span>
          <button style={S.refreshBtn} onClick={() => window.location.reload()}>↻ Refresh</button>
        </div>
      </div>

      <div style={S.body}>

        {/* ── STAT CARDS ── */}
        <div style={S.cardsRow}>
          {[
            { label: '🔧 Active Jobs',  value: data.activeJobs ?? 0,                        color: '#f0883e', sub: `${data.queue?.waiting ?? 0} waiting` },
            { label: '✅ Success Rate', value: `${(data.successRate ?? 0).toFixed(1)}%`,     color: '#3fb950', sub: `${data.successCount ?? 0} successful` },
            { label: '✗ Failed',        value: data.failedCount ?? 0,                        color: '#f85149', sub: 'all time' },
            { label: '👤 Users Today',  value: data.usersToday > 0 ? data.usersToday : activeUsers.length, color: '#79c0ff', sub: `${activeUsers.length} active now` },
            { label: '🕐 Uptime',       value: fmtUptime(data.uptimeSeconds),                color: '#79c0ff', sub: `PID ${data.pid ?? '—'}`, small: true },
            { label: '📦 Total Jobs',   value: data.totalJobs ?? 0,                          color: '#f0883e', sub: 'all time' },
          ].map(({ label, value, color, sub, small }) => (
            <div key={label} style={S.card}>
              <div style={S.cardLabel}>{label}</div>
              <div style={small ? { fontSize: 18, fontWeight: 800, color, lineHeight: 1.1 } : S.cardValue(color)}>{value}</div>
              <div style={S.cardSub}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── TWO-COLUMN: SYSTEM + QUEUE ── */}
        <div style={S.twoCol}>

          {/* System Resources */}
          <div style={S.section}>
            <div style={S.sectionTitle}>System Resources</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>CPU</span>
                <span style={{ color: data.cpu > 80 ? '#f85149' : data.cpu > 60 ? '#d29922' : '#3fb950', fontWeight: 700 }}>
                  {(data.cpu ?? 0).toFixed(1)}%
                </span>
                <span style={{ flex: 1 }} />
                <span>Memory</span>
                <span style={{ color: data.ram > 80 ? '#f85149' : '#d29922', fontWeight: 700, marginLeft: 8 }}>
                  {(data.ram ?? 0).toFixed(1)}%
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={S.barTrack}><div style={S.barFill(data.cpu, '#1f6feb')} /></div>
                <div style={S.barTrack}><div style={S.barFill(data.ram, '#d29922')} /></div>
              </div>
              <div style={{ fontSize: 10, color: '#8b949e', marginTop: 5 }}>
                Memory: {(data.memoryMB ?? 0).toLocaleString()} MB · Snapshot: {data.snapshotAge ?? 0}s old
              </div>
            </div>
          </div>

          {/* BullMQ Queue */}
          <div style={S.section}>
            <div style={S.sectionTitle}>BullMQ Queue</div>
            <div style={S.qGrid}>
              {[
                { label: 'Waiting',   value: data.queue?.waiting,   color: '#79c0ff' },
                { label: 'Active',    value: data.queue?.active,    color: '#3fb950' },
                { label: 'Completed', value: data.queue?.completed, color: '#3fb950' },
                { label: 'Failed',    value: data.queue?.failed,    color: '#f85149' },
              ].map(({ label, value, color }) => (
                <div key={label} style={S.qCell}>
                  <div style={S.qNum(color)}>{value ?? 0}</div>
                  <div style={S.qLabel}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TWO-COLUMN: ACTIVE USERS + SECURITY SUMMARY ── */}
        <div style={S.twoCol}>

          {/* Active Users (IP-deduplicated) */}
          <div style={S.section}>
            <div style={S.sectionTitle}>
              🟢 Active Users
              <span style={{ marginLeft: 8, background: '#21262d', borderRadius: 10, padding: '1px 8px', fontSize: 10, color: '#79c0ff', fontWeight: 700 }}>
                {activeUsers.length} unique IP{activeUsers.length !== 1 ? 's' : ''}
              </span>
            </div>
            {activeUsers.length === 0 ? (
              <div style={{ color: '#8b949e', fontSize: 11, padding: '10px 0' }}>No active users right now</div>
            ) : (
              activeUsers.slice(0, 8).map(u => (
                <div key={u.id} style={S.userRow}>
                  <span style={{ color: '#3fb950', fontWeight: 700, fontFamily: 'inherit' }}>{u.id}</span>
                  <span style={S.toolBadge}>{u.tool}</span>
                  <span style={{ color: '#8b949e' }}>{timeAgo(u.since)}</span>
                </div>
              ))
            )}
            {activeUsers.length > 8 && (
              <div style={{ fontSize: 10, color: '#8b949e', marginTop: 6 }}>+{activeUsers.length - 8} more</div>
            )}
          </div>

          {/* Security Summary */}
          <div style={{ ...S.section, borderColor: secStats.threatLevel === 'high' ? '#f8514922' : secStats.threatLevel === 'medium' ? '#d2992222' : '#21262d' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={S.sectionTitle}>🔒 Security Monitor</div>
              <span style={S.threatBadge(secStats.threatLevel)}>
                {secStats.threatLevel.toUpperCase()}
              </span>
            </div>

            {/* Threat level bar */}
            <div style={{ marginBottom: 10 }}>
              <div style={S.barTrack}>
                <div style={{
                  height: '100%', borderRadius: 3, transition: 'width .7s ease',
                  background: threatColor,
                  width: secStats.threatLevel === 'high' ? '100%' : secStats.threatLevel === 'medium' ? '60%' : secStats.threatLevel === 'low' ? '25%' : '0%',
                }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
              <div style={{ background: '#0d1117', borderRadius: 5, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 2 }}>Failed Auth (24h)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: secStats.failedAuthLast24h > 0 ? '#f85149' : '#3fb950' }}>
                  {secStats.failedAuthLast24h}
                </div>
              </div>
              <div style={{ background: '#0d1117', borderRadius: 5, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 2 }}>Rate Limits (1h)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: secStats.rateLimitHitsLast1h > 0 ? '#d29922' : '#3fb950' }}>
                  {secStats.rateLimitHitsLast1h}
                </div>
              </div>
            </div>

            {secStats.topOffendingIps.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>TOP OFFENDING IPs</div>
                {secStats.topOffendingIps.slice(0, 3).map(({ ip, count }) => (
                  <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0', borderBottom: '1px solid #21262d22' }}>
                    <span style={{ color: '#f85149', fontFamily: 'inherit' }}>{ip}</span>
                    <span style={{ color: '#8b949e' }}>{count} event{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {secStats.topOffendingIps.length === 0 && (
              <div style={{ fontSize: 11, color: '#3fb950' }}>✓ No suspicious activity detected</div>
            )}
          </div>
        </div>

        {/* ── MOST USED TOOLS ── */}
        {toolStats.length > 0 && (
          <div style={S.section}>
            <div style={S.sectionTitle}>🏆 Most Used Tools (all-time)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 8 }}>
              {toolStats.slice(0, 6).map((t, i) => (
                <div key={t.name} style={{ background: '#0d1117', borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, color: '#8b949e', fontWeight: 700 }}>#{i + 1}</span>
                    <span style={S.toolBadge}>{t.name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                    <span style={{ color: '#c9d1d9', fontWeight: 700 }}>{t.count.toLocaleString()} jobs</span>
                    <span style={{ color: t.successRate >= 90 ? '#3fb950' : t.successRate >= 70 ? '#d29922' : '#f85149' }}>
                      {t.successRate}%
                    </span>
                  </div>
                  <div style={S.barTrack}>
                    <div style={{
                      height: '100%', borderRadius: 3, transition: 'width .7s ease',
                      width: `${t.successRate}%`,
                      background: t.successRate >= 90 ? '#3fb950' : t.successRate >= 70 ? '#d29922' : '#f85149',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>
                    avg {fmtMs(t.avgDurationMs)} · {t.failureRate}% fail
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TABS ── */}
        <div style={S.section}>
          <div style={S.tabs}>
            <button style={S.tab(tab === 'errors')} onClick={() => setTab('errors')}>
              🔴 Active Errors ({errors.length})
            </button>
            <button style={S.tab(tab === 'resolved')} onClick={() => setTab('resolved')}>
              ✅ Resolved ({resolvedErrors.length})
            </button>
            <button style={S.tab(tab === 'tools')} onClick={() => setTab('tools')}>
              📊 Tool Stats ({toolStats.length})
            </button>
            <button style={S.tab(tab === 'live')} onClick={() => setTab('live')}>
              📡 Live Feed ({liveTools.length})
            </button>
            <button style={S.tab(tab === 'security')} onClick={() => setTab('security')}>
              🔒 Security Log
            </button>
            <button style={S.tab(tab === 'dev-tools')} onClick={() => setTab('dev-tools')}>
              🛠 Dev Tools
            </button>
          </div>

          {/* ACTIVE ERRORS TAB */}
          {tab === 'errors' && (
            <div>
              {errors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#3fb950', fontSize: 13 }}>
                  ✅ No active errors
                </div>
              )}
              {errors.map(err => {
                const isDiagnosing = diagId === err.id
                const diagResult   = diagMap[err.id]
                return (
                  <div key={err.id} className="err-card" style={S.errorCard(err.severity)}>
                    <div style={S.errorTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={S.sevBadge(err.severity)}>{err.severity}</span>
                        <span style={S.toolBadge}>{err.tool}</span>
                        <span style={{ fontSize: 10, color: '#8b949e' }}>{timeAgo(err.createdAt)}</span>
                      </div>
                      {!diagResult && (
                        <button
                          className="diagnose-btn"
                          style={{ ...S.diagnoseBtn, opacity: isDiagnosing ? 0.7 : 1 }}
                          onClick={() => !isDiagnosing && handleDiagnose(err)}
                          disabled={isDiagnosing}
                        >
                          {isDiagnosing
                            ? <span><span style={{ display: 'inline-block', animation: 'spin .8s linear infinite', marginRight: 5 }}>⟳</span>Diagnosing…</span>
                            : '🔍 Diagnose'}
                        </button>
                      )}
                    </div>
                    <div style={S.errorMsg}>{err.msg}</div>
                    {diagResult && (
                      <div style={{ ...S.diagnosisBox, animation: 'fadeIn .3s ease' }}>
                        <div style={S.diagRow}>
                          <div style={S.diagLabel}>Root Cause</div>
                          <div style={S.diagVal}>{diagResult.cause}</div>
                        </div>
                        <div style={S.diagRow}>
                          <div style={S.diagLabel}>Recommended Fix</div>
                          <div style={{ ...S.diagVal, color: '#3fb950' }}>{diagResult.fix}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 11, color: '#8b949e' }}>
                            Confidence: <span style={{ color: '#79c0ff', fontWeight: 700 }}>{diagResult.confidence}%</span>
                          </div>
                          <button className="copy-btn" style={S.copyBtn} onClick={() => copyReport(err)}>
                            {copiedId === err.id ? '✓ Copied!' : '📋 Copy Report'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* RESOLVED ERRORS TAB */}
          {tab === 'resolved' && (
            <div>
              {resolvedErrors.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#8b949e', fontSize: 13 }}>
                  No resolved errors yet — errors move here once their tool runs successfully
                </div>
              )}
              {resolvedErrors.map(err => (
                <div key={err.id} style={S.resolvedCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ ...S.sevBadge(err.severity), background: 'rgba(63,185,80,.15)', color: '#3fb950', border: '1px solid #3fb95033' }}>
                      RESOLVED
                    </span>
                    <span style={S.toolBadge}>{err.tool}</span>
                    <span style={{ fontSize: 10, color: '#8b949e' }}>errored {timeAgo(err.createdAt)}</span>
                    <span style={{ fontSize: 10, color: '#3fb950' }}>→ resolved {timeAgo(err.resolvedAt)}</span>
                  </div>
                  <div style={{ ...S.errorMsg, maxHeight: 40 }}>{err.msg}</div>
                </div>
              ))}
            </div>
          )}

          {/* TOOL STATS TAB */}
          {tab === 'tools' && (
            <div>
              {toolStats.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8b949e' }}>
                  No tool activity recorded yet — run a conversion to see stats here
                </div>
              )}
              {toolStats.map(t => {
                const isDisabled = (data.disabledTools ?? []).includes(t.name)
                const isTglBusy  = !!toggleBusy[t.name]
                const isTstBusy  = !!testBusy[t.name]
                const testResult = testResults[t.name]
                return (
                  <div key={t.name} style={{ marginBottom: 10, opacity: isDisabled ? 0.45 : 1, transition: 'opacity .3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      {/* Left: name + toggle + test */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={S.toolBadge}>{t.name}</span>

                        {/* ON / OFF toggle badge */}
                        <button
                          onClick={() => handleToggle(t.name)}
                          disabled={isTglBusy}
                          style={{
                            fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 8px',
                            border: 'none', cursor: isTglBusy ? 'default' : 'pointer',
                            opacity: isTglBusy ? 0.6 : 1,
                            background: isDisabled ? 'rgba(248,81,73,.18)' : 'rgba(63,185,80,.18)',
                            color:      isDisabled ? '#f85149'              : '#3fb950',
                            transition: 'background .25s, color .25s',
                          }}
                        >
                          {isTglBusy ? '…' : isDisabled ? 'OFF' : 'ON'}
                        </button>

                        {/* Test button */}
                        <button
                          onClick={() => handleTest(t.name)}
                          disabled={isTstBusy}
                          style={{
                            fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 8px',
                            border: '1px solid #30363d', background: '#21262d', color: '#79c0ff',
                            cursor: isTstBusy ? 'default' : 'pointer', opacity: isTstBusy ? 0.6 : 1,
                          }}
                        >
                          {isTstBusy
                            ? <span style={{ display: 'inline-block', animation: 'spin .7s linear infinite' }}>⟳</span>
                            : '▶ Test'}
                        </button>

                        {/* Test result pill (auto-clears after 10 s) */}
                        {testResult && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 8px',
                            background: testResult.success ? 'rgba(63,185,80,.18)' : 'rgba(248,81,73,.18)',
                            color:      testResult.success ? '#3fb950'              : '#f85149',
                          }}>
                            {testResult.success
                              ? `✓ ${testResult.durationMs}ms`
                              : `✗ ${(testResult.error ?? 'failed').slice(0, 40)}`}
                          </span>
                        )}
                      </div>

                      {/* Right: stats */}
                      <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ color: '#8b949e' }}>{t.count.toLocaleString()}×</span>
                        <span style={{ color: '#3fb950' }}>✓ {t.successRate}%</span>
                        <span style={{ color: '#8b949e' }}>avg {fmtMs(t.avgDurationMs)}</span>
                        {t.failureRate > 0 && <span style={{ color: '#f85149' }}>✗ {t.failureRate}%</span>}
                      </span>
                    </div>
                    <div style={S.barTrack}>
                      <div style={{
                        height: '100%', borderRadius: 3, transition: 'width .7s ease',
                        width: `${t.successRate}%`,
                        background: t.successRate > 90 ? '#3fb950' : t.successRate > 70 ? '#d29922' : '#f85149',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* LIVE FEED TAB */}
          {tab === 'live' && (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {liveTools.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#8b949e' }}>
                  Waiting for events…
                </div>
              )}
              {liveTools.map(e => (
                <div key={e.id} style={S.liveRow(e.ok)}>
                  <span>{e.ok ? '✓' : '✗'}</span>
                  <span style={S.toolBadge}>{e.tool}</span>
                  <span style={{ color: '#8b949e', marginLeft: 'auto' }}>{timeAgo(e.ts)}</span>
                </div>
              ))}
            </div>
          )}

          {/* SECURITY LOG TAB */}
          {tab === 'security' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { label: 'Threat Level', value: secStats.threatLevel.toUpperCase(), color: threatColor },
                  { label: 'Failed Auth (24h)', value: String(secStats.failedAuthLast24h), color: secStats.failedAuthLast24h > 0 ? '#f85149' : '#3fb950' },
                  { label: 'Rate Limits (1h)', value: String(secStats.rateLimitHitsLast1h), color: secStats.rateLimitHitsLast1h > 0 ? '#d29922' : '#3fb950' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#0d1117', borderRadius: 6, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                  </div>
                ))}
              </div>

              {secStats.topOffendingIps.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 6 }}>TOP OFFENDING IPs (24h)</div>
                  {secStats.topOffendingIps.map(({ ip, count }) => (
                    <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #21262d' }}>
                      <span style={{ color: '#f85149', fontFamily: 'inherit', fontSize: 12 }}>{ip}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, ...S.barTrack }}>
                          <div style={{ height: '100%', borderRadius: 3, background: '#f85149', width: `${Math.min(100, (count / 20) * 100)}%` }} />
                        </div>
                        <span style={{ color: '#8b949e', fontSize: 11 }}>{count} event{count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ fontSize: 10, color: '#8b949e', marginBottom: 6 }}>RECENT EVENTS</div>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {secStats.recentEvents.length === 0 && (
                  <div style={{ color: '#3fb950', fontSize: 11, padding: '10px 0' }}>✓ No security events recorded</div>
                )}
                {secStats.recentEvents.map((ev, i) => (
                  <div key={i} style={S.secEventRow(ev.type)}>
                    <span style={{ fontWeight: 700 }}>
                      {ev.type === 'failed_auth' ? '🔐' : ev.type === 'rate_limit' ? '⚡' : '⚠️'}
                    </span>
                    <span style={{ fontWeight: 600 }}>{ev.type.replace('_', ' ').toUpperCase()}</span>
                    <span style={{ color: '#8b949e', fontFamily: 'inherit' }}>{ev.ip}</span>
                    {ev.detail && <span style={{ color: '#8b949e', fontSize: 10 }}>{ev.detail}</span>}
                    <span style={{ color: '#8b949e', marginLeft: 'auto' }}>{timeAgo(ev.ts)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEV TOOLS TAB */}
          {tab === 'dev-tools' && (
            <div style={{ margin: '0 -16px -14px', borderTop: '1px solid #21262d' }}>
              <DeveloperDashboard />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
