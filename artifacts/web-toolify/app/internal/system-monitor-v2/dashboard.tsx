'use client'

import { useState, useEffect, useCallback, useRef, useReducer } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SystemSnap {
  cpu: number; memPct: number; memUsed: number; memTotal: number
  heapPct: number; heapUsed: number; age: number
}
interface QueueSnap {
  waiting: number; active: number; completed: number; failed: number; delayed: number
  byQueue: Record<string, { waiting: number; active: number; completed: number; failed: number; delayed: number }>
}
interface ConnSnap { redisOk: boolean; dbOk: boolean; supabaseOk: boolean }
interface DbSnapShot {
  totalJobs: number; jobsToday: number; successRate: number; failedCount: number
  avgDurationMs: number; topTools: Array<{ name: string; count: number; successRate: number; avgMs: number }>
}
interface FailureRecord { tool: string; error: string; jobId?: string; severity: string; ts: number }
interface FailStats { total: number; byTool: Record<string, number>; last5m: number }
interface LiveActivity { recentCount: number; activeUsers: number; byTool: Array<{ tool: string; count: number }> }
interface GlobalStats { totalJobs: number; jobsToday: number; successCount: number; failedCount: number; successRate: number; avgDurationMs: number }
interface ToolStat { name: string; count: number; successRate: number; avgDurationMs: number; failureRate: number }
interface RecentError { tool: string; message: string; createdAt: number }
interface DetailedError {
  service: string; errorType: string; rawMessage: string; severity: string
  diagnosis: string; rootCause: string; fix: string; createdAt: number
}
interface UserStats { total: number; newToday: number }
interface Meta { nodeEnv: string; uptime: number; pid: number; sseClients: number }

interface Snapshot {
  ts: number
  system: SystemSnap | null
  queue: QueueSnap | null
  connectivity: ConnSnap | null
  dbSnap: DbSnapShot | null
  failures: FailureRecord[]
  failStats: FailStats
  live: LiveActivity
  globalStats: GlobalStats | null
  toolStats: ToolStat[]
  recentErrors: RecentError[]
  detailedErrors: DetailedError[]
  userStats: UserStats | null
  insights: unknown
  meta: Meta
}

interface Diagnosis {
  severity: 'critical' | 'high' | 'medium' | 'low'
  confidence: number
  title: string
  rootCause: string
  affectedComponents: string[]
  explanation: string
  steps: Array<{ order: number; action: string; command?: string }>
  estimatedFixTime: string
  preventionTips: string[]
  matchedPattern: string
  systemContext: { cpuLoad: number; memPct: number; uptime: number; redisOk: boolean; dbOk: boolean }
  generatedAt: number
}

