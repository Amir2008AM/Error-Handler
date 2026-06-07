import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { streamUpload, readFile } from '@/lib/stream-upload'
import { consumePreUpload } from '@/lib/preupload-store'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { recordToolEvent } from '@/lib/tool-registry'
import { rm } from 'node:fs/promises'

const WORD_TO_PDF_MAX_BYTES = 25 * 1024 * 1024 // 25 MB

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('word-to-pdf')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'word-to-pdf')
  if (rateLimited) return rateLimited

  const contentType = request.headers.get('content-type') ?? ''
  const start = Date.now()

  // ── Path A: pre-uploaded file (JSON body with uploadId) ──────────────────
  if (contentType.includes('application/json')) {
    let body: { uploadId?: string; pageSize?: string; orientation?: string; fontSize?: number }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { uploadId = '', pageSize = 'a4', orientation = 'portrait', fontSize = 12 } = body
    if (!uploadId) return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })

    const stored = consumePreUpload(uploadId)
    if (!stored) {
      return NextResponse.json(
        { error: 'Upload expired or not found. Please select the file again.' },
        { status: 400 }
      )
    }

    const cleanupStored = () => rm(stored.dir, { recursive: true, force: true }).catch(() => {})

    try {
      const fileName = stored.filename.toLowerCase()
      if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
        return NextResponse.json({ error: 'File must be a Word document (.docx or .doc)' }, { status: 400 })
      }

      if (stored.size > WORD_TO_PDF_MAX_BYTES) {
        return NextResponse.json(
          { error: `File too large. Maximum 25 MB. Your file is ${(stored.size / 1024 / 1024).toFixed(1)} MB.` },
          { status: 413 }
        )
      }

      const buffer = await readFile(stored.path)
      const converter = new DocumentConverter()
      const result = await converter.wordToPdf(buffer, {
        pageSize: pageSize as 'a4' | 'letter' | 'legal',
        orientation: orientation as 'portrait' | 'landscape',
        fontSize: Number(fontSize) || 12,
      })

      const durationMs = Date.now() - start
      const baseName = safeFilename(stored.filename.replace(/\.(docx?|doc)$/i, ''))
      trackRouteRequest(request, { tool: 'word-to-pdf', fileSizeB: stored.size, format: 'docx', success: true, durationMs })
      recordToolEvent('word-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: stored.size, engine: 'mammoth+wkhtmltopdf' })

      return new NextResponse(result.buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
          'X-Page-Count': result.pageCount.toString(),
          'Cache-Control': 'no-store',
        },
      })
    } catch (error) {
      const durationMs = Date.now() - start
      const msg = error instanceof Error ? error.message : 'Failed to convert Word to PDF'
      console.error('[word-to-pdf]', error)
      trackRouteRequest(request, { tool: 'word-to-pdf', fileSizeB: stored.size, format: 'docx', success: false, durationMs, errorMsg: msg })
      recordToolEvent('word-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: stored.size, engine: 'mammoth+wkhtmltopdf', error: msg })
      return NextResponse.json({ error: msg }, { status: 500 })
    } finally {
      await cleanupStored()
    }
  }

  // ── Path B: regular multipart upload ─────────────────────────────────────
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileName = file.filename.toLowerCase()
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
      return NextResponse.json({ error: 'File must be a Word document (.docx or .doc)' }, { status: 400 })
    }

    if (file.size > WORD_TO_PDF_MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum 25 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.` },
        { status: 413 }
      )
    }

    const pageSize    = (fields['pageSize']    as 'a4' | 'letter' | 'legal') ?? 'a4'
    const orientation = (fields['orientation'] as 'portrait' | 'landscape')  ?? 'portrait'
    const fontSize    = parseInt(fields['fontSize'] ?? '12') || 12

    const buffer = await readFile(file.path)
    const converter = new DocumentConverter()
    const result = await converter.wordToPdf(buffer, { pageSize, orientation, fontSize })

    const durationMs = Date.now() - start
    const baseName = safeFilename(file.filename.replace(/\.(docx?|doc)$/i, ''))
    trackRouteRequest(request, { tool: 'word-to-pdf', fileSizeB: file.size, format: 'docx', success: true, durationMs })
    recordToolEvent('word-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'mammoth+wkhtmltopdf' })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const status = (error as { _status?: number })._status ?? 500
    const msg = error instanceof Error ? error.message : 'Failed to convert Word to PDF'
    console.error('[word-to-pdf]', error)
    trackRouteRequest(request, { tool: 'word-to-pdf', fileSizeB: files[0]?.size, format: 'docx', success: false, durationMs, errorMsg: msg })
    recordToolEvent('word-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'mammoth+wkhtmltopdf', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
