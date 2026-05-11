'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

interface OpsData {
  ts: number
  uptime: number
  system: { cpu: number; memPct: number; memUsed: number; memTotal: number; age: number } | null
  queue: { waiting: number; active: number; completed: number; failed: number } | null
  connectivity: { redisOk: boolean; dbOk: boolean; supabaseOk: boolean } | null
  dbSnap: { totalJobs: number; jobsToday: number; successRate: number; topTools: Array<{ name: string; count: number }> } | null
  failures: Array<{ tool: string; error: string; jobId?: string; ts?: number }>
  failStats: { total: number; byTool: Record<string, number>; last5m: number }
  live: { recentCount: number; activeUsers: number; byTool: Array<{ tool: string; count: number }> }
  globalStats: { totalJobs: number; jobsToday: number; successCount: number; failedCount: number } | null
  toolStats: Array<{ tool: string; total: number; success: number; failed: number; avgMs: number; successRate: number }>
  recentErrors: Array<{ tool: string; message: string; createdAt: number }>
  detailedErrors: Array<{ service: string; errorType: string; rawMessage: string; severity: string; diagnosis: string; rootCause: string; fix: string; createdAt: number }>
  userStats: { totalUsers: number; activeToday: number; avgRequests: number } | null
  insights: { busiestTool: string; busiestHour: number; errorRate: number } | null
  nodeEnv: string
  pid: number
}

