'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { TOOL_CONFIGS } from './tool-configs'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardTool {
  id:           string
  name:         string
  category:     string
  slug:         string
  enabled:      boolean
  hasTestConfig: boolean
  engine:       string | null
  endpoint:     string | null
  steps:        string[]
  lastRun:      { status: 'success' | 'failed'; totalMs: number; timestamp: number; error?: string } | null
  lastFailure:  { timestamp: number; error?: string; steps: PStep[]; fileInfo: { name: string; size: number } } | null
  testCount:    number
  failureCount: number
}

interface PStep {
  name: string; status: string; durationMs: number; detail?: string
}

interface TestResult {
  tool?: string; toolLabel?: string; engine?: string; endpoint?: string
  status: 'success' | 'failed'
  httpStatus?: number
  steps:    PStep[]
  warnings: string[]
  metadata?: Record<string, string | number | boolean>
  output?:  { fileId: string; filename: string; contentType: string; sizeBytes: number }
  error?:   string
  rawError?: string
  totalMs:  number
}

interface DiagResult {
  toolSlug: string; toolName: string; category: string
  enabled: boolean; hasTestConfig: boolean; engine: string
  health: 'healthy' | 'warning' | 'error'
  binaries: Record<string, string | null>
  issues: string[]
  recommendation: string
  lastRun:     { status: string; timestamp: number; totalMs: number } | null
  lastFailure: { timestamp: number; error?: string; steps: PStep[] } | null
  testCount: number; failureCount: number; error?: string
}

// ── Color theme ───────────────────────────────────────────────────────────────

const C = {
  bg: '#0d0f14', sidebar: '#0f1118', card: '#141720',
  border: '#1e2235', border2: '#242736',
  text: '#e2e8f0', muted: '#6b7280', dim: '#4b5563',
  accent: '#6366f1', ok: '#22c55e', fail: '#ef4444', warn: '#f59e0b',
}

// ── Utility ───────────────────────────────────────────────────────────────────

function fmtBytes(b: number) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}
function fmtMs(ms: number) { return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s` }
function fmtTime(ts: number) { return ts ? new Date(ts).toLocaleTimeString() : '—' }

// ── Shared small components ───────────────────────────────────────────────────

function Toggle({ on, onChange, loading }: { on: boolean; onChange: () => void; loading?: boolean }) {
  return (
    <div
      role="switch" aria-checked={on}
      onClick={loading ? undefined : onChange}
      style={{ width: 38, height: 22, borderRadius: 11, background: on ? C.ok : '#374151', cursor: loading ? 'not-allowed' : 'pointer', position: 'relative', transition: 'background 0.2s', opacity: loading ? 0.6 : 1, flexShrink: 0 }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 17 : 3, width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.18s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        ...(loading ? { border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' } : {}),
      }} />
    </div>
  )
}

function Btn({ children, onClick, disabled, loading, color = C.accent, outline, fullWidth, big, small }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean
  color?: string; outline?: boolean; fullWidth?: boolean; big?: boolean; small?: boolean
}) {
  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      style={{
        padding: big ? '11px 18px' : small ? '4px 10px' : '7px 14px',
        borderRadius: 8, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: big ? 13 : small ? 10 : 12, fontWeight: 700,
        width: fullWidth ? '100%' : undefined,
        border: outline ? `1px solid ${color}66` : 'none',
        background: outline ? 'transparent' : disabled ? '#374151' : color,
        color: outline ? color : disabled ? C.muted : '#fff',
        opacity: loading ? 0.7 : 1, transition: 'opacity 0.15s',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}
    >
      {loading && <span style={{ width: 10, height: 10, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 18px', ...style }}>{children}</div>
}

function SectionHeader({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 14, paddingBottom: 8, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon && <span>{icon}</span>}{children}
    </div>
  )
}

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 5, color: enabled ? C.ok : C.fail, background: enabled ? `${C.ok}15` : `${C.fail}15`, border: `1px solid ${enabled ? C.ok : C.fail}44` }}>
      {enabled ? '● ENABLED' : '● DISABLED'}
    </span>
  )
}

function HealthBadge({ health }: { health: 'healthy' | 'warning' | 'error' }) {
  const cfg = { healthy: { c: C.ok, l: '● Healthy' }, warning: { c: C.warn, l: '⚠ Warning' }, error: { c: C.fail, l: '✗ Error' } }[health]
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6, color: cfg.c, background: `${cfg.c}15`, border: `1px solid ${cfg.c}33` }}>{cfg.l}</span>
}

function StepRow({ step }: { step: PStep }) {
  const s = step.status
  const color = s === 'ok' ? C.ok : s === 'fail' ? C.fail : s === 'warn' ? C.warn : s === 'skip' ? C.dim : C.muted
  const icon  = s === 'ok' ? '✓' : s === 'fail' ? '✗' : s === 'warn' ? '⚠' : s === 'skip' ? '–' : '·'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0', borderBottom: `1px solid ${C.border}22` }}>
      <span style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, color, fontWeight: 700, fontSize: 10, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <code style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{step.name}</code>
          {step.durationMs > 0 && <span style={{ fontSize: 10, color: C.muted }}>{fmtMs(step.durationMs)}</span>}
        </div>
        {step.detail && <div style={{ fontSize: 10, color: C.muted, marginTop: 2, wordBreak: 'break-word' }}>{step.detail}</div>}
      </div>
    </div>
  )
}

function FileDropZone({ label, accept, file, onFile }: { label: string; accept: string; file: File | null; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      style={{ border: `2px dashed ${drag ? C.accent : file ? C.ok : C.border2}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', background: drag ? `${C.accent}0a` : 'transparent', transition: 'border-color 0.2s', textAlign: 'center' as const }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      {file
        ? <div><div style={{ fontSize: 12, color: C.ok, fontWeight: 600 }}>✓ {file.name}</div><div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{fmtBytes(file.size)} — click to change</div></div>
        : <div><div style={{ fontSize: 12, color: C.muted }}>{label}</div><div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>click or drag & drop</div></div>}
    </div>
  )
}

