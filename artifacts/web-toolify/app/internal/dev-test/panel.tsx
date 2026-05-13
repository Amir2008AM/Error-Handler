'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { TOOL_CONFIGS } from './tool-configs'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Step {
  name:       string
  status:     'ok' | 'fail' | 'skip' | 'warn' | 'pending'
  durationMs: number
  detail?:    string
}

interface OutputInfo {
  fileId:      string
  filename:    string
  contentType: string
  sizeBytes:   number
}

interface TestResult {
  tool?:       string
  toolLabel?:  string
  engine?:     string
  endpoint?:   string
  status:      'success' | 'failed'
  httpStatus?: number
  steps:       Step[]
  warnings:    string[]
  metadata?:   Record<string, string | number | boolean>
  output?:     OutputInfo
  error?:      string
  rawError?:   string
  totalMs:     number
}

// ── Colours & helpers ─────────────────────────────────────────────────────────

const C = {
  bg:       '#0f1117',
  card:     '#161920',
  border:   '#242736',
  text:     '#e2e8f0',
  muted:    '#6b7280',
  accent:   '#6366f1',
  ok:       '#22c55e',
  fail:     '#ef4444',
  warn:     '#f59e0b',
  skip:     '#4b5563',
  pending:  '#94a3b8',
}

const stepColor: Record<Step['status'], string> = {
  ok: C.ok, fail: C.fail, warn: C.warn, skip: C.skip, pending: C.pending,
}
const stepIcon: Record<Step['status'], string> = {
  ok: '✓', fail: '✗', warn: '⚠', skip: '–', pending: '·',
}

