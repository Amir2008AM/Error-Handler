/**
 * lib/tool-registry.ts
 *
 * Central production registry for every tool.
 * Extends the UI-facing tools list (lib/tools.ts) with engineering metadata:
 *   - which engine drives it
 *   - which concurrency guard protects it
 *   - which rate-limit tier applies
 *   - which BullMQ worker group handles it (when queued)
 *   - per-tool live health (last success, last error)
 *
 * All route handlers import from here instead of duplicating this knowledge.
 */

export type RateLimitTier = 'heavy' | 'medium' | 'light'
export type GuardName = 'libreoffice' | 'ghostscript' | 'python' | 'pdfjs' | 'none'
export type EngineLabel =
  | 'libreoffice'
  | 'ghostscript'
  | 'qpdf'
  | 'pdf-lib'
  | 'pdfjs'
  | 'sharp'
  | 'tesseract'
  | 'python-reportlab'
  | 'node-canvas'
  | 'hybrid'
  | 'pdf2docx'
  | 'mammoth+wkhtmltopdf'
  | 'wkhtmltopdf'

export type WorkerGroup = 'pdf-fast' | 'pdf-heavy' | 'image' | 'document' | 'direct'

export interface ToolMeta {
  /** Unique slug used in URLs and internal references */
  slug: string
  /** Human-readable name */
  name: string
  /** Primary processing engine */
  engine: EngineLabel
  /** Concurrency guard name ('none' = unguarded, typically fast in-process ops) */
  guard: GuardName
  /** Rate-limit tier applied on the direct route */
  rateTier: RateLimitTier
  /** BullMQ worker group when submitted via /api/jobs/create */
  workerGroup: WorkerGroup
  /** Route maxDuration in seconds (Next.js serverless timeout) */
  maxDurationSec: number
  /** Expected p95 processing time in seconds (empirical) */
  p95Sec: number
  /** True if this route invokes an external process (subprocess spawn) */
  spawnsProcess: boolean
}

// ── Registry ─────────────────────────────────────────────────────────────────