interface Diagnosis {
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  rootCause: string
  affectedComponents: string[]
  explanation: string
  steps: Array<{ order: number; action: string; command?: string }>
  estimatedFixTime: string
  preventionTips: string[]
  systemContext: { cpuLoad: number; memPct: number; uptime: number; redisOk: boolean; dbOk: boolean }
  generatedAt: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null, digits = 0): string {
  if (n == null || isNaN(n)) return '—'
  return n.toFixed(digits)
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

function fmtUptime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s % 60}s`
}

function timeAgo(ts: number): string {
  const diff = Math.round((Date.now() - ts) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#6b7280',
}

const SEVERITY_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)',
  high:     'rgba(249,115,22,0.12)',
  medium:   'rgba(245,158,11,0.10)',
  low:      'rgba(107,114,128,0.10)',
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#6366f1', icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string
}) {
  return (
    <div style={{
      background: '#1a1d27', border: '1px solid #2a2d3d', borderRadius: 12,
      padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ color: '#8b92a9', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6b7280' }}>{sub}</div>}
    </div>
  )
}

function Bar({ value, color, label }: { value: number; color: string; label?: string }) {
  const pct = Math.min(100, Math.max(0, value))
  const danger = pct > 85
  const c = danger ? '#ef4444' : pct > 65 ? '#f59e0b' : color
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b92a9' }}>
        <span>{label}</span><span style={{ color: c, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
      </div>}
      <div style={{ height: 8, borderRadius: 4, background: '#2a2d3d', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, background: bg, border: `1px solid ${color}33`,
      borderRadius: 6, padding: '2px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {text}
    </span>
  )
}

function ConnDot({ ok }: { ok: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: ok ? '#22c55e' : '#ef4444', boxShadow: ok ? '0 0 6px #22c55e88' : '0 0 6px #ef444488', marginRight: 6 }} />
  )
}

// ── Diagnose Modal ─────────────────────────────────────────────────────────

function DiagnoseModal({ error, onClose, authKey }: { error: { tool: string; message: string }; onClose: () => void; authKey: string }) {
  const [diag, setDiag] = useState<Diagnosis | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/ops/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authKey}` },
      body: JSON.stringify({ tool: error.tool, message: error.message }),
    })
      .then(r => r.json())
      .then(d => { setDiag(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [error])

  const copyReport = () => {
    if (!diag) return
    const lines = [
      `═══ TOOLIFY DIAGNOSIS REPORT ═══`,
      `Generated: ${new Date(diag.generatedAt).toISOString()}`,
      ``,
      `SEVERITY: ${diag.severity.toUpperCase()}`,
      `TITLE: ${diag.title}`,
      ``,
      `ROOT CAUSE`,
      `──────────`,
      diag.rootCause,
      ``,
      `EXPLANATION`,
      `───────────`,
      diag.explanation,
      ``,
      `AFFECTED COMPONENTS`,
      `───────────────────`,
      diag.affectedComponents.join(', '),
      ``,
      `FIX STEPS`,
      `─────────`,
      ...diag.steps.map(s => s.command
        ? `${s.order}. ${s.action}\n   $ ${s.command}`
        : `${s.order}. ${s.action}`),
      ``,
      `ESTIMATED FIX TIME: ${diag.estimatedFixTime}`,
      ``,
      `PREVENTION TIPS`,
      `───────────────`,
      ...diag.preventionTips.map((t, i) => `${i + 1}. ${t}`),
      ``,
      `SYSTEM CONTEXT AT TIME OF DIAGNOSIS`,
      `────────────────────────────────────`,
      `CPU Load: ${diag.systemContext.cpuLoad.toFixed(1)}%`,
      `Memory: ${diag.systemContext.memPct}%`,
      `Server Uptime: ${fmtUptime(diag.systemContext.uptime)}`,
      `Redis: ${diag.systemContext.redisOk ? 'OK' : 'DOWN'}`,
      `Database: ${diag.systemContext.dbOk ? 'OK' : 'DOWN'}`,
      ``,
      `Tool: ${error.tool}`,
      `Error: ${error.message}`,
    ].join('\n')
    navigator.clipboard.writeText(lines).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const sevColor = diag ? SEVERITY_COLORS[diag.severity] : '#6366f1'
  const sevBg    = diag ? SEVERITY_BG[diag.severity] : '#1a1d27'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#12151f', border: '1px solid #2a2d3d', borderRadius: 16, width: '90%', maxWidth: 680, maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Auto Diagnosis</div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
              {loading ? 'Analyzing…' : (diag?.title ?? 'Error')}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: '16px 28px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6366f1' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
              <div style={{ color: '#8b92a9' }}>Analyzing error patterns and system state…</div>
            </div>
          ) : diag ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: sevBg, border: `1px solid ${sevColor}44`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <Badge text={diag.severity} color={sevColor} bg={sevBg} />
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{diag.rootCause}</div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Explanation</div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{diag.explanation}</p>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Affected Components</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {diag.affectedComponents.map(c => (
                    <span key={c} style={{ fontSize: 12, background: '#1e2235', color: '#94a3b8', borderRadius: 6, padding: '3px 10px', border: '1px solid #2a2d3d', fontFamily: 'monospace' }}>{c}</span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Fix Steps <span style={{ color: '#4b5563', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>— est. {diag.estimatedFixTime}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {diag.steps.map(step => (
                    <div key={step.order} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: '#6366f122', color: '#818cf8', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{step.order}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: step.command ? 6 : 0 }}>{step.action}</div>
                        {step.command && (
                          <div style={{ background: '#0f1117', border: '1px solid #2a2d3d', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <code style={{ fontFamily: 'monospace', fontSize: 12, color: '#86efac', flex: 1, wordBreak: 'break-all' }}>{step.command}</code>
                            <button onClick={() => navigator.clipboard.writeText(step.command!)} style={{ flexShrink: 0, background: '#1e2235', border: '1px solid #2a2d3d', borderRadius: 5, color: '#6b7280', cursor: 'pointer', fontSize: 10, padding: '3px 8px' }}>Copy</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {diag.preventionTips.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Prevention Tips</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {diag.preventionTips.map((t, i) => (
                      <li key={i} style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.6 }}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>System at Diagnosis Time</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
                  {[
                    { k: 'CPU', v: `${diag.systemContext.cpuLoad.toFixed(1)}%` },
                    { k: 'Memory', v: `${diag.systemContext.memPct}%` },
                    { k: 'Uptime', v: fmtUptime(diag.systemContext.uptime) },
                    { k: 'Redis', v: diag.systemContext.redisOk ? '✓ OK' : '✗ Down' },
                    { k: 'DB', v: diag.systemContext.dbOk ? '✓ OK' : '✗ Down' },
                  ].map(({ k, v }) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={copyReport} style={{ background: copied ? '#065f46' : '#1e2235', border: `1px solid ${copied ? '#059669' : '#2a2d3d'}`, borderRadius: 8, color: copied ? '#34d399' : '#94a3b8', cursor: 'pointer', padding: '10px 20px', fontSize: 13, fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                {copied ? '✓ Copied to clipboard!' : '📋 Copy Full Report'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#ef4444', padding: '20px 0' }}>Failed to generate diagnosis.</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Login Screen ───────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: (key: string) => void }) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/ops/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: input.trim() }),
      })
      if (r.ok) {
        sessionStorage.setItem('ops_key', input.trim())
        onAuth(input.trim())
      } else {
        setErr('Invalid key — access denied.')
      }
    } catch {
      setErr('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Inter", system-ui, sans-serif' }}>
      <form onSubmit={submit} style={{ background: '#12151f', border: '1px solid #2a2d3d', borderRadius: 16, padding: '40px 36px', width: 340, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>Toolify Ops</div>
          <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>Internal dashboard — restricted access</div>
        </div>
        <input
          type="password"
          placeholder="Admin key"
          value={input}
          onChange={e => setInput(e.target.value)}
          autoFocus
          style={{ background: '#1a1d27', border: '1px solid #2a2d3d', borderRadius: 8, color: '#e2e8f0', fontSize: 14, outline: 'none', padding: '12px 14px', width: '100%', boxSizing: 'border-box' }}
        />
        {err && <div style={{ color: '#ef4444', fontSize: 12, textAlign: 'center' }}>{err}</div>}
        <button type="submit" disabled={loading} style={{ background: '#6366f1', border: 'none', borderRadius: 8, color: '#fff', cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600, padding: '12px 0', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Verifying…' : 'Access Dashboard'}
        </button>
      </form>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function OpsDashboard() {
  const [sessionKey, setSessionKey] = useState<string | null>(null)
  const [data, setData] = useState<OpsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [diagnoseTarget, setDiagnoseTarget] = useState<{ tool: string; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'errors' | 'tools' | 'queue' | 'live'>('errors')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore key from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('ops_key')
    if (stored) setSessionKey(stored)
  }, [])

  const fetchData = useCallback(async (silent = false, key?: string) => {
    const authKey = key ?? sessionKey
    if (!authKey) return
    if (!silent) setRefreshing(true)
    try {
      const r = await fetch('/api/ops/data', {
        headers: { 'Authorization': `Bearer ${authKey}` },
      })
      if (r.status === 404) {
        sessionStorage.removeItem('ops_key')
        setSessionKey(null)
        return
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const d = await r.json()
      setData(d)
      setLastUpdated(Date.now())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      if (!silent) setRefreshing(false)
    }
  }, [sessionKey])

  const handleAuth = (key: string) => {
    setSessionKey(key)
    fetchData(false, key)
  }

  useEffect(() => {
    if (!sessionKey) return
    fetchData()
    intervalRef.current = setInterval(() => fetchData(true), 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [sessionKey, fetchData])

  if (!sessionKey) return <LoginScreen onAuth={handleAuth} />

  const allErrors = [
    ...(data?.failures ?? []).map(f => ({ tool: f.tool, message: f.error, severity: 'high', createdAt: f.ts ?? Date.now() })),
    ...(data?.recentErrors ?? []).map(e => ({ tool: e.tool, message: e.message, severity: 'medium', createdAt: e.createdAt })),
    ...(data?.detailedErrors ?? []).map(e => ({ tool: e.service, message: e.rawMessage, severity: e.severity, createdAt: e.createdAt })),
  ].sort((a, b) => b.createdAt - a.createdAt).slice(0, 50)

  const css = `
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0f1117; }
    ::-webkit-scrollbar-thumb { background: #2a2d3d; border-radius: 3px; }
    table { border-collapse: collapse; width: 100%; }
    th { font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.06em; padding: 8px 12px; text-align: left; border-bottom: 1px solid #1e2235; }
    td { font-size: 13px; color: #94a3b8; padding: 10px 12px; border-bottom: 1px solid #1a1d27; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #1a1d27; }
  `

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#0f1117', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{error}</div>
      </div>
    </div>
  )

  const g = data?.globalStats
  const successRate = g && g.totalJobs > 0 ? ((g.successCount / g.totalJobs) * 100).toFixed(1) : '—'

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e2e8f0', fontFamily: '"Inter", system-ui, -apple-system, sans-serif' }}>
      <style>{css}</style>

      {diagnoseTarget && <DiagnoseModal error={diagnoseTarget} onClose={() => setDiagnoseTarget(null)} authKey={sessionKey!} />}

      {/* Header */}
      <div style={{ borderBottom: '1px solid #1e2235', padding: '0 24px', background: '#12151f', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20 }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#e2e8f0' }}>Toolify Ops</span>
            <span style={{ fontSize: 11, background: '#1e2235', color: '#6366f1', border: '1px solid #6366f122', borderRadius: 5, padding: '2px 8px', fontWeight: 600 }}>INTERNAL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {data?.connectivity && (
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                <span><ConnDot ok={data.connectivity.redisOk} />Redis</span>
                <span><ConnDot ok={data.connectivity.dbOk} />SQLite</span>
                <span><ConnDot ok={data.connectivity.supabaseOk} />Supabase</span>
              </div>
            )}
            {lastUpdated && (
              <span style={{ fontSize: 11, color: '#4b5563' }}>Updated {timeAgo(lastUpdated)}</span>
            )}
            <button onClick={() => fetchData()} disabled={refreshing} style={{ background: refreshing ? '#1a1d27' : '#6366f1', border: 'none', borderRadius: 8, color: '#fff', cursor: refreshing ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, padding: '6px 14px', opacity: refreshing ? 0.7 : 1 }}>
              {refreshing ? '↻ …' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px 24px' }}>

        {!data && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#4b5563' }}>
            <div style={{ fontSize: 36, marginBottom: 12, animation: 'pulse 1.5s infinite' }}>⚙️</div>
            <div>Loading dashboard…</div>
          </div>
        )}

        {data && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease' }}>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
              <StatCard icon="🔄" label="Active Jobs" value={data.live.activeUsers} color="#6366f1" sub={`${data.queue?.waiting ?? 0} waiting`} />
              <StatCard icon="✅" label="Success Rate" value={`${successRate}%`} color="#22c55e" sub={`${g?.jobsToday ?? 0} jobs today`} />
              <StatCard icon="❌" label="Failed" value={g?.failedCount ?? 0} color="#ef4444" sub={`${data.failStats.last5m} in last 5m`} />
              <StatCard icon="👥" label="Users Today" value={data.userStats?.activeToday ?? '—'} color="#a78bfa" sub={`${data.userStats?.totalUsers ?? 0} total`} />
              <StatCard icon="🕒" label="Uptime" value={fmtUptime(data.uptime)} color="#38bdf8" sub={`PID ${data.pid}`} />
              <StatCard icon="📦" label="Total Jobs" value={(g?.totalJobs ?? 0).toLocaleString()} color="#fb923c" sub="all time" />
            </div>

            {/* System Health */}
            {data.system && (
              <div style={{ background: '#1a1d27', border: '1px solid #2a2d3d', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>System Resources</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                  <Bar value={data.system.cpu} color="#6366f1" label="CPU" />
                  <Bar value={data.system.memPct} color="#a78bfa" label="Memory" />
                </div>
                <div style={{ marginTop: 10, fontSize: 11, color: '#4b5563' }}>
                  Memory: {fmtBytes(data.system.memUsed)} used
                  {data.system.memTotal ? ` / ${fmtBytes(data.system.memTotal)}` : ''}
                  {' · '}Snapshot age: {data.system.age}s
                </div>
              </div>
            )}

            {/* Queue Status */}
            {data.queue && (
              <div style={{ background: '#1a1d27', border: '1px solid #2a2d3d', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 14 }}>BullMQ Queue</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {[
                    { label: 'Waiting', value: data.queue.waiting, color: '#f59e0b' },
                    { label: 'Active', value: data.queue.active, color: '#6366f1' },
                    { label: 'Completed', value: data.queue.completed, color: '#22c55e' },
                    { label: 'Failed', value: data.queue.failed, color: '#ef4444' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center', background: '#12151f', borderRadius: 8, padding: '12px 8px', border: '1px solid #1e2235' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content Tabs */}
            <div style={{ background: '#1a1d27', border: '1px solid #2a2d3d', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #2a2d3d', padding: '0 4px' }}>
                {[
                  { id: 'errors', label: `Errors (${allErrors.length})`, icon: '🔴' },
                  { id: 'tools', label: `Tool Stats (${data.toolStats.length})`, icon: '📊' },
                  { id: 'live', label: `Live Feed (${data.live.byTool.length} tools)`, icon: '📡' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? '#818cf8' : '#6b7280', borderBottom: `2px solid ${activeTab === tab.id ? '#6366f1' : 'transparent'}`,
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 0, minHeight: 300 }}>

                {/* Errors Tab */}
                {activeTab === 'errors' && (
                  <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {allErrors.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 0', color: '#22c55e', fontSize: 16 }}>
                        ✅ No errors recorded
                      </div>
                    ) : allErrors.map((err, i) => {
                      const sev = err.severity || 'medium'
                      const sc  = SEVERITY_COLORS[sev] || '#6b7280'
                      const sb  = SEVERITY_BG[sev] || '#1a1d27'
                      return (
                        <div key={i} style={{ background: sb, border: `1px solid ${sc}33`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                              <Badge text={sev} color={sc} bg={sb} />
                              <span style={{ fontSize: 12, color: '#818cf8', fontFamily: 'monospace', background: '#0f1117', padding: '1px 7px', borderRadius: 4, border: '1px solid #1e2235' }}>{err.tool}</span>
                              <span style={{ fontSize: 11, color: '#4b5563', marginLeft: 'auto' }}>{timeAgo(err.createdAt)}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, wordBreak: 'break-word' }}>
                              {err.message.slice(0, 280)}{err.message.length > 280 ? '…' : ''}
                            </div>
                          </div>
                          <button onClick={() => setDiagnoseTarget({ tool: err.tool, message: err.message })} style={{
                            flexShrink: 0, background: '#12151f', border: `1px solid ${sc}55`, borderRadius: 8,
                            color: sc, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '6px 12px',
                            letterSpacing: '0.04em', transition: 'all 0.15s', whiteSpace: 'nowrap',
                          }}>
                            🔍 Diagnose
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Tool Stats Tab */}
                {activeTab === 'tools' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Tool</th>
                          <th style={{ textAlign: 'right' }}>Total</th>
                          <th style={{ textAlign: 'right' }}>Success</th>
                          <th style={{ textAlign: 'right' }}>Failed</th>
                          <th style={{ textAlign: 'right' }}>Rate</th>
                          <th style={{ textAlign: 'right' }}>Avg Time</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.toolStats.length === 0 ? (
                          <tr><td colSpan={7} style={{ textAlign: 'center', color: '#4b5563', padding: '30px 0' }}>No data yet</td></tr>
                        ) : data.toolStats.map(t => {
                          const rate = t.total > 0 ? (t.success / t.total * 100) : 100
                          const rc = rate > 90 ? '#22c55e' : rate > 70 ? '#f59e0b' : '#ef4444'
                          return (
                            <tr key={t.tool}>
                              <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#818cf8' }}>{t.tool}</span></td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{t.total}</td>
                              <td style={{ textAlign: 'right', color: '#22c55e' }}>{t.success}</td>
                              <td style={{ textAlign: 'right', color: t.failed > 0 ? '#ef4444' : '#6b7280' }}>{t.failed}</td>
                              <td style={{ textAlign: 'right' }}>
                                <span style={{ color: rc, fontWeight: 700, fontSize: 12 }}>{rate.toFixed(1)}%</span>
                              </td>
                              <td style={{ textAlign: 'right', color: '#94a3b8' }}>{fmtMs(t.avgMs)}</td>
                              <td>
                                {t.failed > 0 && (
                                  <button onClick={() => setDiagnoseTarget({ tool: t.tool, message: `Tool has ${t.failed} failures (${(100 - rate).toFixed(1)}% error rate)` })} style={{ background: '#12151f', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 9px' }}>
                                    Diagnose
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Live Feed Tab */}
                {activeTab === 'live' && (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Tool</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Duration</th>
                          <th style={{ textAlign: 'right' }}>When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.live.byTool.length === 0 ? (
                          <tr><td colSpan={3} style={{ textAlign: 'center', color: '#4b5563', padding: '30px 0' }}>No activity in the last 10 seconds</td></tr>
                        ) : data.live.byTool.map((t, i) => (
                          <tr key={i}>
                            <td><span style={{ fontFamily: 'monospace', fontSize: 12, color: '#818cf8' }}>{t.tool}</span></td>
                            <td><span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>{t.count} job{t.count !== 1 ? 's' : ''}</span></td>
                            <td style={{ textAlign: 'right', color: '#4b5563' }}>last 10s</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', fontSize: 11, color: '#2a2d3d', paddingBottom: 16 }}>
              Toolify Ops Dashboard · Auto-refreshes every 5s · {data.nodeEnv?.toUpperCase()} environment
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