function fmtBytes(b: number): string {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(2)} MB`
}
function fmtMs(ms: number): string {
  if (!ms) return '—'
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase',
      letterSpacing: '0.07em', marginBottom: 12, paddingBottom: 8,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: 'success' | 'failed' }) {
  const ok = status === 'success'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
      color: ok ? C.ok : C.fail,
      background: ok ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
      border: `1px solid ${ok ? C.ok : C.fail}44`,
      letterSpacing: '0.05em', textTransform: 'uppercase',
    }}>
      {ok ? '✓ SUCCESS' : '✗ FAILED'}
    </span>
  )
}

function StepRow({ step }: { step: Step }) {
  const color = stepColor[step.status]
  const icon  = stepIcon[step.status]
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '7px 0', borderBottom: `1px solid ${C.border}22`,
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: 4, display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: `${color}1a`, color, fontWeight: 700,
        fontSize: 11, flexShrink: 0, marginTop: 1,
      }}>
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <code style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
            {step.name}
          </code>
          {step.durationMs > 0 && (
            <span style={{ fontSize: 10, color: C.muted }}>{fmtMs(step.durationMs)}</span>
          )}
        </div>
        {step.detail && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2, wordBreak: 'break-word' }}>
            {step.detail}
          </div>
        )}
      </div>
    </div>
  )
}

function MetaTable({ meta }: { meta: Record<string, string | number | boolean> }) {
  const rows = Object.entries(meta).filter(([, v]) => v !== undefined && v !== null && v !== '')
  if (!rows.length) return null
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
      {rows.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.border}44` }}>
          <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {k.replace(/_/g, ' ')}
          </span>
          <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>
            {typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

function OutputPreview({ output }: { output: OutputInfo }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const isImage = output.contentType.startsWith('image/')
  const isText  = output.contentType.startsWith('text/')
  const downloadUrl = `/api/files/${output.fileId}`

  useEffect(() => {
    if (isImage) {
      fetch(downloadUrl)
        .then(r => r.blob())
        .then(blob => setPreviewUrl(URL.createObjectURL(blob)))
        .catch(() => {})
    } else if (isText && output.sizeBytes < 50_000) {
      fetch(downloadUrl)
        .then(r => r.text())
        .then(t => setTextContent(t))
        .catch(() => {})
    }
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output.fileId])

  return (
    <div>
      <SectionTitle>Output Preview</SectionTitle>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: C.text }}>
          <strong>{output.filename}</strong>
          <span style={{ color: C.muted, marginLeft: 8 }}>{fmtBytes(output.sizeBytes)}</span>
          <span style={{ color: C.muted, marginLeft: 8 }}>{output.contentType}</span>
        </div>
        <a
          href={downloadUrl}
          download={output.filename}
          style={{
            padding: '6px 16px', borderRadius: 8, background: C.accent,
            color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          ↓ Download
        </a>
      </div>

      {isImage && previewUrl && (
        <div style={{
          border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden',
          maxHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0a0c10',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Output preview" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }} />
        </div>
      )}

      {isText && textContent !== null && (
        <pre style={{
          background: '#0a0c10', border: `1px solid ${C.border}`, borderRadius: 8,
          padding: '12px 14px', fontSize: 11, color: '#a5f3fc', overflowX: 'auto',
          maxHeight: 300, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          fontFamily: 'monospace',
        }}>
          {textContent.slice(0, 5000)}{textContent.length > 5000 ? '\n… (truncated)' : ''}
        </pre>
      )}
    </div>
  )
}

// ── FileDropZone ──────────────────────────────────────────────────────────────

function FileDropZone({
  label, accept, file, onFile,
}: { label: string; accept: string; file: File | null; onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }, [onFile])

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${dragging ? C.accent : (file ? C.ok : C.border)}`,
        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
        background: dragging ? `${C.accent}0a` : 'transparent',
        transition: 'border-color 0.2s, background 0.2s',
        textAlign: 'center',
      }}
    >
      <input
        ref={inputRef} type="file" accept={accept} style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />
      {file ? (
        <div>
          <div style={{ fontSize: 13, color: C.ok, fontWeight: 600 }}>✓ {file.name}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{fmtBytes(file.size)} — click to change</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
          <div style={{ fontSize: 11, color: C.skip, marginTop: 2 }}>click or drag & drop</div>
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export default function DevTestPanel() {
  const [selectedTool, setSelectedTool] = useState('')
  const [file,  setFile]  = useState<File | null>(null)
  const [file2, setFile2] = useState<File | null>(null)
  const [params, setParams] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const config = selectedTool ? TOOL_CONFIGS[selectedTool] : null

  // Reset state when tool changes
  const handleToolChange = (id: string) => {
    setSelectedTool(id)
    setFile(null); setFile2(null)
    setParams({})
    setResult(null)
    // Pre-populate defaults
    const cfg = TOOL_CONFIGS[id]
    if (cfg?.params) {
      const defaults: Record<string, string> = {}
      for (const p of cfg.params) {
        if (p.default !== undefined) defaults[p.name] = p.default
      }
      setParams(defaults)
    }
  }

  const handleParamChange = (name: string, value: string) => {
    setParams(prev => ({ ...prev, [name]: value }))
  }

  const fileAccept = config
    ? config.fileType === 'pdf' ? '.pdf'
    : config.fileType === 'image' ? '.png,.jpg,.jpeg,.gif,.webp,.bmp,.tiff'
    : '.docx,.doc,.xlsx,.xls,.pptx,.ppt'
    : '*'

  const canRun = !!selectedTool && !!file && !running

  const runTest = async () => {
    if (!file || !selectedTool || !config) return
    setRunning(true)
    setResult(null)

    try {
      const form = new FormData()
      form.append('tool', selectedTool)
      form.append('file', file, file.name)
      if (file2) form.append('file2', file2, file2.name)
      form.append('params', JSON.stringify(params))

      const res = await fetch('/api/internal/dev-test', { method: 'POST', body: form })
      const data = await res.json() as TestResult
      setResult(data)

      // Scroll to results
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (err) {
      setResult({
        status: 'failed', steps: [], warnings: [],
        error: err instanceof Error ? err.message : 'Network error',
        totalMs: 0,
      })
    } finally {
      setRunning(false)
    }
  }

  // Group tools by category
  const categories: Record<string, string[]> = {}
  for (const [id, cfg] of Object.entries(TOOL_CONFIGS)) {
    if (!categories[cfg.category]) categories[cfg.category] = []
    categories[cfg.category].push(id)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 7,
    background: '#0f1117', border: `1px solid ${C.border}`,
    color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box',
  }

  const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '28px 24px',
    }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.warn,
                background: `${C.warn}1a`, border: `1px solid ${C.warn}44`,
                borderRadius: 5, padding: '2px 8px', letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                ⚙ Developer Only
              </span>
              <span style={{ fontSize: 10, color: C.muted }}>hidden route · not indexed</span>
            </div>
            <h1 style={{ margin: '6px 0 2px', fontSize: 22, fontWeight: 800, color: C.text }}>
              Tool Test Mode
            </h1>
            <p style={{ margin: 0, fontSize: 12, color: C.muted }}>
              Upload a real file, run any tool, and inspect the full pipeline diagnostics.
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <a
              href="/internal/system-monitor-v2"
              style={{ fontSize: 12, color: C.accent, textDecoration: 'none', fontWeight: 600 }}
            >
              ← System Monitor
            </a>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left Panel: Controls ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Tool Selector */}
          <Card>
            <SectionTitle>Select Tool</SectionTitle>
            <select
              value={selectedTool}
              onChange={(e) => handleToolChange(e.target.value)}
              style={selectStyle}
            >
              <option value="">— choose a tool —</option>
              {Object.entries(categories).map(([cat, ids]) => (
                <optgroup key={cat} label={cat}>
                  {ids.map((id) => (
                    <option key={id} value={id}>{TOOL_CONFIGS[id].label}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            {config && (
              <div style={{ marginTop: 12, padding: '8px 10px', background: `${C.accent}0d`, borderRadius: 7, border: `1px solid ${C.accent}22` }}>
                <div style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>
                  {config.engine}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  {config.endpoint}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {config.steps.map((s) => (
                    <code key={s} style={{
                      fontSize: 9, color: C.muted, background: `${C.border}88`,
                      padding: '2px 5px', borderRadius: 4, letterSpacing: '0.04em',
                    }}>{s}</code>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* File Upload */}
          {config && (
            <Card>
              <SectionTitle>Upload File</SectionTitle>
              <FileDropZone
                label={`Upload ${config.fileType === 'pdf' ? 'PDF' : config.fileType === 'image' ? 'Image' : 'Document'}`}
                accept={fileAccept}
                file={file}
                onFile={setFile}
              />
              {config.multiFile && (
                <div style={{ marginTop: 12 }}>
                  <Label>Second File (required for merge)</Label>
                  <FileDropZone
                    label="Upload second PDF"
                    accept=".pdf"
                    file={file2}
                    onFile={setFile2}
                  />
                </div>
              )}
            </Card>
          )}

          {/* Params */}
          {config?.params && config.params.length > 0 && (
            <Card>
              <SectionTitle>Parameters</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {config.params.map((p) => (
                  <div key={p.name}>
                    <Label>{p.label ?? p.name}{p.required ? ' *' : ''}</Label>
                    {p.type === 'select' ? (
                      <select
                        value={params[p.name] ?? p.default ?? ''}
                        onChange={(e) => handleParamChange(p.name, e.target.value)}
                        style={selectStyle}
                      >
                        {p.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={p.type === 'number' ? 'text' : 'text'}
                        value={params[p.name] ?? p.default ?? ''}
                        onChange={(e) => handleParamChange(p.name, e.target.value)}
                        placeholder={p.placeholder ?? ''}
                        style={inputStyle}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Run Button */}
          {config && (
            <button
              onClick={runTest}
              disabled={!canRun}
              style={{
                padding: '13px 20px', borderRadius: 10, border: 'none',
                background: canRun ? C.accent : C.border,
                color: canRun ? '#fff' : C.muted,
                fontSize: 14, fontWeight: 700, cursor: canRun ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {running ? (
                <>
                  <span style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: `2px solid ${C.muted}`, borderTopColor: '#fff',
                    display: 'inline-block', animation: 'spin 0.7s linear infinite',
                  }} />
                  Running test…
                </>
              ) : (
                <>▶ Run Test</>
              )}
            </button>
          )}

          {!selectedTool && (
            <div style={{
              padding: '16px', borderRadius: 10, border: `1px dashed ${C.border}`,
              textAlign: 'center', color: C.muted, fontSize: 12,
            }}>
              Select a tool above to begin
            </div>
          )}
        </div>

        {/* ── Right Panel: Results ── */}
        <div ref={resultRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {!result && !running && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 320, border: `1px dashed ${C.border}`, borderRadius: 12, gap: 12,
              color: C.muted,
            }}>
              <div style={{ fontSize: 36 }}>🔬</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No test run yet</div>
              <div style={{ fontSize: 12 }}>Select a tool, upload a file, and click Run Test</div>
            </div>
          )}

          {running && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 320, border: `1px dashed ${C.accent}55`, borderRadius: 12, gap: 14, color: C.muted,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                border: `3px solid ${C.border}`, borderTopColor: C.accent,
                animation: 'spin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: C.accent }}>Running test…</div>
              <div style={{ fontSize: 11 }}>
                Uploading file → running {config?.label ?? 'tool'} → collecting diagnostics
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Summary Header */}
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                      {result.toolLabel ?? result.tool ?? 'Test'}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      {result.engine && <span style={{ color: C.accent }}>{result.engine}</span>}
                      {result.endpoint && <span style={{ marginLeft: 8 }}>{result.endpoint}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusBadge status={result.status} />
                    <span style={{ fontSize: 13, color: C.muted, fontWeight: 600 }}>
                      {fmtMs(result.totalMs)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Pipeline Steps */}
              <Card>
                <SectionTitle>Pipeline Steps</SectionTitle>
                {result.steps.length === 0 ? (
                  <div style={{ fontSize: 12, color: C.muted }}>No steps recorded.</div>
                ) : (
                  <div>
                    {result.steps.map((step, i) => (
                      <StepRow key={i} step={step} />
                    ))}
                  </div>
                )}
              </Card>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <Card style={{ border: `1px solid ${C.warn}33` }}>
                  <SectionTitle>⚠ Warnings</SectionTitle>
                  {result.warnings.map((w, i) => (
                    <div key={i} style={{
                      fontSize: 12, color: C.warn, padding: '5px 0',
                      borderBottom: i < result.warnings.length - 1 ? `1px solid ${C.border}44` : 'none',
                    }}>
                      {w}
                    </div>
                  ))}
                </Card>
              )}

              {/* Error */}
              {result.error && (
                <Card style={{ border: `1px solid ${C.fail}33` }}>
                  <SectionTitle>✗ Error Details</SectionTitle>
                  <div style={{ fontSize: 13, color: C.fail, fontWeight: 600, marginBottom: 8 }}>
                    {result.error}
                  </div>
                  {result.rawError && (
                    <details>
                      <summary style={{ fontSize: 11, color: C.muted, cursor: 'pointer', userSelect: 'none' }}>
                        Stack trace
                      </summary>
                      <pre style={{
                        marginTop: 8, padding: '10px 12px', background: '#0a0c10',
                        borderRadius: 7, fontSize: 10, color: '#fca5a5', overflowX: 'auto',
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace',
                        maxHeight: 200, overflowY: 'auto',
                      }}>
                        {result.rawError}
                      </pre>
                    </details>
                  )}
                </Card>
              )}

              {/* Metadata */}
              {result.metadata && Object.keys(result.metadata).length > 0 && (
                <Card>
                  <SectionTitle>Diagnostics &amp; Metadata</SectionTitle>
                  <MetaTable meta={result.metadata} />
                </Card>
              )}

              {/* Output / Preview */}
              {result.output && (
                <Card>
                  <OutputPreview output={result.output} />
                </Card>
              )}

              {/* Re-run button */}
              <button
                onClick={runTest}
                disabled={!canRun}
                style={{
                  padding: '10px 20px', borderRadius: 8, border: `1px solid ${C.border}`,
                  background: 'transparent', color: canRun ? C.muted : C.skip,
                  fontSize: 12, fontWeight: 600, cursor: canRun ? 'pointer' : 'not-allowed',
                  alignSelf: 'flex-start',
                }}
              >
                ↺ Re-run Test
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1a1d27; color: #e2e8f0; }
        select optgroup { background: #1a1d27; color: #6366f1; font-weight: 700; }
      `}</style>
    </div>
  )
}
