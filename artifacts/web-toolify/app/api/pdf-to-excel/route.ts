import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'node:child_process'
import { readFile, rm, mkdtemp } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { streamUpload, validateStreamedFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 180

const PYTHON_SCRIPT = join(process.cwd(), '../../pdf_table_extractor.py')

function runExtractor(pdfPath: string, xlsxPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [PYTHON_SCRIPT, pdfPath, xlsxPath, '-q'], {
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
    const xlsxPath = join(outDir, 'output.xlsx')

    await runExtractor(file.path, xlsxPath)

    const buffer = await readFile(xlsxPath)
    const baseName = safeFilename(file.filename.replace(/\.pdf$/i, ''))

    trackRouteRequest(request, {
      tool: 'pdf-to-excel',
      fileSizeB: file.size,
      format: 'pdf',
      success: true,
      durationMs: Date.now() - start,
    })

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
    // Pass the Python script's own message through — it includes engine-specific details
    const userMsg = rawMsg.includes('No usable tables found') || rawMsg.includes('extraction failed')
      ? rawMsg.split('\n')[0]   // first line only — strip any traceback
      : 'Could not extract tables from this PDF. The file may not contain detectable table data.'
    return NextResponse.json({ error: userMsg }, { status: 500 })
  } finally {
    await cleanup()
    if (outDir) await rm(outDir, { recursive: true, force: true }).catch(() => {})
  }
}
