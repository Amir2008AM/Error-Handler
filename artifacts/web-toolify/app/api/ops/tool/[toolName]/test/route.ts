/**
 * POST /api/ops/tool/:toolName/test
 *
 * Runs a real test conversion for any tool using a built-in minimal test file.
 * Returns: { success, durationMs, error }
 * On failure, writes an entry to Active Errors (central state).
 *
 * Protected by the main ops session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyOpsSession } from '@/app/api/ops/auth/route'
import { TOOL_CONFIGS }     from '@/app/internal/dev-test/tool-configs'
import { csWriteError }     from '@/lib/monitoring/central-state'

export const runtime    = 'nodejs'
export const maxDuration = 120

// ── Minimal test payloads ─────────────────────────────────────────────────────

// Tiny 1-page minimal PDF (no content, just structure)
const MINIMAL_PDF_B64 =
  'JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBv' +
  'Ymogd' +
  'jw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+ZW5kb2JqCjMgMCBvYmo8PC9UeXBl' +
  'L1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXT4+ZW5kb2JqCnhyZWYKMCA0' +
  'CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAwOSAwMDAwMCBuIAowMDAwMDAwMDU4IDAwMDAw' +
  'IG4gCjAwMDAwMDAxMTUgMDAwMDAgbgp0cmFpbGVyPDwvU2l6ZSA0L1Jvb3QgMSAwIFI+PgpzdGFy' +
  'dHhyZWYKMTkwCiUlRU9G'

// 1×1 white JPEG (smallest valid JPEG)
const MINIMAL_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARC' +
  'AABAAEDASIAAB' +
  'EBAXEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/xAAUAQEAAAAA' +
  'AAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ACQAA' +
  'f/Z'

// Minimal HTML document — accepted by LibreOffice for all document-based tools
const MINIMAL_HTML = Buffer.from(
  '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Toolify Test</title></head>' +
  '<body><h1>Toolify Test Document</h1><p>Automated test run from the ops dashboard.</p></body></html>',
  'utf-8',
)

// ── Default params supplied for tools with required fields ────────────────────

const REQUIRED_PARAM_DEFAULTS: Record<string, Record<string, string>> = {
  'protect-pdf':  { password: 'TestPass123!', allowPrinting: 'true' },
  'unlock-pdf':   { password: 'TestPass123!' },
  'delete-pages': { pages: '1' },
  'sign-pdf':     { signatureText: 'Test Signature', position: 'bottom-right' },
  'watermark-pdf':{ text: 'DRAFT', position: 'diagonal', opacity: '0.3' },
  'split-pdf':    { mode: 'all' },
  'rotate-pdf':   { rotation: '90' },
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ toolName: string }> },
) {
  if (!verifyOpsSession(request)) return new NextResponse(null, { status: 404 })

  const { toolName } = await params
  const config = TOOL_CONFIGS[toolName]

  if (!config) {
    return NextResponse.json({ success: false, durationMs: 0, error: `Unknown tool: ${toolName}` })
  }

  const start = Date.now()

  try {
    // ── Resolve test file ───────────────────────────────────────────────────
    let testBuffer: Buffer
    let testFilename: string
    let testMime: string

    if (config.fileType === 'pdf') {
      testBuffer   = Buffer.from(MINIMAL_PDF_B64, 'base64')
      testFilename = 'test.pdf'
      testMime     = 'application/pdf'
    } else if (config.fileType === 'image') {
      testBuffer   = Buffer.from(MINIMAL_JPEG_B64, 'base64')
      testFilename = 'test.jpg'
      testMime     = 'image/jpeg'
    } else {
      // document — LibreOffice accepts HTML for all doc-based tools since skipValidation=true
      testBuffer   = MINIMAL_HTML
      testFilename = 'test.html'
      testMime     = 'text/html'
    }

    // ── Build FormData ──────────────────────────────────────────────────────
    const form    = new FormData()
    const blob    = new Blob([testBuffer], { type: testMime })
    form.append(config.fileField, blob, testFilename)

    // Second file for merge-pdf
    if (config.multiFile && config.fileField2) {
      form.append(config.fileField2, blob, testFilename)
    }

    // Merge config defaults + required overrides
    const overrides = REQUIRED_PARAM_DEFAULTS[toolName] ?? {}
    const applied   = new Set<string>()

    for (const p of config.params ?? []) {
      const val = overrides[p.name] ?? p.default ?? ''
      if (val !== '') { form.append(p.name, val); applied.add(p.name) }
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (!applied.has(k)) form.append(k, v)
    }

    // ── POST to actual tool endpoint ────────────────────────────────────────
    const port    = process.env.PORT ?? '5000'
    const baseUrl = `http://localhost:${port}`
    const toolUrl = `${baseUrl}${config.endpoint}`

    const res        = await fetch(toolUrl, { method: 'POST', body: form })
    const durationMs = Date.now() - start

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`
      try {
        if ((res.headers.get('content-type') ?? '').includes('application/json')) {
          const body = await res.json() as { error?: string; disabled?: boolean }
          // If the tool is disabled the test is not a real failure
          if (body.disabled) {
            return NextResponse.json({ success: false, durationMs, error: 'Tool is currently disabled' })
          }
          errMsg = body.error ?? errMsg
        }
      } catch {}
      csWriteError(toolName, `Test failed: ${errMsg}`, 'medium', 'TestFailure')
      return NextResponse.json({ success: false, durationMs, error: errMsg })
    }

    return NextResponse.json({ success: true, durationMs, error: null })

  } catch (err) {
    const durationMs = Date.now() - start
    const errMsg     = err instanceof Error ? err.message : 'Unexpected error'
    csWriteError(toolName, `Test error: ${errMsg}`, 'medium', 'TestFailure')
    return NextResponse.json({ success: false, durationMs, error: errMsg })
  }
}
