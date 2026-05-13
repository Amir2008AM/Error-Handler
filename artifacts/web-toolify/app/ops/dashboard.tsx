'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Helpers ────────────────────────────────────────────────────────────────────

const ago = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (!ts || isNaN(s) || s < 5) return 'just now'
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const uptime = (s: number) => {
  if (!s || isNaN(s)) return '00:00:00'
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map(v => String(v).padStart(2, '0')).join(':')
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const C = {
  bg:      '#080c14',
  surface: '#0e1420',
  border:  '#1c2535',
  border2: '#243040',
  text:    '#e2eaf5',
  muted:   '#5a7090',
  dim:     '#2a3a50',
  cyan:    '#00d4ff',
  green:   '#00e57a',
  amber:   '#ffb020',
  red:     '#ff3d5a',
  purple:  '#a855f7',
  blue:    '#3b82f6',
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface Snap {
  activeJobs:   number
  totalJobs:    number
  successCount: number
  failCount:    number
  usersToday:   number
  uptime:       number
  pid:          number
  cpu:          number
  ram:          number
  memMB:        number
  snapAge:      number
  queue:        { waiting: number; active: number; completed: number; failed: number }
  redisOk:      boolean
  sqliteOk:     boolean
  supabaseOk:   boolean
  secFailed:    number
  secRateHits:  number
  disabledTools: string[]
  errors:        Array<{ id: string; ts: number; tool: string; type: string; sev?: string; severity?: string; msg: string; diagnosing?: boolean; diagnosed?: boolean; diagnosis?: { cause: string; fix: string; confidence: number; cmd?: string; autofix?: boolean }; fixing?: boolean; fixed?: boolean }>
  resolvedErrors:Array<{ id: string; ts?: number; createdAt?: number; resolvedAt: number; tool: string; msg: string; sev?: string; severity?: string }>
  activeUsers:   Array<{ id: string; ip: string; tool: string | null; since: number; lastSeen: number; status: string }>
  toolStats:     Record<string, { calls: number; success: number; fail: number; durations: number[]; enabled: boolean }>
  events:        Array<{ id: string; ts: number; type: string; tool: string; msg: string }>
  alerts:        Array<{ type: string; msg: string }>
  securityStats?: { topOffendingIps?: Array<{ ip: string; count: number }>; recentEvents?: Array<{ type: string; ip: string; ts: number; detail?: string }> }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]         = useState<Snap | null>(null)
  const [tab, setTab]           = useState('errors')
  const [copied, setCopied]     = useState<string | null>(null)
  const [lastUp, setLastUp]     = useState<number | null>(null)
  const [connected, setConn]    = useState(false)
  const [needsLogin, setLogin]  = useState(false)
  const [adminKey, setKey]      = useState('')
  const [loginErr, setLoginErr] = useState('')
  const [toggleBusy, setTglB]   = useState<Record<string, boolean>>({})
  const [testBusy, setTstB]     = useState<Record<string, boolean>>({})
  const [testResults, setTstR]  = useState<Record<string, { success: boolean; durationMs: number; error: string | null }>>({})

  const esRef      = useRef<EventSource | null>(null)
  const errCount   = useRef(0)
  const gotData    = useRef(false)

  // ── Heartbeat ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const hb = setInterval(() => navigator.sendBeacon('/api/heartbeat'), 5_000)
    navigator.sendBeacon('/api/heartbeat')
    return () => clearInterval(hb)
  }, [])

  // ── SSE with auto-reconnect ───────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close()
    const es = new EventSource('/api/ops/stream')
    es.onopen = () => { setConn(true); errCount.current = 0; setLogin(false) }
    es.onmessage = (e) => {
      try { setData(JSON.parse(e.data) as Snap); setLastUp(Date.now()); gotData.current = true }
      catch {}
    }
    es.onerror = () => {
      setConn(false); es.close()
      errCount.current++
      if (errCount.current >= 2 && !gotData.current) setLogin(true)
      setTimeout(() => connect(), 3_000)
    }
    esRef.current = es
  }, [])

  useEffect(() => { connect(); return () => esRef.current?.close() }, [connect])

  // ── Auth ─────────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    setLoginErr('')
    try {
      const r = await fetch('/api/ops/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey }),
      })
      if (r.ok) { setLogin(false); errCount.current = 0; connect() }
      else setLoginErr('Invalid admin key')
    } catch { setLoginErr('Connection error') }
  }

  // ── Tool actions ─────────────────────────────────────────────────────────────

  const handleToggle = useCallback(async (tool: string) => {
    if (toggleBusy[tool]) return
    setTglB(p => ({ ...p, [tool]: true }))
    try { await fetch(`/api/ops/tool/${encodeURIComponent(tool)}/toggle`, { method: 'POST', credentials: 'include' }) }
    catch {}
    setTglB(p => ({ ...p, [tool]: false }))
  }, [toggleBusy])

  const handleTest = useCallback(async (tool: string) => {
    if (testBusy[tool]) return
    setTstB(p => ({ ...p, [tool]: true }))
    try {
      const r   = await fetch(`/api/ops/tool/${encodeURIComponent(tool)}/test`, { method: 'POST', credentials: 'include' })
      const res = await r.json() as { success: boolean; durationMs: number; error: string | null }
      setTstR(p => ({ ...p, [tool]: res }))
      setTimeout(() => setTstR(p => { const n = { ...p }; delete n[tool]; return n }), 10_000)
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Network error'
      setTstR(p => ({ ...p, [tool]: { success: false, durationMs: 0, error: err } }))
      setTimeout(() => setTstR(p => { const n = { ...p }; delete n[tool]; return n }), 10_000)
    } finally {
      setTstB(p => ({ ...p, [tool]: false }))
    }
  }, [testBusy])

  // ── Error actions ─────────────────────────────────────────────────────────────

  const diagnose = async (id: string) => fetch(`/api/ops/diagnose/${id}`, { method: 'POST' })
  const autofix  = async (id: string) => fetch(`/api/ops/autofix/${id}`,  { method: 'POST' })

  const copyReport = (err: Snap['errors'][number]) => {
    const d = err.diagnosis
    navigator.clipboard.writeText([
      '=== Toolify Error Report ===',
      `Tool: ${err.tool}`,
      `Type: ${err.type}`,
      `Severity: ${err.sev ?? err.severity}`,
      `Time: ${new Date(err.ts).toISOString()}`,
      `\nError:\n${err.msg}`,
      `\nRoot Cause:\n${d?.cause ?? 'Unknown'}`,
      `\nFix:\n${d?.fix ?? 'Check server logs'}`,
      `\nConfidence: ${d?.confidence ?? '?'}%`,
    ].join('\n')).catch(() => {})
    setCopied(err.id)
    setTimeout(() => setCopied(null), 2_500)
  }

  // ── Login overlay ─────────────────────────────────────────────────────────────

  if (needsLogin && !data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '32px 36px', width: 340 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, marginBottom: 4 }}>⚡</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>Toolify Ops</div>
          <div style={{ fontSize: 12, color: C.muted }}>Enter your admin key to continue</div>
        </div>
        <input
          type="password" value={adminKey} autoFocus
          onChange={e => setKey(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="Admin key"
          style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontFamily: 'monospace', fontSize: 13, marginBottom: 10, outline: 'none' }}
        />
        {loginErr && <div style={{ color: C.red, fontSize: 12, marginBottom: 8 }}>{loginErr}</div>}
        <button onClick={handleLogin} style={{ width: '100%', background: C.cyan, border: 'none', borderRadius: 6, padding: 10, color: C.bg, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'monospace' }}>
          Access Dashboard
        </button>
      </div>
    </div>
  )

  // ── Loading screen ────────────────────────────────────────────────────────────

  if (!data) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ textAlign: 'center', color: C.muted }}>
        <div style={{ marginBottom: 8 }}>connecting to server...</div>
        <div style={{ width: 140, height: 2, background: C.dim, borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '50%', background: C.cyan, animation: 'scan 1.2s infinite', borderRadius: 1 }} />
        </div>
      </div>
    </div>
  )

  // ── Derived data ──────────────────────────────────────────────────────────────

  const errors    = data.errors         ?? []
  const resolved  = data.resolvedErrors ?? []
  const users     = data.activeUsers    ?? []
  const events    = data.events         ?? []
  const toolList  = Object.entries(data.toolStats ?? {}).sort(([, a], [, b]) => b.calls - a.calls)
  const secScore  = Math.max(0, 100 - (data.secFailed ?? 0) * 10 - (data.secRateHits ?? 0) * 5)
  const secColor  = secScore > 80 ? C.green : secScore > 50 ? C.amber : C.red

  // ── Sub-components ────────────────────────────────────────────────────────────

  const card = (children: React.ReactNode, extra: React.CSSProperties = {}) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 18px', ...extra }}>
      {children}
    </div>
  )

  const sectionLabel = (text: string) => (
    <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 10 }}>{text}</div>
  )

  // ── Full render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>
      <style>{`
        @keyframes scan    { 0%{transform:translateX(-200%)} 100%{transform:translateX(400%)} }
        @keyframes ripple  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.8)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${C.dim};border-radius:2px}
        button:hover { filter: brightness(1.15) }
      `}</style>

      {/* ── TOPBAR ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: `${C.bg}ee`, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, padding: '0 20px', height: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>⚡</span>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Toolify</span>
          <span style={{ background: `${C.cyan}18`, border: `1px solid ${C.cyan}33`, color: C.cyan, borderRadius: 4, padding: '1px 8px', fontSize: 10 }}>OPS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11 }}>
          {(['Redis', 'SQLite', 'Supabase'] as const).map((n, i) => {
            const ok = [data.redisOk, data.sqliteOk, data.supabaseOk][i]
            return (
              <span key={n} style={{ color: ok ? C.green : C.red, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? C.green : C.red, display: 'inline-block', animation: ok ? 'ripple 2s infinite' : 'none' }} />
                {n}
              </span>
            )
          })}
          <span style={{ color: C.muted }}>
            {connected && <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: C.green, marginRight: 5, animation: 'ripple 2s infinite' }} />}
            {lastUp ? ago(lastUp) : '—'}
          </span>
        </div>
      </div>

      <div style={{ padding: '16px 20px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── ALERTS ──────────────────────────────────────────────────────── */}
        {(data.alerts ?? []).map((a, i) => (
          <div key={i} style={{ background: a.type === 'critical' ? `${C.red}14` : `${C.amber}10`, border: `1px solid ${a.type === 'critical' ? C.red : C.amber}44`, borderRadius: 8, padding: '10px 16px', marginBottom: 8, fontSize: 12, color: a.type === 'critical' ? C.red : C.amber, display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeUp .3s ease' }}>
            {a.type === 'critical' ? '🔴' : '🟠'} <strong>{a.msg}</strong>
          </div>
        ))}

        {/* ── STAT CARDS ──────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 14 }}>
          {([
            ['⚙', 'Active Jobs',   data.activeJobs ?? 0,  `${data.queue?.waiting ?? 0} waiting`,      C.amber],
            ['✓', 'Success Rate',  `${data.totalJobs > 0 ? ((data.successCount / data.totalJobs) * 100).toFixed(1) : 0}%`, `${data.successCount ?? 0} successful`, C.green],
            ['✗', 'Failed',        data.failCount ?? 0,   'all time',                                  C.red],
            ['◉', 'Users Today',   data.usersToday ?? 0,  `${users.length} active now`,                C.cyan],
            ['◷', 'Uptime',        uptime(data.uptime),   `PID ${data.pid ?? '—'}`,                    C.blue],
            ['∑', 'Total Jobs',    data.totalJobs ?? 0,   'all time',                                  C.purple],
          ] as [string, string, string|number, string, string][]).map(([icon, lbl, val, sub, color]) => (
            <div key={lbl} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>{icon} {lbl}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* ── RESOURCES + QUEUE ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {card(<>
            {sectionLabel('System Resources')}
            {(['CPU', 'Memory'] as const).map((l, i) => {
              const v = i === 0 ? (data.cpu ?? 0) : (data.ram ?? 0)
              const c = i === 0 ? C.blue : C.purple
              return (
                <div key={l} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.muted, marginBottom: 4 }}>
                    <span>{l}</span>
                    <span style={{ color: v > 80 ? C.red : v > 60 ? C.amber : c, fontWeight: 700 }}>{v?.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: C.dim, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, v)}%`, background: v > 80 ? C.red : v > 60 ? C.amber : c, borderRadius: 3, transition: 'width .8s ease' }} />
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: 10, color: C.muted }}>{((data.memMB ?? 0) / 1024).toFixed(0)} GB · snapshot {data.snapAge ?? 0}s old</div>
          </>)}
          {card(<>
            {sectionLabel('BullMQ Queue')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, textAlign: 'center' }}>
              {([['Waiting', data.queue?.waiting ?? 0, C.cyan], ['Active', data.queue?.active ?? 0, C.green], ['Done', data.queue?.completed ?? 0, C.green], ['Failed', data.queue?.failed ?? 0, C.red]] as [string, number, string][]).map(([l, v, c]) => (
                <div key={l} style={{ background: C.bg, borderRadius: 6, padding: '10px 0' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </>)}
        </div>

        {/* ── ACTIVE USERS + SECURITY OVERVIEW ────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {card(<>
            {sectionLabel(`Active Users — ${users.length} online`)}
            {users.length === 0
              ? <div style={{ color: C.muted, fontSize: 12 }}>No active users right now</div>
              : users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'ripple 2s infinite' }} />
                    <span style={{ color: C.cyan, fontWeight: 700 }}>{u.ip}</span>
                  </div>
                  <span style={{ background: C.dim, borderRadius: 3, padding: '1px 6px', fontSize: 10, color: C.muted }}>{u.tool ?? 'browsing'}</span>
                  <span style={{ color: C.muted }}>{ago(u.since)}</span>
                </div>
              ))
            }
          </>)}
          {card(<>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              {sectionLabel('Security Monitor')}
              <span style={{ fontSize: 22, fontWeight: 800, color: secColor }}>{secScore}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
              {([['Failed Auth (24h)', data.secFailed ?? 0, C.red], ['Rate Limits (1h)', data.secRateHits ?? 0, C.amber]] as [string, number, string][]).map(([l, v, c]) => (
                <div key={l} style={{ background: C.bg, borderRadius: 6, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: v > 0 ? c : C.green }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: secScore > 80 ? C.green : C.amber }}>
              {secScore > 80 ? '✓ No suspicious activity detected' : '⚠ Review security events below'}
            </div>
          </>)}
        </div>

        {/* ── MOST USED TOOLS SUMMARY ──────────────────────────────────────── */}
        {card(<>
          {sectionLabel('🏆 Most Used Tools')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            {toolList.slice(0, 6).map(([tool, st], i) => {
              const rate = st.calls > 0 ? (st.success / st.calls * 100) : 100
              const avg  = st.calls > 0 ? (((st.durations.reduce((a, b) => a + b, 0) || 0) / st.durations.length || 0) / 1000).toFixed(1) : '—'
              return (
                <div key={tool} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>#{i + 1} <span style={{ color: C.text }}>{tool}</span></div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{st.calls} <span style={{ fontSize: 11, fontWeight: 400, color: C.muted }}>jobs</span></div>
                  <div style={{ margin: '6px 0 4px', height: 3, background: C.dim, borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${rate}%`, background: rate > 80 ? C.green : rate > 50 ? C.amber : C.red, borderRadius: 2, transition: 'width .7s ease' }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>avg {avg}s · <span style={{ color: rate < 80 ? C.red : C.muted }}>{(100 - rate).toFixed(0)}% fail</span></div>
                </div>
              )
            })}
          </div>
        </>, { marginBottom: 14 })}

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, overflowX: 'auto' }}>
            {(['errors', 'resolved', 'tools', 'live', 'security'] as const).map(t => {
              const counts: Record<string, number> = { errors: errors.length, resolved: resolved.length, tools: toolList.length, live: events.length, security: 0 }
              const labels: Record<string, string> = { errors: '⚠ Errors', resolved: '✓ Resolved', tools: '⚙ Tools', live: '◉ Live', security: '🔒 Security' }
              return (
                <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 18px', background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? C.cyan : 'transparent'}`, color: tab === t ? C.cyan : C.muted, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: tab === t ? 700 : 400, whiteSpace: 'nowrap', transition: 'color .2s', filter: 'none' }}>
                  {labels[t]}{counts[t] > 0 ? ` (${counts[t]})` : ''}
                </button>
              )
            })}
          </div>

          <div style={{ padding: '16px 18px' }}>

            {/* ── ERRORS TAB ─────────────────────────────────────────────── */}
            {tab === 'errors' && (errors.length === 0
              ? <div style={{ textAlign: 'center', padding: '32px 0', color: C.green }}>✅ No active errors</div>
              : errors.map(err => (
                <div key={err.id} style={{ background: `${C.red}08`, border: `1px solid ${C.red}22`, borderRadius: 8, padding: '12px 14px', marginBottom: 8, animation: 'fadeUp .25s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: `${C.red}18`, border: `1px solid ${C.red}44`, color: C.red, borderRadius: 3, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>{err.sev ?? err.severity}</span>
                      <span style={{ background: C.dim, borderRadius: 3, padding: '1px 6px', fontSize: 10, color: C.muted }}>{err.tool}</span>
                      <span style={{ fontSize: 10, color: C.muted }}>{ago(err.ts)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {!err.diagnosed && !err.diagnosing && (
                        <button onClick={() => diagnose(err.id)} style={{ background: `${C.cyan}18`, border: `1px solid ${C.cyan}44`, color: C.cyan, borderRadius: 5, padding: '4px 11px', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>🔍 Diagnose</button>
                      )}
                      {err.diagnosing && <span style={{ fontSize: 11, color: C.cyan }}>analyzing...</span>}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: C.muted, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 56, overflow: 'hidden' }}>{err.msg}</div>
                  {err.diagnosed && err.diagnosis && (
                    <div style={{ marginTop: 10, background: C.bg, border: `1px solid ${C.border2}`, borderRadius: 6, padding: '12px 14px', animation: 'fadeUp .2s ease' }}>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Root Cause</div>
                        <div style={{ fontSize: 12 }}>{err.diagnosis.cause}</div>
                      </div>
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 3 }}>Fix</div>
                        <div style={{ fontSize: 12, color: C.green }}>{err.diagnosis.fix}</div>
                      </div>
                      {err.diagnosis.cmd && (
                        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, color: C.cyan, marginBottom: 8 }}>$ {err.diagnosis.cmd}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <span style={{ fontSize: 11, color: C.muted }}>Confidence: <strong style={{ color: C.cyan }}>{err.diagnosis.confidence}%</strong></span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {err.diagnosis.autofix && !err.fixed && (
                            <button onClick={() => autofix(err.id)} style={{ background: `${C.green}18`, border: `1px solid ${C.green}44`, color: C.green, borderRadius: 5, padding: '4px 11px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                              {err.fixing ? '⚙ Fixing...' : '⚡ Auto-Fix'}
                            </button>
                          )}
                          <button onClick={() => copyReport(err)} style={{ background: C.dim, border: `1px solid ${C.border2}`, color: C.muted, borderRadius: 5, padding: '4px 11px', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {copied === err.id ? '✓ Copied' : '📋 Copy Report'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}

            {/* ── RESOLVED TAB ───────────────────────────────────────────── */}
            {tab === 'resolved' && (resolved.length === 0
              ? <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>No resolved errors yet</div>
              : resolved.map(err => (
                <div key={err.id} style={{ background: `${C.green}08`, border: `1px solid ${C.green}22`, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: `${C.green}18`, border: `1px solid ${C.green}44`, color: C.green, borderRadius: 3, padding: '2px 7px', fontSize: 10, fontWeight: 700 }}>RESOLVED</span>
                    <span style={{ background: C.dim, borderRadius: 3, padding: '1px 6px', fontSize: 10, color: C.muted }}>{err.tool}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>{err.sev ?? err.severity}</span>
                    <span style={{ fontSize: 10, color: C.muted }}>created {ago(err.ts ?? err.createdAt ?? 0)}</span>
                    <span style={{ fontSize: 10, color: C.green }}>→ resolved {ago(err.resolvedAt)}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: C.muted, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 48, overflow: 'hidden' }}>{err.msg}</div>
                </div>
              ))
            )}

            {/* ── TOOLS TAB ──────────────────────────────────────────────── */}
            {tab === 'tools' && (toolList.length === 0
              ? <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>No tool activity recorded yet — run a conversion to see stats here</div>
              : toolList.map(([tool, st]) => {
                const isDisabled = (data.disabledTools ?? []).includes(tool)
                const isTglBusy  = !!toggleBusy[tool]
                const isTstBusy  = !!testBusy[tool]
                const testResult = testResults[tool]
                const rate       = st.calls > 0 ? (st.success / st.calls * 100) : 100
                return (
                  <div key={tool} style={{ marginBottom: 10, opacity: isDisabled ? 0.45 : 1, transition: 'opacity .3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, flexWrap: 'wrap', gap: 4 }}>
                      {/* Left: name + toggle + test */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ background: C.dim, borderRadius: 3, padding: '2px 8px', color: C.text }}>{tool}</span>
                        {/* ON / OFF badge */}
                        <button
                          onClick={() => handleToggle(tool)} disabled={isTglBusy}
                          style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 8px', border: 'none', cursor: isTglBusy ? 'default' : 'pointer', opacity: isTglBusy ? 0.6 : 1, background: isDisabled ? `${C.red}18` : `${C.green}18`, color: isDisabled ? C.red : C.green, transition: 'background .25s, color .25s' }}
                        >
                          {isTglBusy ? '…' : isDisabled ? 'OFF' : 'ON'}
                        </button>
                        {/* Test button */}
                        <button
                          onClick={() => handleTest(tool)} disabled={isTstBusy}
                          style={{ fontSize: 10, fontWeight: 600, borderRadius: 4, padding: '2px 8px', border: `1px solid ${C.border2}`, background: C.bg, color: C.cyan, cursor: isTstBusy ? 'default' : 'pointer', opacity: isTstBusy ? 0.6 : 1 }}
                        >
                          {isTstBusy
                            ? <span style={{ display: 'inline-block', animation: 'spin .7s linear infinite' }}>⟳</span>
                            : '▶ Test'}
                        </button>
                        {/* Test result pill */}
                        {testResult && (
                          <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 8px', background: testResult.success ? `${C.green}18` : `${C.red}18`, color: testResult.success ? C.green : C.red }}>
                            {testResult.success ? `✓ ${testResult.durationMs}ms` : `✗ ${(testResult.error ?? 'failed').slice(0, 40)}`}
                          </span>
                        )}
                      </div>
                      {/* Right: stats */}
                      <span style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 11 }}>
                        <span style={{ color: C.muted }}>{st.calls}×</span>
                        <span style={{ color: C.green }}>✓ {rate.toFixed(0)}%</span>
                        {st.fail > 0 && <span style={{ color: C.red }}>✗ {((st.fail / st.calls) * 100).toFixed(0)}%</span>}
                      </span>
                    </div>
                    <div style={{ height: 4, background: C.dim, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, rate)}%`, background: rate > 80 ? C.green : rate > 50 ? C.amber : C.red, borderRadius: 2, transition: 'width .7s ease' }} />
                    </div>
                  </div>
                )
              })
            )}

            {/* ── LIVE TAB ───────────────────────────────────────────────── */}
            {tab === 'live' && (events.length === 0
              ? <div style={{ textAlign: 'center', padding: '32px 0', color: C.muted }}>No live events yet — activity appears here in real time</div>
              : <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                  {events.map((ev, i) => (
                    <div key={`${ev.id}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: ev.type === 'success' ? C.green : C.red, flexShrink: 0, animation: i < 3 ? 'ripple 2s infinite' : 'none' }} />
                      <span style={{ background: C.dim, borderRadius: 3, padding: '1px 6px', fontSize: 10, color: C.muted, flexShrink: 0 }}>{ev.tool}</span>
                      <span style={{ color: ev.type === 'success' ? C.green : C.red, flexShrink: 0 }}>{ev.type === 'success' ? '✓' : '✗'}</span>
                      <span style={{ color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.msg}</span>
                      <span style={{ color: C.muted, flexShrink: 0 }}>{ago(ev.ts)}</span>
                    </div>
                  ))}
                </div>
            )}

            {/* ── SECURITY TAB ───────────────────────────────────────────── */}
            {tab === 'security' && (<>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                {([
                  ['Security Score', secScore, secColor, '/100'],
                  ['Failed Auth (24h)', data.secFailed ?? 0, (data.secFailed ?? 0) > 0 ? C.red : C.green, ' attempts'],
                  ['Rate Limits (1h)', data.secRateHits ?? 0, (data.secRateHits ?? 0) > 0 ? C.amber : C.green, ' hits'],
                ] as [string, number, string, string][]).map(([l, v, c, unit]) => (
                  <div key={l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>{l}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{v}<span style={{ fontSize: 12, fontWeight: 400, color: C.muted }}>{unit}</span></div>
                  </div>
                ))}
              </div>
              {/* Top offending IPs */}
              {(data.securityStats?.topOffendingIps ?? []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  {sectionLabel('Top Offending IPs')}
                  {(data.securityStats!.topOffendingIps ?? []).map(({ ip, count }) => (
                    <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                      <span style={{ color: C.red, fontFamily: 'monospace' }}>{ip}</span>
                      <span style={{ color: C.muted }}>{count} events</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Recent security events */}
              {(data.securityStats?.recentEvents ?? []).length > 0 ? (
                <>
                  {sectionLabel('Recent Events')}
                  <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                    {(data.securityStats!.recentEvents ?? []).map((ev, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                        <span style={{ background: `${C.amber}18`, color: C.amber, borderRadius: 3, padding: '1px 6px', fontSize: 10, flexShrink: 0 }}>{ev.type}</span>
                        <span style={{ color: C.cyan, fontFamily: 'monospace', flexShrink: 0 }}>{ev.ip}</span>
                        {ev.detail && <span style={{ color: C.muted, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.detail}</span>}
                        <span style={{ color: C.muted, flexShrink: 0 }}>{ago(ev.ts)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: C.green }}>✓ No security events recorded</div>
              )}
            </>)}

          </div>
        </div>
      </div>
    </div>
  )
}
