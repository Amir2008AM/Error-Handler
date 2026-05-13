/**
 * POST /api/internal/dev-test
 *
 * Developer-only test harness — proxies a real file through any tool endpoint
 * and returns step-by-step pipeline diagnostics.
 *
 * Protected: returns 404 for unauthorized requests (same as all internal routes).
 * Auth: ops_session_v2 cookie OR Authorization: Bearer <token> OR ?key=...
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import { verifyOpsV2Session } from '@/app/api/internal/auth/route'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { getTempStorage } from '@/lib/storage'
import { TOOL_CONFIGS } from '@/app/internal/dev-test/tool-configs'

export { TOOL_CONFIGS }

export const runtime  = 'nodejs'
export const maxDuration = 120

// ── Step Tracker ──────────────────────────────────────────────────────────────

interface Step {
  name:      string
  status:    'ok' | 'fail' | 'skip' | 'warn' | 'pending'
  durationMs: number
  detail?:   string
}

class StepTracker {
  steps: Step[] = []
  private _start = 0

  begin(name: string): void {
    this._start = Date.now()
    this.steps.push({ name, status: 'pending', durationMs: 0 })
  }

  end(status: 'ok' | 'fail' | 'skip' | 'warn', detail?: string): void {
    const last = this.steps[this.steps.length - 1]
    if (last) {
      last.status    = status
      last.durationMs = Date.now() - this._start
      if (detail) last.detail = detail
    }
  }

  skip(name: string, detail?: string): void {
    this.steps.push({ name, status: 'skip', durationMs: 0, detail })
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guessMime(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    gif: 'image/gif', webp: 'image/webp', tiff: 'image/tiff', bmp: 'image/bmp',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
  }
  return map[ext] ?? 'application/octet-stream'
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }

  const totalStart = Date.now()
  const tracker    = new StepTracker()
  const warnings:  string[] = []

  let toolId   = ''
  let cleanup  = async () => {}
  let filePath = ''
  let fileName = ''
  let fileSize = 0
  let file2Path = ''
  let file2Name = ''

  try {
    // ── Parse multipart ────────────────────────────────────────────────────
    tracker.begin('UPLOAD')
    const { fields, files, cleanup: _cleanup } =
      await streamUpload(request).catch((err) => { throw Object.assign(err, { _step: 'UPLOAD' }) })
    cleanup = _cleanup

    toolId  = fields['tool'] ?? ''
    const rawParams = fields['params'] ? JSON.parse(fields['params']) : {}

    const mainFile  = files.find((f) => f.fieldname === 'file')
    const file2     = files.find((f) => f.fieldname === 'file2')

    if (!mainFile) {
      tracker.end('fail', 'No file uploaded')
      return NextResponse.json({ error: 'No file uploaded', steps: tracker.steps }, { status: 400 })
    }

    filePath = mainFile.path
    fileName = mainFile.filename || 'upload'
    fileSize = mainFile.size

    if (file2) {
      file2Path = file2.path
      file2Name = file2.filename || 'upload2'
    }

    tracker.end('ok', `${fileName} — ${(fileSize / 1024).toFixed(1)} KB`)

    // ── Look up tool config ────────────────────────────────────────────────
    if (!toolId) {
      return NextResponse.json({ error: 'Missing tool field', steps: tracker.steps }, { status: 400 })
    }
    const config = TOOL_CONFIGS[toolId]
    if (!config) {
      return NextResponse.json({ error: `Unknown tool: ${toolId}`, steps: tracker.steps }, { status: 400 })
    }

    // Mark expected steps as pending so the client knows the full pipeline
    const definedSteps = new Set(config.steps)

    // ── VALIDATION ─────────────────────────────────────────────────────────
    if (definedSteps.has('VALIDATION') && !config.skipValidation) {
      tracker.begin('VALIDATION')
      const validErr = await validateStreamedFile(mainFile, config.fileType as 'pdf' | 'image')
      if (validErr) {
        tracker.end('fail', validErr)
        return NextResponse.json({
          tool: toolId, toolLabel: config.label, engine: config.engine,
          endpoint: config.endpoint, status: 'failed',
          steps: tracker.steps, warnings, error: validErr,
          totalMs: Date.now() - totalStart,
        })
      }
      tracker.end('ok', `Type confirmed: ${config.fileType}`)
    } else if (!config.skipValidation && !definedSteps.has('VALIDATION')) {
      // skip
    }

    // ── PREFLIGHT ──────────────────────────────────────────────────────────
    if (definedSteps.has('PREFLIGHT')) {
      tracker.begin('PREFLIGHT')

      const missingRequired = (config.params ?? [])
        .filter((p) => p.required && !rawParams[p.name])
        .map((p) => p.label ?? p.name)

      if (missingRequired.length > 0) {
        tracker.end('fail', `Missing required params: ${missingRequired.join(', ')}`)
        return NextResponse.json({
          tool: toolId, toolLabel: config.label, engine: config.engine,
          endpoint: config.endpoint, status: 'failed',
          steps: tracker.steps, warnings,
          error: `Missing required params: ${missingRequired.join(', ')}`,
          totalMs: Date.now() - totalStart,
        })
      }

      if (config.multiFile && !file2Path) {
        warnings.push('Second file not provided — merge-pdf requires 2 files')
      }

      const sizeWarnMB = 50
      if (fileSize > sizeWarnMB * 1024 * 1024) {
        warnings.push(`File is large (${(fileSize / 1024 / 1024).toFixed(1)} MB) — processing may be slow`)
      }

      tracker.end('ok', `Params OK${warnings.length ? ` — ${warnings.length} warning(s)` : ''}`)
    }

    // ── Remaining defined steps: mark as pending until PROCESSING resolves
    const proxyStepNames = config.steps.filter(
      (s) => !['UPLOAD', 'VALIDATION', 'PREFLIGHT'].includes(s)
    )

    // ── Build proxy FormData ───────────────────────────────────────────────
    const processingStep = proxyStepNames[0] ?? 'PROCESSING'
    tracker.begin(processingStep)

    const proxyForm = new FormData()

    // Main file
    const fileBuffer = await readFile(filePath)
    const blob = new Blob([fileBuffer], { type: guessMime(fileName) })
    proxyForm.append(config.fileField, blob, fileName)

    // Second file (merge-pdf)
    if (config.multiFile && file2Path) {
      const buf2 = await readFile(file2Path)
      const b2   = new Blob([buf2], { type: guessMime(file2Name) })
      proxyForm.append(config.fileField2 ?? 'pdf_1', b2, file2Name)
    }

    // Extra params (merge defaults + user overrides)
    const effectiveParams: Record<string, string> = {}
    for (const p of config.params ?? []) {
      effectiveParams[p.name] = rawParams[p.name] ?? p.default ?? ''
    }
    for (const [k, v] of Object.entries(rawParams)) {
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        effectiveParams[k] = String(v)
      }
    }
    for (const [k, v] of Object.entries(effectiveParams)) {
      if (v !== '') proxyForm.append(k, v)
    }

    // ── Proxy to real endpoint ─────────────────────────────────────────────
    const port    = process.env.PORT ?? '5000'
    const baseUrl = `http://localhost:${port}`
    const toolUrl = `${baseUrl}${config.endpoint}`

    const proxyRes = await fetch(toolUrl, { method: 'POST', body: proxyForm })
    const httpStatus = proxyRes.status

    // ── Handle response ────────────────────────────────────────────────────
    const contentType = proxyRes.headers.get('content-type') ?? ''
    const isJson = contentType.includes('application/json')

    // Collect response metadata from headers
    const metadata: Record<string, string | number | boolean> = {
      httpStatus,
      endpoint: config.endpoint,
      engine: config.engine,
    }
    for (const [k, v] of proxyRes.headers.entries()) {
      if (k.startsWith('x-')) {
        const key = k.replace(/^x-/, '').replace(/-/g, '_')
        const num = parseFloat(v)
        metadata[key] = isNaN(num) ? v : num
      }
    }

    if (!proxyRes.ok) {
      let errMsg = `HTTP ${httpStatus}`
      if (isJson) {
        try {
          const body = await proxyRes.json() as { error?: string }
          errMsg = body.error ?? errMsg
        } catch {}
      }
      tracker.end('fail', errMsg)

      // Mark remaining steps as skipped
      for (const s of proxyStepNames.slice(1)) {
        tracker.skip(s, 'skipped due to processing failure')
      }

      return NextResponse.json({
        tool: toolId, toolLabel: config.label, engine: config.engine,
        endpoint: config.endpoint, status: 'failed', httpStatus,
        steps: tracker.steps, warnings, error: errMsg, metadata,
        totalMs: Date.now() - totalStart,
      })
    }

    tracker.end('ok', `HTTP ${httpStatus}`)

    // ── Store output ───────────────────────────────────────────────────────
    const storeStep = proxyStepNames.find((s) => ['STORE', 'RESULT', 'ZIP_OUTPUT'].includes(s))
    if (storeStep && proxyStepNames.length > 1) {
      // Mark intermediate steps as ok (already tracked the first one above)
      for (const s of proxyStepNames.slice(1, -1)) {
        tracker.steps.push({ name: s, status: 'ok', durationMs: 0, detail: 'completed' })
      }
    }

    let outputFileId   = ''
    let outputFilename = ''
    let outputSizeBytes = 0
    let outputContentType = contentType

    if (isJson) {
      const body = await proxyRes.json() as {
        fileId?: string; filename?: string; success?: boolean;
        text?: string; confidence?: number; words?: unknown[]
        [k: string]: unknown
      }

      if (body.fileId) {
        outputFileId    = body.fileId
        outputFilename  = body.filename ?? 'output'
      }

      // Surface extra metadata from JSON body
      for (const [k, v] of Object.entries(body)) {
        if (!['fileId', 'filename', 'success', 'error'].includes(k) && v !== undefined && v !== null) {
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            metadata[k] = v
          }
        }
      }

      // For OCR json output, store extracted text
      if (body.text && !outputFileId) {
        const storage = getTempStorage()
        const textBuf = Buffer.from(String(body.text), 'utf-8')
        outputFileId    = await storage.store(textBuf, 'ocr-result.txt', 'text/plain')
        outputFilename  = 'ocr-result.txt'
        outputSizeBytes = textBuf.length
        outputContentType = 'text/plain'
        if (body.confidence) {
          metadata['confidence'] = body.confidence as number
        }
      }
    } else {
      // Binary response — store in TempStorage
      const storeTracker = storeStep ? tracker : null
      if (storeTracker && storeStep) {
        tracker.begin(storeStep)
      }

      const bodyBuf   = Buffer.from(await proxyRes.arrayBuffer())
      const disposition = proxyRes.headers.get('content-disposition') ?? ''
      const fnMatch   = disposition.match(/filename="([^"]+)"/)
      outputFilename  = fnMatch?.[1] ?? `output-${toolId}`
      outputSizeBytes = bodyBuf.length

      const storage   = getTempStorage()
      outputFileId    = await storage.store(bodyBuf, outputFilename, contentType)

      if (storeTracker && storeStep) {
        tracker.end('ok', `${(outputSizeBytes / 1024).toFixed(1)} KB stored`)
      } else {
        tracker.steps.push({ name: storeStep ?? 'STORE', status: 'ok', durationMs: 0, detail: `${(outputSizeBytes / 1024).toFixed(1)} KB` })
      }
    }

    // Remaining pipeline steps that weren't explicitly tracked
    const trackedNames = new Set(tracker.steps.map((s) => s.name))
    for (const s of config.steps) {
      if (!trackedNames.has(s)) {
        tracker.steps.push({ name: s, status: 'ok', durationMs: 0, detail: 'completed' })
      }
    }

    return NextResponse.json({
      tool:      toolId,
      toolLabel: config.label,
      engine:    config.engine,
      endpoint:  config.endpoint,
      status:    'success',
      httpStatus,
      steps:     tracker.steps,
      warnings,
      metadata,
      output: outputFileId ? {
        fileId:      outputFileId,
        filename:    outputFilename,
        contentType: outputContentType,
        sizeBytes:   outputSizeBytes,
      } : undefined,
      totalMs: Date.now() - totalStart,
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    const last = tracker.steps[tracker.steps.length - 1]
    if (last && last.status === 'pending') {
      last.status = 'fail'
      last.detail = msg
      last.durationMs = 0
    }
    return NextResponse.json({
      tool: toolId, status: 'failed',
      steps: tracker.steps, warnings,
      error: msg, rawError: err instanceof Error ? err.stack : String(err),
      totalMs: Date.now() - totalStart,
    }, { status: 500 })
  } finally {
    await cleanup()
  }
}

// ── GET — return tool config list ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!verifyOpsV2Session(request)) {
    return new NextResponse(null, { status: 404 })
  }
  return NextResponse.json({ tools: TOOL_CONFIGS })
}