// ── Tool list item (left sidebar) ─────────────────────────────────────────────

function ToolItem({ tool, selected, toggling, onSelect, onToggle }: {
  tool: DashboardTool; selected: boolean; toggling: boolean; onSelect: () => void; onToggle: () => void
}) {
  const lastIcon  = tool.lastRun ? (tool.lastRun.status === 'success' ? '✓' : '✗') : null
  const lastColor = tool.lastRun ? (tool.lastRun.status === 'success' ? C.ok : C.fail) : C.muted
  return (
    <div
      onClick={onSelect}
      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px 7px 10px', cursor: 'pointer', userSelect: 'none' as const, background: selected ? `${C.accent}14` : 'transparent', borderLeft: selected ? `2px solid ${C.accent}` : '2px solid transparent', transition: 'background 0.12s' }}
    >
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: tool.enabled ? C.ok : C.fail, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: selected ? 700 : 400, color: selected ? C.text : '#cbd5e1', whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {tool.name}
        </div>
        {lastIcon && (
          <div style={{ fontSize: 9, color: lastColor, fontWeight: 700 }}>{lastIcon} last test {fmtTime(tool.lastRun!.timestamp)}</div>
        )}
      </div>
      {tool.lastRun?.status === 'failed' && (
        <span title="Last test failed" style={{ fontSize: 9, color: C.fail, fontWeight: 900 }}>!</span>
      )}
      <div onClick={e => { e.stopPropagation(); onToggle() }} style={{ flexShrink: 0 }}>
        <Toggle on={tool.enabled} onChange={onToggle} loading={toggling} />
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DevDashboard() {
  const [tools,        setTools]        = useState<DashboardTool[]>([])
  const [loadingTools, setLoadingTools] = useState(true)
  const [selectedSlug, setSelectedSlug] = useState('')
  const [toggling,     setToggling]     = useState<string | null>(null)

  const [testFile,    setTestFile]    = useState<File | null>(null)
  const [testFile2,   setTestFile2]   = useState<File | null>(null)
  const [testParams,  setTestParams]  = useState<Record<string, string>>({})
  const [testRunning, setTestRunning] = useState(false)
  const [testResult,  setTestResult]  = useState<TestResult | null>(null)

  const [diagRunning, setDiagRunning] = useState(false)
  const [diagResult,  setDiagResult]  = useState<DiagResult | null>(null)

  const [verifyFile,    setVerifyFile]    = useState<File | null>(null)
  const [verifyRunning, setVerifyRunning] = useState(false)
  const [verifyResult,  setVerifyResult]  = useState<TestResult | null>(null)

  const resultRef = useRef<HTMLDivElement>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchTools = useCallback(async (silent = false) => {
    if (!silent) setLoadingTools(true)
    try {
      const res  = await fetch('/api/internal/dashboard')
      const data = await res.json() as { tools: DashboardTool[] }
      setTools(data.tools ?? [])
    } catch { /* ignore network errors */ }
    finally { if (!silent) setLoadingTools(false) }
  }, [])

  useEffect(() => {
    void fetchTools()
    const id = setInterval(() => void fetchTools(true), 15_000)
    return () => clearInterval(id)
  }, [fetchTools])

  // ── Select tool ──────────────────────────────────────────────────────────────
  const handleSelect = (slug: string) => {
    if (slug === selectedSlug) return
    setSelectedSlug(slug)
    setTestFile(null); setTestFile2(null); setTestResult(null)
    setDiagResult(null); setVerifyFile(null); setVerifyResult(null)
    const cfg = TOOL_CONFIGS[slug]
    const defs: Record<string, string> = {}
    for (const p of cfg?.params ?? []) { if (p.default !== undefined) defs[p.name] = p.default }
    setTestParams(defs)
  }

  // ── Toggle tool ──────────────────────────────────────────────────────────────
  const handleToggle = async (slug: string, currentEnabled: boolean) => {
    setToggling(slug)
    setTools(prev => prev.map(t => t.slug === slug ? { ...t, enabled: !currentEnabled } : t))
    try {
      await fetch('/api/internal/dashboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', toolSlug: slug, enabled: !currentEnabled }),
      })
    } catch {
      setTools(prev => prev.map(t => t.slug === slug ? { ...t, enabled: currentEnabled } : t))
    } finally { setToggling(null) }
  }

  // ── Run test ─────────────────────────────────────────────────────────────────
  const handleRunTest = async () => {
    if (!testFile || !selectedSlug) return
    setTestRunning(true); setTestResult(null)
    const form = new FormData()
    form.append('tool', selectedSlug)
    form.append('file', testFile, testFile.name)
    if (testFile2) form.append('file2', testFile2, testFile2.name)
    form.append('params', JSON.stringify(testParams))
    try {
      const res  = await fetch('/api/internal/dev-test', { method: 'POST', body: form })
      const data = await res.json() as TestResult
      setTestResult(data)
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
      setTimeout(() => void fetchTools(true), 700)
    } catch (err) {
      setTestResult({ status: 'failed', steps: [], warnings: [], error: String(err), totalMs: 0 })
    } finally { setTestRunning(false) }
  }

  // ── Diagnose ─────────────────────────────────────────────────────────────────
  const handleDiagnose = async () => {
    if (!selectedSlug) return
    setDiagRunning(true); setDiagResult(null)
    try {
      const res = await fetch('/api/internal/dashboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'diagnose', toolSlug: selectedSlug }),
      })
      setDiagResult(await res.json() as DiagResult)
    } catch {
      setDiagResult({ toolSlug: selectedSlug, toolName: '', category: '', enabled: true, hasTestConfig: false, engine: '', health: 'error', binaries: {}, issues: ['Request failed'], recommendation: 'Check server', lastRun: null, lastFailure: null, testCount: 0, failureCount: 0 })
    } finally { setDiagRunning(false) }
  }

  // ── Verify fix ───────────────────────────────────────────────────────────────
  const handleVerifyFix = async () => {
    if (!verifyFile || !selectedSlug) return
    setVerifyRunning(true); setVerifyResult(null)
    const form = new FormData()
    form.append('tool', selectedSlug)
    form.append('file', verifyFile, verifyFile.name)
    form.append('params', JSON.stringify(testParams))
    try {
      const res = await fetch('/api/internal/dev-test', { method: 'POST', body: form })
      setVerifyResult(await res.json() as TestResult)
      setTimeout(() => void fetchTools(true), 700)
    } catch (err) {
      setVerifyResult({ status: 'failed', steps: [], warnings: [], error: String(err), totalMs: 0 })
    } finally { setVerifyRunning(false) }
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const selectedTool = tools.find(t => t.slug === selectedSlug) ?? null
  const testConfig   = TOOL_CONFIGS[selectedSlug] ?? null
  const fileAccept   = !testConfig ? '*' : testConfig.fileType === 'pdf' ? '.pdf' : testConfig.fileType === 'image' ? '.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff' : '.docx,.doc,.xlsx,.xls,.pptx,.ppt,.html'

  const enabledCount  = tools.filter(t => t.enabled).length
  const disabledCount = tools.filter(t => !t.enabled).length
  const totalRuns     = tools.reduce((s, t) => s + t.testCount, 0)
  const totalFails    = tools.reduce((s, t) => s + t.failureCount, 0)

  const categories: Record<string, DashboardTool[]> = {}
  for (const t of tools) {
    if (!categories[t.category]) categories[t.category] = []
    categories[t.category].push(t)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '7px 10px', borderRadius: 6,
    background: '#0a0c12', border: `1px solid ${C.border}`,
    color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' as const,
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        ::-webkit-scrollbar { width: 6px; height: 6px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: #242736; border-radius: 3px }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: C.sidebar, borderBottom: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' as const, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.warn, background: `${C.warn}18`, border: `1px solid ${C.warn}44`, borderRadius: 5, padding: '2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>⚙ Developer Only</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Developer Dashboard</div>
            <div style={{ fontSize: 10, color: C.muted }}>Real tool control · testing · diagnostics · verify fix</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginLeft: 'auto', flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { l: 'Tools', v: tools.length, c: C.text },
              { l: 'Enabled', v: enabledCount, c: C.ok },
              { l: 'Disabled', v: disabledCount, c: disabledCount ? C.fail : C.muted },
              { l: 'Tests Run', v: totalRuns, c: C.text },
              { l: 'Failures', v: totalFails, c: totalFails ? C.fail : C.muted },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' as const }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{s.l}</div>
              </div>
            ))}
          </div>
          <a href="/internal/system-monitor-v2" style={{ fontSize: 12, color: C.accent, textDecoration: 'none', fontWeight: 600 }}>← System Monitor</a>
        </div>
      </div>

      {/* ── 2-column body ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Left: Tool List ── */}
        <div style={{ background: C.sidebar, borderRight: `1px solid ${C.border}`, overflowY: 'auto' as const, paddingBottom: 20 }}>
          {loadingTools ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' as const, color: C.muted, fontSize: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              Loading tools…
            </div>
          ) : (
            Object.entries(categories).map(([cat, catTools]) => (
              <div key={cat}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase' as const, letterSpacing: '0.1em', padding: '10px 12px 4px', borderTop: `1px solid ${C.border}` }}>
                  {cat} <span style={{ color: C.border2 }}>({catTools.length})</span>
                </div>
                {catTools.map(tool => (
                  <ToolItem
                    key={tool.slug}
                    tool={tool}
                    selected={tool.slug === selectedSlug}
                    toggling={toggling === tool.slug}
                    onSelect={() => handleSelect(tool.slug)}
                    onToggle={() => void handleToggle(tool.slug, tool.enabled)}
                  />
                ))}
              </div>
            ))
          )}
          {!loadingTools && tools.length === 0 && (
            <div style={{ padding: '30px 16px', textAlign: 'center' as const, color: C.muted, fontSize: 12 }}>No tools found</div>
          )}
        </div>

        {/* ── Right: Main Area ── */}
        <div style={{ overflowY: 'auto' as const, padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>

          {/* Empty state */}
          {!selectedSlug && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', minHeight: 400, color: C.muted, gap: 12 }}>
              <div style={{ fontSize: 48 }}>🛠️</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Select a tool from the left panel</div>
              <div style={{ fontSize: 12 }}>Toggle ON/OFF, run real tests, inspect diagnostics, or verify a fix</div>
            </div>
          )}

          {/* Tool detail */}
          {selectedSlug && selectedTool && (() => {
            const tool = selectedTool
            return (
              <>
                {/* ── 1. Tool Header ── */}
                <Card>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{tool.name}</h2>
                        <StatusBadge enabled={tool.enabled} />
                        {tool.lastRun && (
                          <span style={{ fontSize: 10, color: tool.lastRun.status === 'success' ? C.ok : C.fail, fontWeight: 600 }}>
                            {tool.lastRun.status === 'success' ? '✓' : '✗'} tested {fmtTime(tool.lastRun.timestamp)} ({fmtMs(tool.lastRun.totalMs)})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, alignItems: 'center' }}>
                        {tool.engine   && <span style={{ fontSize: 11, color: C.accent }}>⚙ {tool.engine}</span>}
                        {tool.endpoint && <code style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{tool.endpoint}</code>}
                        <span style={{ fontSize: 11, color: C.muted }}>{tool.category}</span>
                        {tool.testCount > 0 && (
                          <span style={{ fontSize: 11, color: C.muted }}>
                            {tool.testCount} run{tool.testCount !== 1 ? 's' : ''}
                            {tool.failureCount > 0 && <span style={{ color: C.fail }}> · {tool.failureCount} fail{tool.failureCount !== 1 ? 's' : ''}</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: C.muted }}>{tool.enabled ? 'ON' : 'OFF'}</span>
                      <Toggle on={tool.enabled} onChange={() => void handleToggle(tool.slug, tool.enabled)} loading={toggling === tool.slug} />
                    </div>
                  </div>
                  {!tool.enabled && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: `${C.fail}0d`, border: `1px solid ${C.fail}33`, borderRadius: 7, fontSize: 11, color: C.fail }}>
                      ⚠ This tool is disabled. Users visiting <code style={{ background: 'transparent', fontFamily: 'monospace' }}>/{tool.slug}</code> will see "Tool temporarily unavailable" when they try to process a file.
                    </div>
                  )}
                </Card>

                {/* ── 2. Test Tool ── */}
                <Card>
                  <SectionHeader icon="▶">Test Tool — Real File Processing</SectionHeader>

                  {!testConfig ? (
                    <div style={{ padding: '20px 0', textAlign: 'center' as const, color: C.muted }}>
                      <div style={{ fontSize: 20, marginBottom: 8 }}>🖥️</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>Client-side tool</div>
                      <div style={{ fontSize: 12 }}>This tool has no server-side file processing. No file upload test available.</div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                      {/* Left: file upload + pipeline steps */}
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>
                            Upload {testConfig.fileType === 'pdf' ? 'PDF' : testConfig.fileType === 'image' ? 'Image' : 'Document'}
                          </div>
                          <FileDropZone label={`Drop ${testConfig.fileType} here`} accept={fileAccept} file={testFile} onFile={setTestFile} />
                        </div>
                        {testConfig.multiFile && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>Second File (required for merge)</div>
                            <FileDropZone label="Drop second PDF" accept=".pdf" file={testFile2} onFile={setTestFile2} />
                          </div>
                        )}
                        {testConfig.steps.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>Expected Pipeline</div>
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                              {testConfig.steps.map(s => (
                                <code key={s} style={{ fontSize: 9, color: C.muted, background: `${C.border}88`, padding: '2px 5px', borderRadius: 4 }}>{s}</code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right: params + run button */}
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                        {testConfig.params && testConfig.params.length > 0 && (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, marginBottom: 8 }}>Parameters</div>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9 }}>
                              {testConfig.params.map(p => (
                                <div key={p.name}>
                                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{p.label ?? p.name}{p.required ? ' *' : ''}</div>
                                  {p.type === 'select' ? (
                                    <select value={testParams[p.name] ?? p.default ?? ''} onChange={e => setTestParams(prev => ({ ...prev, [p.name]: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                                      {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                  ) : (
                                    <input type="text" value={testParams[p.name] ?? p.default ?? ''} onChange={e => setTestParams(prev => ({ ...prev, [p.name]: e.target.value }))} placeholder={p.placeholder ?? ''} style={inputStyle} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ marginTop: 'auto' }}>
                          <Btn onClick={handleRunTest} disabled={!testFile || testRunning} loading={testRunning} fullWidth big>
                            {testRunning ? 'Running real pipeline…' : '▶ Run Test'}
                          </Btn>
                          {!testFile && <div style={{ fontSize: 10, color: C.muted, textAlign: 'center' as const, marginTop: 6 }}>Upload a file first</div>}
                        </div>

                        <div style={{ padding: '8px 10px', background: `${C.accent}0a`, border: `1px solid ${C.accent}22`, borderRadius: 7, fontSize: 10, color: C.muted }}>
                          Test runs the exact same backend, engine, and routes used by real users.
                          {tool.enabled ? ' Tool is enabled.' : <span style={{ color: C.warn }}> Tool is currently disabled — test bypasses the guard.</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* ── 3. Results ── */}
                <div ref={resultRef}>
                  {(testRunning || testResult) && (
                    <Card>
                      <SectionHeader icon="📋">Pipeline Trace & Results</SectionHeader>

                      {testRunning && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0', color: C.muted }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Running {tool.name}…</div>
                            <div style={{ fontSize: 11 }}>Uploading file → executing {testConfig?.engine ?? 'engine'} → collecting diagnostics</div>
                          </div>
                        </div>
                      )}

                      {testResult && !testRunning && (
                        <>
                          {/* Summary bar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 6, textTransform: 'uppercase' as const, color: testResult.status === 'success' ? C.ok : C.fail, background: testResult.status === 'success' ? `${C.ok}15` : `${C.fail}15`, border: `1px solid ${testResult.status === 'success' ? C.ok : C.fail}44` }}>
                              {testResult.status === 'success' ? '✓ SUCCESS' : '✗ FAILED'}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>{fmtMs(testResult.totalMs)}</span>
                            {testResult.httpStatus && <span style={{ fontSize: 11, color: C.muted }}>HTTP {testResult.httpStatus}</span>}
                            {testResult.engine && <span style={{ fontSize: 11, color: C.accent }}>via {testResult.engine}</span>}
                          </div>

                          {/* Pipeline steps */}
                          <div style={{ marginBottom: 12 }}>
                            {testResult.steps.map((s, i) => <StepRow key={i} step={s} />)}
                          </div>

                          {/* Warnings */}
                          {testResult.warnings.length > 0 && (
                            <div style={{ marginBottom: 10, padding: '8px 12px', background: `${C.warn}0d`, border: `1px solid ${C.warn}33`, borderRadius: 7 }}>
                              {testResult.warnings.map((w, i) => <div key={i} style={{ fontSize: 11, color: C.warn }}>⚠ {w}</div>)}
                            </div>
                          )}

                          {/* Error */}
                          {testResult.error && (
                            <div style={{ padding: '10px 12px', background: `${C.fail}0d`, border: `1px solid ${C.fail}33`, borderRadius: 7, marginBottom: 10 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: C.fail, marginBottom: 4 }}>Error Details</div>
                              <div style={{ fontSize: 12, color: C.text }}>{testResult.error}</div>
                              {testResult.rawError && (
                                <details style={{ marginTop: 8 }}>
                                  <summary style={{ fontSize: 10, color: C.muted, cursor: 'pointer' }}>Stack trace ▾</summary>
                                  <pre style={{ fontSize: 10, color: C.muted, marginTop: 6, overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto', fontFamily: 'monospace' }}>{testResult.rawError}</pre>
                                </details>
                              )}
                            </div>
                          )}

                          {/* Metadata */}
                          {testResult.metadata && Object.keys(testResult.metadata).length > 2 && (
                            <div style={{ marginBottom: 12 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 6 }}>Metadata</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
                                {Object.entries(testResult.metadata).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'application/json').map(([k, v]) => (
                                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${C.border}44` }}>
                                    <span style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' as const }}>{k.replace(/_/g, ' ')}</span>
                                    <span style={{ fontSize: 10, color: C.text, fontWeight: 600 }}>{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Output */}
                          {testResult.output && (
                            <div style={{ padding: '10px 12px', background: `${C.ok}0a`, border: `1px solid ${C.ok}33`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
                              <div style={{ fontSize: 12 }}>
                                <span style={{ fontWeight: 600 }}>{testResult.output.filename}</span>
                                <span style={{ color: C.muted, marginLeft: 8 }}>{fmtBytes(testResult.output.sizeBytes)}</span>
                                <span style={{ color: C.muted, marginLeft: 8 }}>{testResult.output.contentType}</span>
                              </div>
                              <a href={`/api/files/${testResult.output.fileId}`} download={testResult.output.filename} style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: C.accent, padding: '5px 14px', borderRadius: 6, textDecoration: 'none' }}>
                                ↓ Download
                              </a>
                            </div>
                          )}

                          {/* Re-run */}
                          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                            <Btn onClick={handleRunTest} disabled={!testFile || testRunning} loading={testRunning} outline small>↺ Run Again</Btn>
                            <Btn onClick={() => setTestResult(null)} color={C.muted} outline small>✕ Clear</Btn>
                          </div>
                        </>
                      )}
                    </Card>
                  )}
                </div>

                {/* ── 4. Diagnostics ── */}
                <Card>
                  <SectionHeader icon="🔍">Diagnostics</SectionHeader>

                  {!diagResult && !diagRunning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Btn onClick={handleDiagnose} loading={diagRunning} outline>Run Diagnostics</Btn>
                      <span style={{ fontSize: 11, color: C.muted }}>Checks binaries, engine health, config, and test history for {tool.name}</span>
                    </div>
                  )}

                  {diagRunning && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${C.border}`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 12 }}>Inspecting {tool.name}…</span>
                    </div>
                  )}

                  {diagResult && !diagRunning && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                        <HealthBadge health={diagResult.health} />
                        {diagResult.engine && <span style={{ fontSize: 11, color: C.accent }}>⚙ {diagResult.engine}</span>}
                        <span style={{ fontSize: 11, color: C.muted }}>{diagResult.testCount} tests · {diagResult.failureCount} failures</span>
                        <Btn onClick={handleDiagnose} loading={diagRunning} color={C.muted} outline small>↺ Re-run</Btn>
                      </div>

                      {/* Binaries */}
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, marginBottom: 6 }}>Binaries / Dependencies</div>
                        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                          {Object.entries(diagResult.binaries).map(([bin, ver]) => (
                            <div key={bin} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: ver ? `${C.ok}08` : `${C.fail}08`, border: `1px solid ${ver ? C.ok : C.fail}22`, borderRadius: 6 }}>
                              <code style={{ fontSize: 11, color: C.text, fontFamily: 'monospace' }}>{bin}</code>
                              <span style={{ fontSize: 10, color: ver ? C.ok : C.fail, fontWeight: 600, maxWidth: '55%', textAlign: 'right' as const, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{ver ?? '✗ not found'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issues */}
                      {diagResult.issues.length > 0 && (
                        <div style={{ padding: '10px 12px', background: `${C.warn}0d`, border: `1px solid ${C.warn}33`, borderRadius: 8 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.warn, textTransform: 'uppercase' as const, marginBottom: 6 }}>Issues Found</div>
                          {diagResult.issues.map((issue, i) => <div key={i} style={{ fontSize: 11, color: C.text, marginBottom: 3 }}>⚠ {issue}</div>)}
                        </div>
                      )}

                      {/* Recommendation */}
                      <div style={{ padding: '8px 12px', background: `${C.accent}0a`, border: `1px solid ${C.accent}22`, borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: 'uppercase' as const, marginBottom: 4 }}>Recommendation</div>
                        <div style={{ fontSize: 12, color: C.text }}>{diagResult.recommendation}</div>
                      </div>

                      {/* Last runs */}
                      {diagResult.lastRun && (
                        <div style={{ fontSize: 11, color: C.muted }}>
                          Last test: <span style={{ color: diagResult.lastRun.status === 'success' ? C.ok : C.fail }}>{diagResult.lastRun.status}</span>
                          {' '}at {fmtTime(diagResult.lastRun.timestamp)} ({fmtMs(diagResult.lastRun.totalMs)})
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                {/* ── 5. Verify Fix ── */}
                <Card style={{ marginBottom: 8 }}>
                  <SectionHeader icon="✅">Verify Fix</SectionHeader>

                  {!tool.lastFailure && !verifyResult && (
                    <div style={{ fontSize: 12, color: C.muted, textAlign: 'center' as const, padding: '16px 0' }}>
                      No stored failures for <strong style={{ color: C.text }}>{tool.name}</strong> yet.
                      <br />
                      <span style={{ fontSize: 11 }}>Run a test above — if it fails, the full trace will be saved here for comparison after fixing.</span>
                    </div>
                  )}

                  {tool.lastFailure && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>

                      {/* Before: stored failure */}
                      <div style={{ padding: '12px 14px', background: `${C.fail}0a`, border: `1px solid ${C.fail}33`, borderRadius: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.fail, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>
                          ✗ Previous Failure · {fmtTime(tool.lastFailure.timestamp)}
                        </div>
                        {tool.lastFailure.fileInfo && (
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                            File: <span style={{ color: C.text, fontWeight: 600 }}>{tool.lastFailure.fileInfo.name}</span>
                            <span style={{ marginLeft: 6 }}>({fmtBytes(tool.lastFailure.fileInfo.size)})</span>
                          </div>
                        )}
                        {tool.lastFailure.error && (
                          <div style={{ fontSize: 11, color: C.fail, marginBottom: 8, padding: '6px 8px', background: `${C.fail}08`, borderRadius: 6 }}>
                            {tool.lastFailure.error}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase' as const, marginBottom: 4 }}>Pipeline at failure time</div>
                        {tool.lastFailure.steps?.map((s, i) => <StepRow key={i} step={s} />)}
                      </div>

                      {/* Upload + re-run */}
                      {!verifyResult && (
                        <div>
                          <div style={{ fontSize: 11, color: C.muted, marginBottom: 8 }}>
                            Upload the same problematic file (or a fixed version) to verify the issue is resolved:
                          </div>
                          <FileDropZone label="Upload file to verify" accept={fileAccept} file={verifyFile} onFile={setVerifyFile} />
                          <div style={{ marginTop: 10 }}>
                            <Btn onClick={handleVerifyFix} disabled={!verifyFile || verifyRunning} loading={verifyRunning} fullWidth big>
                              {verifyRunning ? 'Re-running with real backend…' : '✅ Re-run to Verify Fix'}
                            </Btn>
                          </div>
                        </div>
                      )}

                      {/* After: comparison */}
                      {verifyResult && (
                        <div>
                          <div style={{ padding: '12px 14px', background: verifyResult.status === 'success' ? `${C.ok}0a` : `${C.fail}0a`, border: `1px solid ${verifyResult.status === 'success' ? C.ok : C.fail}33`, borderRadius: 8 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: verifyResult.status === 'success' ? C.ok : C.fail, marginBottom: 10 }}>
                              {verifyResult.status === 'success'
                                ? '✅ Fixed Successfully — All Pipeline Steps Passed'
                                : '❌ Problem Still Exists — Issue Not Resolved'}
                            </div>
                            {verifyResult.steps.map((s, i) => <StepRow key={i} step={s} />)}
                            {verifyResult.error && (
                              <div style={{ marginTop: 8, fontSize: 11, color: C.fail, padding: '6px 8px', background: `${C.fail}08`, borderRadius: 6 }}>
                                {verifyResult.error}
                              </div>
                            )}
                          </div>
                          <div style={{ marginTop: 10, fontSize: 11, color: C.muted }}>
                            Comparison: <span style={{ color: C.fail }}>Before</span> → <span style={{ color: verifyResult.status === 'success' ? C.ok : C.fail }}>After</span>
                            {verifyResult.totalMs > 0 && ` · ran in ${fmtMs(verifyResult.totalMs)}`}
                          </div>
                          <div style={{ marginTop: 8 }}>
                            <Btn onClick={() => { setVerifyFile(null); setVerifyResult(null) }} color={C.muted} outline small>↺ Try Again</Btn>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