const _registry: ToolMeta[] = [
  // ── PDF-FAST: quick in-process ops — typically <2 s ───────────────────────
  { slug: 'rotate-pdf',      name: 'Rotate PDF',        engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: false },
  { slug: 'watermark-pdf',   name: 'Watermark PDF',     engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 8,   spawnsProcess: false },
  { slug: 'protect-pdf',     name: 'Protect PDF',       engine: 'qpdf',             guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: true  },
  { slug: 'unlock-pdf',      name: 'Unlock PDF',        engine: 'qpdf',             guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: true  },
  { slug: 'sign-pdf',        name: 'Sign PDF',          engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 8,   spawnsProcess: false },
  { slug: 'delete-pages',    name: 'Delete Pages',      engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: false },
  { slug: 'organize-pdf',    name: 'Organize PDF',      engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: false },
  { slug: 'page-numbers',    name: 'Page Numbers',      engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-fast', maxDurationSec: 60,  p95Sec: 8,   spawnsProcess: false },

  // ── PDF-HEAVY: CPU-intensive or multi-step ops — 2 s to 3 min ─────────────
  { slug: 'merge-pdf',       name: 'Merge PDF',         engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-heavy', maxDurationSec: 120, p95Sec: 15,  spawnsProcess: false },
  { slug: 'split-pdf',       name: 'Split PDF',         engine: 'pdf-lib',          guard: 'none',         rateTier: 'light',  workerGroup: 'pdf-heavy', maxDurationSec: 120, p95Sec: 10,  spawnsProcess: false },
  { slug: 'repair-pdf',      name: 'Repair PDF',        engine: 'ghostscript',      guard: 'ghostscript',  rateTier: 'medium', workerGroup: 'pdf-heavy', maxDurationSec: 120, p95Sec: 20,  spawnsProcess: true  },
  { slug: 'compress-pdf',    name: 'Compress PDF',      engine: 'ghostscript',      guard: 'ghostscript',  rateTier: 'medium', workerGroup: 'pdf-heavy', maxDurationSec: 120, p95Sec: 60,  spawnsProcess: true  },
  { slug: 'pdf-to-jpg',      name: 'PDF to JPG',        engine: 'node-canvas',      guard: 'pdfjs',        rateTier: 'medium', workerGroup: 'pdf-heavy', maxDurationSec: 300, p95Sec: 90,  spawnsProcess: false },
  { slug: 'pdf-to-text',     name: 'PDF to Text',       engine: 'pdfjs',            guard: 'pdfjs',        rateTier: 'medium', workerGroup: 'pdf-heavy', maxDurationSec: 60,  p95Sec: 15,  spawnsProcess: false },
  { slug: 'pdf-to-excel',    name: 'PDF to Excel',      engine: 'python-reportlab', guard: 'python',       rateTier: 'medium', workerGroup: 'pdf-heavy', maxDurationSec: 180, p95Sec: 60,  spawnsProcess: true  },
  { slug: 'pdf-to-word',     name: 'PDF to Word',       engine: 'pdf2docx',         guard: 'libreoffice',  rateTier: 'heavy',  workerGroup: 'pdf-heavy', maxDurationSec: 300, p95Sec: 60,  spawnsProcess: true  },
  { slug: 'pdf-to-ppt',      name: 'PDF to PPT',        engine: 'libreoffice',      guard: 'libreoffice',  rateTier: 'heavy',  workerGroup: 'document', maxDurationSec: 120, p95Sec: 60,  spawnsProcess: true  },

  // ── Document → PDF (LibreOffice) ──────────────────────────────────────────
  { slug: 'word-to-pdf',     name: 'Word to PDF',       engine: 'libreoffice',      guard: 'libreoffice',  rateTier: 'heavy',  workerGroup: 'document', maxDurationSec: 120, p95Sec: 45,  spawnsProcess: true  },
  { slug: 'ppt-to-pdf',      name: 'PPT to PDF',        engine: 'libreoffice',      guard: 'libreoffice',  rateTier: 'heavy',  workerGroup: 'document', maxDurationSec: 120, p95Sec: 90,  spawnsProcess: true  },
  { slug: 'html-to-pdf',     name: 'HTML to PDF',       engine: 'libreoffice',      guard: 'libreoffice',  rateTier: 'heavy',  workerGroup: 'document', maxDurationSec: 120, p95Sec: 45,  spawnsProcess: true  },

  // ── Excel → PDF (Python ReportLab) ───────────────────────────────────────
  { slug: 'excel-to-pdf',    name: 'Excel to PDF',      engine: 'python-reportlab', guard: 'python',       rateTier: 'heavy',  workerGroup: 'document', maxDurationSec: 120, p95Sec: 45,  spawnsProcess: true  },


  // ── Image tools (Sharp — fast, in-process) ────────────────────────────────
  { slug: 'compress-image',  name: 'Compress Image',    engine: 'sharp',            guard: 'none',         rateTier: 'light',  workerGroup: 'image',    maxDurationSec: 60,  p95Sec: 10,  spawnsProcess: false },
  { slug: 'resize-image',    name: 'Resize Image',      engine: 'sharp',            guard: 'none',         rateTier: 'light',  workerGroup: 'image',    maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: false },
  { slug: 'convert-image',   name: 'Convert Image',     engine: 'sharp',            guard: 'none',         rateTier: 'light',  workerGroup: 'image',    maxDurationSec: 60,  p95Sec: 5,   spawnsProcess: false },
  { slug: 'crop-image',      name: 'Crop Image',        engine: 'sharp',            guard: 'none',         rateTier: 'light',  workerGroup: 'image',    maxDurationSec: 60,  p95Sec: 3,   spawnsProcess: false },
  { slug: 'image-to-pdf',    name: 'Image to PDF',      engine: 'sharp',            guard: 'none',         rateTier: 'light',  workerGroup: 'image',    maxDurationSec: 60,  p95Sec: 10,  spawnsProcess: false },
]

// ── Lookup helpers ────────────────────────────────────────────────────────────

const _bySlug = new Map<string, ToolMeta>(_registry.map((t) => [t.slug, t]))

/** Get metadata for a tool by slug. Returns undefined for unknown slugs. */
export function getToolMeta(slug: string): ToolMeta | undefined {
  return _bySlug.get(slug)
}

/** Get all registered tools. */
export function getAllToolMeta(): ToolMeta[] {
  return _registry
}

// ── Per-tool live health tracking ─────────────────────────────────────────────

export interface ToolHealthEvent {
  ts: number
  success: boolean
  durationMs: number
  fileSizeB?: number
  error?: string
  engine: EngineLabel
  fallbackUsed?: boolean
}

const _health = new Map<string, ToolHealthEvent[]>()
const MAX_EVENTS_PER_TOOL = 20

/** Record a completed (success or failure) tool invocation. */
export function recordToolEvent(slug: string, event: ToolHealthEvent): void {
  let events = _health.get(slug)
  if (!events) {
    events = []
    _health.set(slug, events)
  }
  events.push(event)
  if (events.length > MAX_EVENTS_PER_TOOL) events.shift()
}

export interface ToolHealthSummary {
  slug: string
  totalCalls: number
  successRate: number
  lastSuccess: number | null
  lastFailure: number | null
  lastError: string | null
  avgDurationMs: number
  p95DurationMs: number
}

/** Get aggregated health summary for a tool. */
export function getToolHealthSummary(slug: string): ToolHealthSummary {
  const events = _health.get(slug) ?? []
  const total = events.length
  const successes = events.filter((e) => e.success)
  const failures  = events.filter((e) => !e.success)
  const durations = events.map((e) => e.durationMs).sort((a, b) => a - b)

  const lastSuccess = successes.length ? successes[successes.length - 1].ts : null
  const lastFailure = failures.length  ? failures[failures.length - 1].ts  : null
  const lastError   = failures.length  ? (failures[failures.length - 1].error ?? null) : null
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0
  const p95DurationMs = durations.length
    ? durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1]
    : 0

  return {
    slug,
    totalCalls: total,
    successRate: total > 0 ? parseFloat(((successes.length / total) * 100).toFixed(1)) : 100,
    lastSuccess,
    lastFailure,
    lastError,
    avgDurationMs,
    p95DurationMs,
  }
}

/** Get health summaries for all tools that have been called at least once. */
export function getAllToolHealthSummaries(): ToolHealthSummary[] {
  return [..._health.keys()].map(getToolHealthSummary)
}
