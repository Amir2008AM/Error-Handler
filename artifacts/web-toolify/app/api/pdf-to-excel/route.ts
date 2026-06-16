import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { readFile, rm, mkdtemp, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { acquireGuard } from '@/lib/concurrency-guard'
import { recordToolEvent } from '@/lib/tool-registry'

export const runtime = 'nodejs'
export const maxDuration = 180

// Candidate paths tried in order — resolved at request time, not at module load,
// so Turbopack NFT tracing never crawls the filesystem for this module.
const SCRIPT_CANDIDATES: readonly string[] = [
  // Dev / Replit
  'scripts/pdf-to-excel.py',
  // Docker / Railway deployment layouts
  '/app/scripts/pdf-to-excel.py',
  '/app/artifacts/web-toolify/scripts/pdf-to-excel.py',
  '/opt/render/project/src/artifacts/web-toolify/scripts/pdf-to-excel.py',
]

function resolveScript(): string {
  for (const candidate of SCRIPT_CANDIDATES) {
    const full = candidate.startsWith('/') ? candidate : join(process.cwd(), candidate)
    if (existsSync(full)) return full
  }
  // Fallback — let Python report the "file not found" error with a clear message
  return join(process.cwd(), SCRIPT_CANDIDATES[0])
}

function runExtractor(pdfPath: string, xlsxPath: string): Promise<void> {
  const script = resolveScript()
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [script, '-q', pdfPath, xlsxPath], {
      timeout: 150_000,
    })

    const stderr: string[] = []
    py.stderr.on('data', (chunk: Buffer) => stderr.push(chunk.toString()))

    py.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        const msg = stderr.join('').trim()
        reject(new Error(msg || `Extractor exited with code ${code}`))
      }
    })

    py.on('error', (err) => reject(new Error(`Could not start extractor: ${err.message}`)))
  })
}

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('pdf-to-excel')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'pdf-to-excel')
  if (rateLimited) return rateLimited

  const { files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()
  let outDir: string | null = null

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    outDir = await mkdtemp(join(tmpdir(), 'pdf2xl-'))

    // The Python script validates inputs by .pdf extension — copy the upload
    // (which has a .tmp extension) to a proper .pdf path inside outDir.
    const pdfPath = join(outDir, 'input.pdf')
    await copyFile(file.path, pdfPath)

    const xlsxPath = join(outDir, 'output.xlsx')

    const release = await acquireGuard('python')
    try {
      await runExtractor(pdfPath, xlsxPath)
    } finally {
      release()
    }

    const buffer = await readFile(xlsxPath)
    const baseName = safeFilename(file.filename.replace(/\.pdf$/i, ''))

    const durationMs = Date.now() - start
    trackRouteRequest(request, { tool: 'pdf-to-excel', fileSizeB: file.size, format: 'pdf', success: true, durationMs })
    recordToolEvent('pdf-to-excel', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'python-reportlab' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[pdf-to-excel]', error)
    trackRouteRequest(request, {
      tool: 'pdf-to-excel',
      fileSizeB: files[0]?.size,
      format: 'pdf',
      success: false,
      durationMs: Date.now() - start,
      errorMsg: error instanceof Error ? error.message : 'unknown',
    })
    const rawMsg = error instanceof Error ? error.message : 'Failed to extract tables from PDF'
    let userMsg: string
    if (
      rawMsg.includes('No usable tables found') ||
      rawMsg.includes('Tables were found but failed validation') ||
      rawMsg.includes('All extractors failed') ||
      rawMsg.includes('No usable')
    ) {
      userMsg = rawMsg.split('\n')[0]
    } else if (
      rawMsg.includes('ModuleNotFoundError') ||
      rawMsg.includes('No module named')
    ) {
      userMsg = 'Server configuration error: a required Python package is missing. Please contact support.'
    } else if (rawMsg.includes('OCR failed')) {
      userMsg = 'OCR extraction failed. The PDF may contain unsupported image formats or encodings.'
    } else if (rawMsg.includes('File not found')) {
      userMsg = 'Uploaded file could not be processed. Please try again.'
    } else {
      userMsg = 'Could not extract tables from this PDF. The file may not contain detectable table data.'
    }
    return NextResponse.json({ error: userMsg }, { status: 500 })
  } finally {
    await cleanup()
    if (outDir) await rm(outDir, { recursive: true, force: true }).catch(() => {})
  }
}