interface LiveEvent {
  id: number
  type: string
  tool?: string
  message?: string
  ts: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#6b7280',
}
const SEV_BG: Record<string, string> = {
  critical: 'rgba(239,68,68,0.12)', high: 'rgba(249,115,22,0.12)',
  medium: 'rgba(245,158,11,0.10)', low: 'rgba(107,114,128,0.10)',
}
const QUEUE_COLORS: Record<string, string> = {
  'toolify-pdf':      '#6366f1',
  'toolify-image':    '#22c55e',
  'toolify-ocr':      '#f59e0b',
  'toolify-document': '#38bdf8',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: number | undefined | null, digits = 0): string {
  if (n == null || !isFinite(n)) return '—'
  return n.toFixed(digits)
}
function fmtBytes(b: number): string {
  if (!b || !isFinite(b)) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1073741824) return `${(b / 1048576).toFixed(1)} MB`
  return `${(b / 1073741824).toFixed(2)} GB`
}
function fmtUptime(s: number): string {
  if (!s || !isFinite(s)) return '—'
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}
function timeAgo(ts: number): string {
  if (!ts || !isFinite(ts)) return '—'
  const diffMs = Date.now() - ts
  if (diffMs < 0) return 'just now'
  const diff = Math.round(diffMs / 1000)
  if (diff < 5)    return 'just now'
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
function fmtMs(ms: number): string {
  if (!ms || !isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
function healthColor(ok: boolean): string { return ok ? '#22c55e' : '#ef4444' }
function pctColor(p: number): string {
  if (p > 85) return '#ef4444'
  if (p > 65) return '#f59e0b'
  return '#22c55e'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Dot({ ok, pulse }: { ok: boolean; pulse?: boolean }) {
  const color = ok ? '#22c55e' : '#ef4444'
  return (
    <span style={{
      display: 'inline-block', width: 9, height: 9, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: pulse ? `0 0 0 3px ${color}33, 0 0 8px ${color}66` : `0 0 6px ${color}66`,
    }} />
  )
}

function Badge({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color, background: bg,
      border: `1px solid ${color}44`, borderRadius: 5, padding: '2px 7px',
      letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    }}>
      {text}
    </span>
  )
}

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div style={{ background: '#161920', border: '1px solid #242736', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid #242736',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.02em' }}>{title}</span>
        {action}
      </div>
      <div style={{ padding: '16px 20px' }}>{children}</div>
    </div>
  )
}

function StatCard({ label, value, sub, color = '#6366f1', icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon: string
}) {
  return (
    <div style={{
      background: '#161920', border: '1px solid #242736', borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#4b5563' }}>{sub}</div>}
    </div>
  )
}

function ProgressBar({ value, color, label, showPct = true }: {
  value: number; color: string; label?: string; showPct?: boolean
}) {
  const pct = Math.min(100, Math.max(0, isFinite(value) ? value : 0))
  const c   = pctColor(pct)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8b92a9' }}>
          <span>{label}</span>
          {showPct && <span style={{ color: c, fontWeight: 700 }}>{pct.toFixed(1)}%</span>}
        </div>
      )}
      <div style={{ height: 7, borderRadius: 4, background: '#1e2235', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

// ── Diagnose Modal ────────────────────────────────────────────────────────────

function DiagnoseModal({ error, onClose, authToken }: {
  error: { tool: string; message: string }; onClose: () => void; authToken: string
}) {
  const [diag, setDiag] = useState<Diagnosis | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/internal/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      body: JSON.stringify({ tool: error.tool, message: error.message }),
    })
      .then(r => r.json())
      .then((d: Diagnosis) => { setDiag(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [error, authToken])

  const copyReport = () => {
    if (!diag) return
    const txt = [
      '═══ TOOLIFY DIAGNOSIS REPORT ═══',
      `Generated: ${new Date(diag.generatedAt).toISOString()}`,
      '',
      `SEVERITY: ${diag.severity.toUpperCase()}`,
      `CONFIDENCE: ${diag.confidence}%`,
      `TITLE: ${diag.title}`,
      '',
      'ROOT CAUSE', '──────────', diag.rootCause, '',
      'EXPLANATION', '───────────', diag.explanation, '',
      'AFFECTED COMPONENTS', '───────────────────', diag.affectedComponents.join(', '), '',
      'FIX STEPS', '─────────',
      ...diag.steps.map(s => s.command ? `${s.order}. ${s.action}\n   $ ${s.command}` : `${s.order}. ${s.action}`),
      '',
      `ESTIMATED FIX TIME: ${diag.estimatedFixTime}`, '',
      'PREVENTION TIPS', '───────────────',
      ...diag.preventionTips.map((t, i) => `${i + 1}. ${t}`), '',
      'SYSTEM CONTEXT', '──────────────',
      `CPU: ${fmtNum(diag.systemContext.cpuLoad, 1)}%`,
      `Memory: ${diag.systemContext.memPct}%`,
      `Uptime: ${fmtUptime(diag.systemContext.uptime)}`,
      `Redis: ${diag.systemContext.redisOk ? 'OK' : 'DOWN'}`,
      `DB: ${diag.systemContext.dbOk ? 'OK' : 'DOWN'}`,
      '', `Tool: ${error.tool}`, `Error: ${error.message}`,
    ].join('\n')
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const sevColor = diag ? SEV_COLOR[diag.severity] : '#6366f1'
  const sevBg    = diag ? SEV_BG[diag.severity]    : '#161920'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#0f1117', border: '1px solid #242736', borderRadius: 16,
        width: '90%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 32px 96px rgba(0,0,0,0.7)',
      }}>
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 10, color: '#4b5563', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 6 }}>
              Diagnosis Engine
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>
              {loading ? 'Analyzing error…' : (diag?.title ?? 'Diagnosis Failed')}
            </h2>
            {diag && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <Badge text={diag.severity} color={sevColor} bg={sevBg} />
                <span style={{ fontSize: 11, color: '#4b5563' }}>
                  Confidence: <span style={{ color: diag.confidence >= 80 ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>{diag.confidence}%</span>
                </span>
                <span style={{ fontSize: 11, color: '#4b5563' }}>Pattern: <code style={{ color: '#818cf8', fontSize: 11 }}>{diag.matchedPattern}</code></span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', fontSize: 22, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        <div style={{ padding: '20px 28px 28px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6366f1' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>⚙️</div>
              <div style={{ color: '#6b7280', fontSize: 14 }}>Analyzing error patterns and system state…</div>
            </div>
          ) : diag ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Root cause */}
              <div style={{ background: sevBg, border: `1px solid ${sevColor}33`, borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: sevColor, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 6 }}>Root Cause</div>
                <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.6 }}>{diag.rootCause}</div>
              </div>

              {/* Explanation */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Explanation</div>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.7 }}>{diag.explanation}</p>
              </div>

              {/* Affected components */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Affected Components</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {diag.affectedComponents.map(c => (
                    <code key={c} style={{ fontSize: 12, background: '#1a1d27', color: '#94a3b8', borderRadius: 5, padding: '3px 10px', border: '1px solid #242736' }}>{c}</code>
                  ))}
                </div>
              </div>

              {/* Fix steps */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>
                  Fix Steps <span style={{ color: '#374151', fontWeight: 400, fontSize: 11 }}>— est. {diag.estimatedFixTime}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {diag.steps.map(step => (
                    <div key={step.order} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        flexShrink: 0, width: 22, height: 22, borderRadius: '50%',
                        background: '#6366f122', color: '#818cf8', fontSize: 11, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      }}>{step.order}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: step.command ? 6 : 0 }}>{step.action}</div>
                        {step.command && (
                          <div style={{ background: '#090b10', border: '1px solid #1e2235', borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                            <code style={{ fontFamily: 'monospace', fontSize: 12, color: '#86efac', flex: 1, wordBreak: 'break-all' as const }}>{step.command}</code>
                            <button onClick={() => navigator.clipboard.writeText(step.command!)} style={{ flexShrink: 0, background: '#1e2235', border: '1px solid #2a2d3d', borderRadius: 5, color: '#6b7280', cursor: 'pointer', fontSize: 10, padding: '3px 8px' }}>Copy</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Prevention tips */}
              {diag.preventionTips.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Prevention Tips</div>
                  <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {diag.preventionTips.map((t, i) => (
                      <li key={i} style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.6 }}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* System context */}
              <div style={{ background: '#090b10', border: '1px solid #1a1d27', borderRadius: 10, padding: '12px 16px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#374151', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>System at Diagnosis Time</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }}>
                  {[
                    { k: 'CPU', v: `${fmtNum(diag.systemContext.cpuLoad, 1)}%` },
                    { k: 'Memory', v: `${diag.systemContext.memPct}%` },
                    { k: 'Uptime', v: fmtUptime(diag.systemContext.uptime) },
                    { k: 'Redis', v: diag.systemContext.redisOk ? '✓ OK' : '✗ Down', color: diag.systemContext.redisOk ? '#22c55e' : '#ef4444' },
                    { k: 'DB', v: diag.systemContext.dbOk ? '✓ OK' : '✗ Down', color: diag.systemContext.dbOk ? '#22c55e' : '#ef4444' },
                  ].map(({ k, v, color }) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, color: '#374151', marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 13, color: color ?? '#94a3b8', fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={copyReport} style={{
                background: copied ? '#065f46' : '#161920', border: `1px solid ${copied ? '#059669' : '#242736'}`,
                borderRadius: 8, color: copied ? '#34d399' : '#94a3b8', cursor: 'pointer',
                padding: '10px 20px', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
              }}>
                {copied ? '✓ Copied to clipboard!' : '📋 Copy Full Diagnosis Report'}
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

// ── Login Screen ──────────────────────────────────────────────────────────────

function LoginScreen({ onAuth }: { onAuth: (token: string) => void }) {
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]       = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true); setErr('')
    try {
      const r = await fetch('/api/internal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: input.trim() }),
      })
      if (r.ok) {
        const { token } = await r.json()
        sessionStorage.setItem('ops_v2_key', input.trim())
        sessionStorage.setItem('ops_v2_token', token)
        onAuth(token)
      } else {
        setErr('Access denied.')
        setLoading(false)
      }
    } catch {
      setErr('Connection error.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c12', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    }}>
      <div style={{ width: 380, padding: 40, background: '#0f1117', border: '1px solid #1e2235', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#e2e8f0' }}>System Monitor</h1>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4b5563' }}>Restricted access — authenticate to continue</p>
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input
            ref={inputRef}
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Admin key"
            autoComplete="current-password"
            style={{
              background: '#161920', border: `1px solid ${err ? '#ef444466' : '#242736'}`, borderRadius: 10,
              color: '#e2e8f0', fontSize: 14, padding: '12px 16px', width: '100%',
              outline: 'none', fontFamily: 'monospace', letterSpacing: '0.05em', boxSizing: 'border-box',
            }}
          />
          {err && <div style={{ fontSize: 12, color: '#ef4444', textAlign: 'center' }}>{err}</div>}
          <button type="submit" disabled={loading || !input.trim()} style={{
            background: loading ? '#1e2235' : '#6366f1', border: 'none', borderRadius: 10,
            color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14,
            fontWeight: 700, padding: '13px', transition: 'background 0.2s',
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Authenticating…' : 'Authenticate'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

type Section = 'health' | 'users' | 'feed' | 'metrics' | 'queue' | 'workers' | 'resources' | 'errors' | 'timeline' | 'tools' | 'notifications'

const SECTIONS: Array<{ id: Section; label: string; icon: string }> = [
  { id: 'health',    label: 'System Health',   icon: '🏥' },
  { id: 'users',     label: 'Active Users',     icon: '👥' },
  { id: 'feed',      label: 'Live Feed',        icon: '📡' },
  { id: 'metrics',   label: 'Metrics',          icon: '📊' },
  { id: 'queue',     label: 'Queue',            icon: '📦' },
  { id: 'workers',   label: 'Workers',          icon: '⚙️' },
  { id: 'resources', label: 'Resources',        icon: '💾' },
  { id: 'errors',    label: 'Errors',           icon: '🔴' },
  { id: 'timeline',  label: 'Timeline',         icon: '🕐' },
  { id: 'tools',     label: 'Tool Analytics',   icon: '🔧' },
  { id: 'notifs',    label: 'Notifications',    icon: '🔔' },
]

// Notification log (in-memory for session)
const KEY_NOTIFS = Symbol.for('toolify.ops.notifs')
type G2 = Record<symbol, string[]>
function getNotifLog(): string[] {
  const g = (typeof window !== 'undefined' ? window : {}) as G2
  if (!g[KEY_NOTIFS]) g[KEY_NOTIFS] = []
  return g[KEY_NOTIFS]
}

export default function SystemMonitorDashboard() {
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [snap, setSnap]           = useState<Snapshot | null>(null)
  const [liveEvents, dispatch]    = useReducer(
    (prev: LiveEvent[], action: LiveEvent) => [action, ...prev].slice(0, 100),
    []
  )
  const [diagnoseTarget, setDiagnoseTarget] = useState<{ tool: string; message: string } | null>(null)
  const [activeSection, setActiveSection]   = useState<Section>('health')
  const [connected, setConnected]           = useState(false)
  const [lastUpdate, setLastUpdate]         = useState<number | null>(null)
  const [notifLog, setNotifLog]             = useState<string[]>([])

  const sseRef  = useRef<EventSource | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)

  // ── Restore auth from session storage ──────────────────────────────────────

  useEffect(() => {
    const token = sessionStorage.getItem('ops_v2_token')
    const key   = sessionStorage.getItem('ops_v2_key')
    if (token && key) setAuthToken(token)
    // Also check URL ?key= param
    const urlKey = new URLSearchParams(window.location.search).get('key')
    if (urlKey) {
      fetch('/api/internal/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: urlKey }),
      }).then(r => r.ok ? r.json() : null).then(d => {
        if (d?.token) {
          sessionStorage.setItem('ops_v2_key', urlKey)
          sessionStorage.setItem('ops_v2_token', d.token)
          setAuthToken(d.token)
          // Remove key from URL for security
          window.history.replaceState({}, '', window.location.pathname)
        }
      }).catch(() => {})
    }
  }, [])

  // ── SSE Connection ──────────────────────────────────────────────────────────

  const connect = useCallback((token: string) => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }

    const url = `/api/internal/stream`
    const es  = new EventSource(url, { withCredentials: true })
    sseRef.current = es

    es.addEventListener('snapshot', (e: MessageEvent) => {
      try {
        const data: Snapshot = JSON.parse(e.data)
        setSnap(data)
        setLastUpdate(Date.now())
        setConnected(true)
        retryCount.current = 0
      } catch {}
    })

    es.addEventListener('job_success', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        dispatch({ id: Date.now(), type: 'job_success', tool: d.tool, ts: Date.now() })
      } catch {}
    })

    es.addEventListener('job_failed', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        dispatch({ id: Date.now(), type: 'job_failed', tool: d.tool, message: d.error, ts: Date.now() })
        const msg = `❌ Job failed: ${d.tool}${d.error ? ` — ${d.error.slice(0, 60)}` : ''}`
        setNotifLog(prev => [msg, ...prev].slice(0, 50))
        getNotifLog().unshift(msg)
      } catch {}
    })

    es.addEventListener('error_recorded', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        dispatch({ id: Date.now(), type: 'error', tool: d.tool, message: d.message, ts: Date.now() })
      } catch {}
    })

    es.addEventListener('queue_overflow', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        dispatch({ id: Date.now(), type: 'queue_overflow', message: `Queue: ${d.waiting} waiting`, ts: Date.now() })
        setNotifLog(prev => [`⚠️ Queue overflow: ${d.waiting} jobs waiting`, ...prev].slice(0, 50))
      } catch {}
    })

    es.addEventListener('cpu_alert', (e: MessageEvent) => {
      try {
        const d = JSON.parse(e.data)
        dispatch({ id: Date.now(), type: 'cpu_alert', message: `CPU at ${d.cpu}%`, ts: Date.now() })
        setNotifLog(prev => [`🔴 High CPU: ${d.cpu}%`, ...prev].slice(0, 50))
      } catch {}
    })

    es.addEventListener('redis_down', () => {
      dispatch({ id: Date.now(), type: 'redis_down', message: 'Redis disconnected', ts: Date.now() })
      setNotifLog(prev => ['🔴 Redis disconnected!', ...prev].slice(0, 50))
    })

    es.addEventListener('redis_up', () => {
      dispatch({ id: Date.now(), type: 'redis_up', message: 'Redis reconnected', ts: Date.now() })
    })

    es.addEventListener('ping', () => { setConnected(true) })

    es.onerror = () => {
      setConnected(false)
      es.close()
      sseRef.current = null
      // Exponential backoff: 2s, 4s, 8s, max 30s
      const delay = Math.min(2000 * Math.pow(2, retryCount.current), 30000)
      retryCount.current++
      retryRef.current = setTimeout(() => connect(token), delay)
    }
  }, [])

  useEffect(() => {
    if (!authToken) return
    connect(authToken)
    return () => {
      sseRef.current?.close()
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [authToken, connect])

  if (!authToken) return <LoginScreen onAuth={setAuthToken} />

  // ── Derived values ──────────────────────────────────────────────────────────

  const g  = snap?.globalStats
  const successRate = g && (g.totalJobs > 0)
    ? Math.round((g.successCount / g.totalJobs) * 100)
    : 100

  const allErrors: Array<{ tool: string; message: string; createdAt: number; severity: string }> = [
    ...(snap?.detailedErrors ?? []).map(e => ({
      tool: e.service, message: e.rawMessage, createdAt: e.createdAt,
      severity: e.severity ?? 'medium',
    })),
    ...(snap?.recentErrors ?? []).filter(e =>
      !(snap?.detailedErrors ?? []).some(de => de.service === e.tool && Math.abs(de.createdAt - e.createdAt) < 5000)
    ).map(e => ({ ...e, severity: 'medium' })),
  ].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 50)

  const eventTypeStyle = (type: string): { color: string; icon: string } => {
    switch (type) {
      case 'job_success':   return { color: '#22c55e', icon: '✅' }
      case 'job_failed':    return { color: '#ef4444', icon: '❌' }
      case 'error':         return { color: '#f97316', icon: '⚠️' }
      case 'queue_overflow':return { color: '#f59e0b', icon: '📦' }
      case 'cpu_alert':     return { color: '#ef4444', icon: '🔴' }
      case 'redis_down':    return { color: '#ef4444', icon: '🔌' }
      case 'redis_up':      return { color: '#22c55e', icon: '🔌' }
      default:              return { color: '#6b7280', icon: '•' }
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' as const }
  const thStyle: React.CSSProperties = {
    textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: '#4b5563',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    padding: '8px 12px', borderBottom: '1px solid #1e2235',
  }
  const tdStyle: React.CSSProperties = { padding: '9px 12px', fontSize: 13, color: '#94a3b8', borderBottom: '1px solid #161920' }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c12', color: '#cbd5e1',
      fontFamily: "'Inter', 'SF Pro Text', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: '#0f1117', borderBottom: '1px solid #1a1d27',
        padding: '0 24px', position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', gap: 20, height: 56,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#e2e8f0', letterSpacing: '-0.01em' }}>System Monitor</span>
          <span style={{ fontSize: 10, color: '#374151', fontFamily: 'monospace' }}>v2</span>
        </div>

        {/* Connection status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
          <Dot ok={connected} pulse={connected} />
          <span style={{ fontSize: 11, color: connected ? '#22c55e' : '#ef4444', fontWeight: 600 }}>
            {connected ? 'LIVE' : 'Reconnecting…'}
          </span>
          {lastUpdate && <span style={{ fontSize: 10, color: '#374151' }}>{timeAgo(lastUpdate)}</span>}
        </div>

        <div style={{ flex: 1 }} />

        {/* Quick status pills */}
        {snap?.connectivity && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {[
              { label: 'Redis', ok: snap.connectivity.redisOk },
              { label: 'DB',    ok: snap.connectivity.dbOk },
            ].map(({ label, ok }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: ok ? '#22c55e' : '#ef4444', background: ok ? '#022c22' : '#2c0f0f', borderRadius: 6, padding: '3px 10px', border: `1px solid ${ok ? '#22c55e22' : '#ef444422'}` }}>
                <Dot ok={ok} />
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Uptime */}
        {snap?.meta && (
          <span style={{ fontSize: 11, color: '#374151' }}>
            Up {fmtUptime(snap.meta.uptime)} · PID {snap.meta.pid}
          </span>
        )}

        {/* Logout */}
        <button onClick={() => {
          sessionStorage.clear()
          sseRef.current?.close()
          setAuthToken(null)
        }} style={{ background: 'none', border: '1px solid #1e2235', borderRadius: 7, color: '#4b5563', cursor: 'pointer', fontSize: 12, padding: '5px 12px' }}>
          Sign out
        </button>
      </div>

      {/* Nav tabs */}
      <div style={{
        background: '#0f1117', borderBottom: '1px solid #1a1d27',
        display: 'flex', overflowX: 'auto', padding: '0 16px',
        scrollbarWidth: 'none',
      }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id as Section)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '12px 14px',
            fontSize: 12, fontWeight: activeSection === s.id ? 700 : 500, whiteSpace: 'nowrap',
            color: activeSection === s.id ? '#818cf8' : '#4b5563',
            borderBottom: `2px solid ${activeSection === s.id ? '#6366f1' : 'transparent'}`,
            transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{s.icon}</span> {s.label}
            {s.id === 'errors' && allErrors.length > 0 && (
              <span style={{ background: '#ef444422', color: '#ef4444', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {allErrors.length}
              </span>
            )}
            {s.id === 'queue' && (snap?.queue?.waiting ?? 0) > 0 && (
              <span style={{ background: '#f59e0b22', color: '#f59e0b', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>
                {snap?.queue?.waiting}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Stat cards (always visible) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <StatCard icon="✅" label="Success Rate" value={`${successRate}%`} color={successRate > 90 ? '#22c55e' : successRate > 70 ? '#f59e0b' : '#ef4444'} sub={`${g?.jobsToday ?? 0} jobs today`} />
          <StatCard icon="❌" label="Failed" value={g?.failedCount ?? '—'} color="#ef4444" sub={`${snap?.failStats?.last5m ?? 0} in last 5m`} />
          <StatCard icon="👥" label="Active Users" value={snap?.live?.activeUsers ?? '—'} color="#a78bfa" sub={`${snap?.userStats?.total ?? 0} total`} />
          <StatCard icon="📦" label="Queue" value={(snap?.queue?.waiting ?? 0) + (snap?.queue?.active ?? 0)} color="#f59e0b" sub={`${snap?.queue?.waiting ?? 0} waiting`} />
          <StatCard icon="🕒" label="Uptime" value={fmtUptime(snap?.meta?.uptime ?? 0)} color="#38bdf8" sub={snap?.meta?.nodeEnv?.toUpperCase()} />
          <StatCard icon="📈" label="Total Jobs" value={(g?.totalJobs ?? 0).toLocaleString()} color="#fb923c" sub="all time" />
        </div>

        {/* ── System Health ── */}
        {activeSection === 'health' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard title="🏥 System Health">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                {/* CPU & Memory */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <ProgressBar value={snap?.system?.cpu ?? 0} color="#6366f1" label="CPU Usage" />
                  <ProgressBar value={snap?.system?.memPct ?? 0} color="#a78bfa" label="System Memory" />
                  <ProgressBar value={snap?.system?.heapPct ?? 0} color="#38bdf8" label="JS Heap" />
                  {snap?.system && (
                    <div style={{ fontSize: 11, color: '#374151' }}>
                      RAM: {fmtBytes(snap.system.memUsed)} / {fmtBytes(snap.system.memTotal)}
                      {' · '}Heap: {fmtBytes(snap.system.heapUsed)}
                      {' · '}Snapshot: {snap.system.age}s old
                    </div>
                  )}
                </div>

                {/* Connectivity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 4 }}>Connectivity</div>
                  {snap?.connectivity ? [
                    { label: 'Redis / BullMQ', ok: snap.connectivity.redisOk, desc: 'Job queue backend' },
                    { label: 'SQLite Database', ok: snap.connectivity.dbOk,    desc: 'Analytics store' },
                    { label: 'Supabase',        ok: snap.connectivity.supabaseOk, desc: 'Monitoring' },
                  ].map(({ label, ok, desc }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0f1117', borderRadius: 8, padding: '10px 14px', border: `1px solid ${ok ? '#22c55e22' : '#ef444422'}` }}>
                      <Dot ok={ok} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: ok ? '#e2e8f0' : '#94a3b8', fontWeight: 600 }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#374151' }}>{desc}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: ok ? '#22c55e' : '#ef4444' }}>{ok ? 'OK' : 'DOWN'}</span>
                    </div>
                  )) : <div style={{ color: '#374151', fontSize: 13 }}>Loading…</div>}
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {/* ── Active Users ── */}
        {activeSection === 'users' && (
          <SectionCard title="👥 Active Users">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <StatCard icon="🟢" label="Active Now" value={snap?.live?.activeUsers ?? '—'} color="#22c55e" />
              <StatCard icon="👤" label="Total Users" value={snap?.userStats?.total ?? '—'} color="#818cf8" />
              <StatCard icon="🆕" label="New Today" value={snap?.userStats?.newToday ?? '—'} color="#38bdf8" />
              <StatCard icon="🔄" label="Jobs (10s)" value={snap?.live?.recentCount ?? 0} color="#f59e0b" sub="live window" />
            </div>
            {(snap?.live?.byTool?.length ?? 0) > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Active Tools (last 10s)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {snap?.live?.byTool?.map(t => (
                    <div key={t.tool} style={{ background: '#161920', border: '1px solid #242736', borderRadius: 8, padding: '6px 14px', fontSize: 12 }}>
                      <span style={{ color: '#818cf8', fontFamily: 'monospace' }}>{t.tool}</span>
                      <span style={{ color: '#6b7280', marginLeft: 8 }}>×{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Live Feed ── */}
        {activeSection === 'feed' && (
          <SectionCard title="📡 Live Events Feed" action={
            <span style={{ fontSize: 11, color: '#374151' }}>{snap?.meta?.sseClients ?? 0} connected</span>
          }>
            {liveEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#374151' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📡</div>
                <div>Waiting for live events…</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 500, overflowY: 'auto' }}>
                {liveEvents.map(ev => {
                  const { color, icon } = eventTypeStyle(ev.type)
                  return (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #1a1d27' }}>
                      <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color, fontWeight: 700 }}>{ev.type.replace(/_/g, ' ').toUpperCase()}</span>
                          {ev.tool && <code style={{ fontSize: 11, color: '#818cf8', background: '#0f1117', borderRadius: 4, padding: '1px 6px', border: '1px solid #1e2235' }}>{ev.tool}</code>}
                          <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>{timeAgo(ev.ts)}</span>
                        </div>
                        {ev.message && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.message}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Metrics ── */}
        {activeSection === 'metrics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SectionCard title="📊 Conversion Metrics">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <StatCard icon="✅" label="Total Success" value={(g?.successCount ?? 0).toLocaleString()} color="#22c55e" />
                <StatCard icon="❌" label="Total Failed"  value={(g?.failedCount  ?? 0).toLocaleString()} color="#ef4444" />
                <StatCard icon="⏱️" label="Avg Time"     value={fmtMs(g?.avgDurationMs ?? 0)} color="#a78bfa" />
                <StatCard icon="📈" label="Success Rate"  value={`${successRate}%`} color={pctColor(successRate)} />
              </div>

              {/* Top tools bar chart */}
              {(snap?.dbSnap?.topTools?.length ?? 0) > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Top Tools by Volume</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {snap?.dbSnap?.topTools?.map(t => {
                      const maxCount = snap?.dbSnap?.topTools?.[0]?.count ?? 1
                      const pct = (t.count / maxCount) * 100
                      return (
                        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <code style={{ fontSize: 11, color: '#818cf8', width: 140, flexShrink: 0 }}>{t.name}</code>
                          <div style={{ flex: 1, height: 8, background: '#1e2235', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#6366f1', borderRadius: 4, transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: 12, color: '#6b7280', width: 40, textAlign: 'right' as const }}>{t.count}</span>
                          <span style={{ fontSize: 11, color: t.successRate > 90 ? '#22c55e' : '#f59e0b', width: 44, textAlign: 'right' as const }}>
                            {fmtNum(t.successRate, 0)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* ── Queue Inspector ── */}
        {activeSection === 'queue' && (
          <SectionCard title="📦 Queue Inspector">
            {snap?.queue ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Summary row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {[
                    { label: 'Waiting',   value: snap.queue.waiting,   color: '#f59e0b' },
                    { label: 'Active',    value: snap.queue.active,    color: '#6366f1' },
                    { label: 'Completed', value: snap.queue.completed, color: '#22c55e' },
                    { label: 'Failed',    value: snap.queue.failed,    color: '#ef4444' },
                    { label: 'Delayed',   value: snap.queue.delayed,   color: '#a78bfa' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ textAlign: 'center', background: '#0f1117', borderRadius: 10, padding: '14px 8px', border: '1px solid #1e2235' }}>
                      <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 11, color: '#4b5563', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Per-queue breakdown */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 12 }}>Per Queue</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(snap.queue.byQueue).map(([name, q]) => {
                      const color = QUEUE_COLORS[name] ?? '#6366f1'
                      const total = q.waiting + q.active + q.completed + q.failed
                      return (
                        <div key={name} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 10, padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                            <code style={{ fontSize: 12, color, fontWeight: 700 }}>{name}</code>
                            <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>{total} total</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                            {[
                              { k: 'Waiting',   v: q.waiting,   c: '#f59e0b' },
                              { k: 'Active',    v: q.active,    c: '#6366f1' },
                              { k: 'Completed', v: q.completed, c: '#22c55e' },
                              { k: 'Failed',    v: q.failed,    c: '#ef4444' },
                              { k: 'Delayed',   v: q.delayed,   c: '#a78bfa' },
                            ].map(({ k, v, c }) => (
                              <div key={k} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                                <div style={{ fontSize: 10, color: '#374151' }}>{k}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : <div style={{ color: '#374151', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No queue data available</div>}
          </SectionCard>
        )}

        {/* ── Worker Status ── */}
        {activeSection === 'workers' && (
          <SectionCard title="⚙️ Worker Status">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {['toolify-pdf', 'toolify-image', 'toolify-ocr', 'toolify-document'].map(name => {
                const q     = snap?.queue?.byQueue?.[name]
                const color = QUEUE_COLORS[name] ?? '#6366f1'
                const ok    = snap?.connectivity?.redisOk ?? false
                const isActive = (q?.active ?? 0) > 0
                return (
                  <div key={name} style={{ background: '#0f1117', border: `1px solid ${isActive ? color + '44' : '#1e2235'}`, borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <Dot ok={ok} pulse={isActive} />
                      <code style={{ fontSize: 12, color, fontWeight: 700 }}>{name}</code>
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: isActive ? '#22c55e' : ok ? '#6b7280' : '#ef4444' }}>
                        {isActive ? 'ACTIVE' : ok ? 'IDLE' : 'OFFLINE'}
                      </span>
                    </div>
                    {q && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{q.active}</div>
                          <div style={{ fontSize: 10, color: '#374151' }}>Active</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{q.waiting}</div>
                          <div style={{ fontSize: 10, color: '#374151' }}>Waiting</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{q.failed}</div>
                          <div style={{ fontSize: 10, color: '#374151' }}>Failed</div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Server Resources ── */}
        {activeSection === 'resources' && (
          <SectionCard title="💾 Server Resources">
            {snap?.system ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ProgressBar value={snap.system.cpu}     label="CPU Usage"       color="#6366f1" />
                    <ProgressBar value={snap.system.memPct}  label="System Memory"   color="#a78bfa" />
                    <ProgressBar value={snap.system.heapPct} label="Node.js JS Heap" color="#38bdf8" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { k: 'CPU',            v: `${fmtNum(snap.system.cpu, 1)}%` },
                      { k: 'Memory Used',    v: fmtBytes(snap.system.memUsed) },
                      { k: 'Memory Total',   v: fmtBytes(snap.system.memTotal) },
                      { k: 'Heap Used',      v: fmtBytes(snap.system.heapUsed) },
                      { k: 'Process Uptime', v: fmtUptime(snap.meta?.uptime ?? 0) },
                      { k: 'Process PID',    v: String(snap.meta?.pid ?? '—') },
                      { k: 'Node Env',       v: snap.meta?.nodeEnv ?? '—' },
                      { k: 'SSE Clients',    v: String(snap.meta?.sseClients ?? 0) },
                    ].map(({ k, v }) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #161920' }}>
                        <span style={{ fontSize: 12, color: '#4b5563' }}>{k}</span>
                        <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, fontFamily: 'monospace' }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : <div style={{ color: '#374151', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No system data available</div>}
          </SectionCard>
        )}

        {/* ── Error Intelligence ── */}
        {activeSection === 'errors' && (
          <SectionCard title="🔴 Error Intelligence" action={
            <span style={{ fontSize: 11, color: '#374151' }}>{allErrors.length} errors</span>
          }>
            {allErrors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#22c55e' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div style={{ fontSize: 14 }}>No errors recorded</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allErrors.map((err, i) => {
                  const sev = err.severity || 'medium'
                  const sc  = SEV_COLOR[sev] || '#6b7280'
                  const sb  = SEV_BG[sev]   || '#161920'
                  return (
                    <div key={i} style={{ background: sb, border: `1px solid ${sc}33`, borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <Badge text={sev} color={sc} bg={sb} />
                          <code style={{ fontSize: 11, color: '#818cf8', background: '#090b10', padding: '1px 7px', borderRadius: 4, border: '1px solid #1e2235' }}>{err.tool}</code>
                          <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>{timeAgo(err.createdAt)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, wordBreak: 'break-word' as const }}>
                          {err.message.slice(0, 320)}{err.message.length > 320 ? '…' : ''}
                        </div>
                      </div>
                      <button onClick={() => setDiagnoseTarget({ tool: err.tool, message: err.message })} style={{
                        flexShrink: 0, background: '#0f1117', border: `1px solid ${sc}44`, borderRadius: 8,
                        color: sc, cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '7px 14px',
                        letterSpacing: '0.04em', whiteSpace: 'nowrap', transition: 'all 0.15s',
                      }}>
                        🔍 Diagnose
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Recent Failures Timeline ── */}
        {activeSection === 'timeline' && (
          <SectionCard title="🕐 Recent Failures Timeline">
            {(snap?.failures?.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#22c55e' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <div>No recent failures</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', left: 16, top: 0, bottom: 0, width: 2, background: '#1e2235' }} />
                {snap?.failures?.map((f, i) => {
                  const sev = f.severity || 'medium'
                  const sc  = SEV_COLOR[sev] || '#6b7280'
                  return (
                    <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', paddingBottom: 16, paddingLeft: 12 }}>
                      <div style={{
                        flexShrink: 0, width: 10, height: 10, borderRadius: '50%',
                        background: sc, border: `2px solid #0a0c12`, marginTop: 5, position: 'relative', zIndex: 1,
                        boxShadow: `0 0 8px ${sc}66`,
                      }} />
                      <div style={{ flex: 1, background: '#0f1117', border: `1px solid ${sc}22`, borderRadius: 10, padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Badge text={sev} color={sc} bg={SEV_BG[sev] ?? '#161920'} />
                          <code style={{ fontSize: 11, color: '#818cf8' }}>{f.tool}</code>
                          {f.jobId && <code style={{ fontSize: 10, color: '#374151' }}>#{f.jobId.slice(-8)}</code>}
                          <span style={{ fontSize: 11, color: '#374151', marginLeft: 'auto' }}>{timeAgo(f.ts)}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                          {f.error.slice(0, 200)}{f.error.length > 200 ? '…' : ''}
                        </div>
                        <button onClick={() => setDiagnoseTarget({ tool: f.tool, message: f.error })} style={{ marginTop: 8, background: 'none', border: `1px solid ${sc}33`, borderRadius: 6, color: sc, cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 10px', letterSpacing: '0.04em' }}>
                          🔍 Diagnose
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        )}

        {/* ── Tool Analytics ── */}
        {activeSection === 'tools' && (
          <SectionCard title="🔧 Tool Analytics">
            {(snap?.toolStats?.length ?? 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: '#374151' }}>No tool data yet</div>
            ) : (
              <div style={{ overflowX: 'auto' as const }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      {['Tool', 'Total', 'Success Rate', 'Failed', 'Avg Time', 'Status', ''].map(h => (
                        <th key={h} style={{ ...thStyle, textAlign: h === 'Total' || h === 'Failed' || h === 'Avg Time' ? 'right' : 'left' as any }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snap?.toolStats?.map(t => {
                      const rate = 100 - (t.failureRate ?? 0)
                      const rc   = rate > 90 ? '#22c55e' : rate > 70 ? '#f59e0b' : '#ef4444'
                      const failed = t.count - Math.round(t.count * rate / 100)
                      return (
                        <tr key={t.name}>
                          <td style={tdStyle}><code style={{ fontSize: 12, color: '#818cf8' }}>{t.name}</code></td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{t.count}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <span style={{ color: rc, fontWeight: 700 }}>{fmtNum(rate, 1)}%</span>
                          </td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: failed > 0 ? '#ef4444' : '#374151' }}>{failed}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMs(t.avgDurationMs)}</td>
                          <td style={tdStyle}>
                            <div style={{ width: 60, height: 5, background: '#1e2235', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, rate)}%`, height: '100%', background: rc, borderRadius: 3 }} />
                            </div>
                          </td>
                          <td style={tdStyle}>
                            {failed > 0 && (
                              <button onClick={() => setDiagnoseTarget({ tool: t.name, message: `${failed} failures (${(100 - rate).toFixed(1)}% error rate)` })} style={{ background: '#12151f', border: '1px solid #ef444433', borderRadius: 6, color: '#ef4444', cursor: 'pointer', fontSize: 10, fontWeight: 700, padding: '3px 9px' }}>
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
          </SectionCard>
        )}

        {/* ── Notification Center ── */}
        {activeSection === 'notifs' && (
          <SectionCard title="🔔 Notification Center" action={
            <button onClick={() => setNotifLog([])} style={{ background: 'none', border: '1px solid #242736', borderRadius: 6, color: '#4b5563', cursor: 'pointer', fontSize: 11, padding: '4px 10px' }}>Clear</button>
          }>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 8 }}>
                Notifications are delivered via Telegram to configured admin IDs. Session log below:
              </div>
              {notifLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#374151' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>🔔</div>
                  <div>No notifications this session</div>
                </div>
              ) : notifLog.map((msg, i) => (
                <div key={i} style={{ background: '#0f1117', border: '1px solid #1e2235', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#94a3b8' }}>
                  {msg}
                </div>
              ))}
            </div>

            {/* Telegram config status */}
            <div style={{ marginTop: 20, background: '#0f1117', border: '1px solid #1e2235', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 10 }}>Telegram Alert Config</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { k: 'Conversion failures',   v: 'Immediate alert (2m cooldown per tool)' },
                  { k: 'Repeated crashes',       v: 'Alert on CPU > 90% or Heap > 85%' },
                  { k: 'Queue overflow',         v: 'Alert when waiting > 50 jobs' },
                  { k: 'Unhealthy server state', v: 'Alert on Redis down or error rate > 20%' },
                ].map(({ k, v }) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderBottom: '1px solid #161920', padding: '5px 0' }}>
                    <span style={{ color: '#6b7280' }}>{k}</span>
                    <span style={{ color: '#4b5563', textAlign: 'right' as const, maxWidth: '55%' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#1e2235', paddingBottom: 16 }}>
          Toolify System Monitor v2 · SSE real-time · {snap?.meta?.nodeEnv?.toUpperCase() ?? '…'} · Route: /internal/system-monitor-v2
        </div>
      </div>

      {/* Diagnose modal */}
      {diagnoseTarget && (
        <DiagnoseModal
          error={diagnoseTarget}
          onClose={() => setDiagnoseTarget(null)}
          authToken={authToken}
        />
      )}
    </div>
  )
}
