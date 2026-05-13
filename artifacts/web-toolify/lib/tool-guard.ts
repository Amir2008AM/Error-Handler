/**
 * lib/tool-guard.ts  — server-only
 *
 * Singleton managing:
 *  1. Per-tool enabled/disabled state  (file-persisted at /tmp/toolify-disabled.json)
 *  2. In-memory test history           (ephemeral, survives hot-reload)
 */
import { readFileSync, writeFileSync } from 'node:fs'

const DISABLED_FILE = '/tmp/toolify-disabled.json'

// ── Enabled / Disabled ────────────────────────────────────────────────────────

const _disabled = new Set<string>()
let _loaded = false

function loadOnce(): void {
  if (_loaded) return
  _loaded = true
  try {
    const arr: string[] = JSON.parse(readFileSync(DISABLED_FILE, 'utf-8'))
    arr.forEach(t => _disabled.add(t))
  } catch { /* no file → all tools enabled */ }
}

function persist(): void {
  try { writeFileSync(DISABLED_FILE, JSON.stringify([..._disabled])) } catch { /* ignore */ }
}

export function isToolEnabled(slug: string): boolean {
  loadOnce()
  return !_disabled.has(slug)
}

export function setToolEnabled(slug: string, enabled: boolean): void {
  loadOnce()
  if (enabled) _disabled.delete(slug)
  else         _disabled.add(slug)
  persist()
}

export function getDisabledTools(): string[] {
  loadOnce()
  return [..._disabled]
}

/**
 * Call at the top of each tool POST handler.
 * Returns a 503 Response when the tool is disabled, null otherwise.
 */
export function getToolGuardResponse(slug: string): Response | null {
  if (isToolEnabled(slug)) return null
  return Response.json(
    {
      error:    'This tool is temporarily unavailable. Our team is working on a fix.',
      disabled: true,
      tool:     slug,
    },
    { status: 503 }
  )
}

// ── Test-run History ──────────────────────────────────────────────────────────

export interface StoredStep {
  name:       string
  status:     string
  durationMs: number
  detail?:    string
}

export interface StoredTestRun {
  id:        string
  toolSlug:  string
  timestamp: number
  status:    'success' | 'failed'
  steps:     StoredStep[]
  warnings:  string[]
  error?:    string
  totalMs:   number
  fileInfo:  { name: string; size: number }
  metadata?: Record<string, unknown>
}

// Map: toolSlug → last 10 runs (newest first)
const _history = new Map<string, StoredTestRun[]>()

export function storeTestRun(run: StoredTestRun): void {
  const list = _history.get(run.toolSlug) ?? []
  list.unshift(run)
  _history.set(run.toolSlug, list.slice(0, 10))
}

export function getToolHistory(slug: string): StoredTestRun[] {
  return _history.get(slug) ?? []
}

export function getLastFailure(slug: string): StoredTestRun | undefined {
  return _history.get(slug)?.find(r => r.status === 'failed')
}

export function getAllHistorySummary(): Record<string, {
  lastRun?:     StoredTestRun
  lastFailure?: StoredTestRun
  total:        number
  failures:     number
}> {
  const out: Record<string, { lastRun?: StoredTestRun; lastFailure?: StoredTestRun; total: number; failures: number }> = {}
  for (const [slug, runs] of _history) {
    out[slug] = {
      lastRun:     runs[0],
      lastFailure: runs.find(r => r.status === 'failed'),
      total:       runs.length,
      failures:    runs.filter(r => r.status === 'failed').length,
    }
  }
  return out
}

/**
 * Convenience helper: called inline in the dev-test route before each return.
 * Stores the result payload without requiring a separate step.
 */
export function storeTestRunResult(
  toolId:   string,
  fileName: string,
  fileSize: number,
  result: {
    status:    string
    steps:     StoredStep[]
    warnings:  string[]
    error?:    string
    totalMs:   number
    metadata?: Record<string, unknown>
  }
): void {
  if (!toolId) return
  storeTestRun({
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    toolSlug:  toolId,
    timestamp: Date.now(),
    status:    result.status === 'success' ? 'success' : 'failed',
    steps:     result.steps,
    warnings:  result.warnings,
    error:     result.error,
    totalMs:   result.totalMs,
    fileInfo:  { name: fileName, size: fileSize },
    metadata:  result.metadata,
  })
}
