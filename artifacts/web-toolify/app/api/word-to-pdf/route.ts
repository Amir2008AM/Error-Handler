import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { streamUpload, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { acquireGuard } from '@/lib/concurrency-guard'
import { recordToolEvent } from '@/lib/tool-registry'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('word-to-pdf')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'word-to-pdf')
  if (rateLimited) return rateLimited

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileName = file.filename.toLowerCase()
    if (!fileName.endsWith('.docx') && !fileName.endsWith('.doc')) {
      return NextResponse.json(
        { error: 'File must be a Word document (.docx or .doc)' },
        { status: 400 }
      )
    }

    const pageSize    = (fields['pageSize']    as 'a4' | 'letter' | 'legal') ?? 'a4'
    const orientation = (fields['orientation'] as 'portrait' | 'landscape')  ?? 'portrait'
    const fontSize    = parseInt(fields['fontSize'] ?? '12') || 12

    const buffer = await readFile(file.path)

    const release = await acquireGuard('libreoffice')
    let result: Awaited<ReturnType<DocumentConverter['wordToPdf']>>
    try {
      const converter = new DocumentConverter()
      result = await converter.wordToPdf(buffer, { pageSize, orientation, fontSize })
    } finally {
      release()
    }

    const durationMs = Date.now() - start
    const baseName = safeFilename(file.filename.replace(/\.(docx?|doc)$/i, ''))
    trackRouteRequest(request, { tool: 'word-to-pdf', fileSizeB: file.size, format: 'docx', success: true, durationMs })
    recordToolEvent('word-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'libreoffice' })

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
    recordToolEvent('word-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'libreoffice', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
