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
  const guard = getToolGuardResponse('ppt-to-pdf')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'ppt-to-pdf')
  if (rateLimited) return rateLimited

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileName = file.filename.toLowerCase()
    if (!fileName.endsWith('.pptx') && !fileName.endsWith('.ppt')) {
      return NextResponse.json(
        { error: 'File must be a PowerPoint presentation (.pptx or .ppt)' },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 })
    }

    const buffer = await readFile(file.path)

    const release = await acquireGuard('libreoffice')
    let result: Awaited<ReturnType<DocumentConverter['pptToPdf']>>
    try {
      const converter = new DocumentConverter()
      result = await converter.pptToPdf(buffer)
    } finally {
      release()
    }

    const durationMs = Date.now() - start
    const baseName = safeFilename(file.filename.replace(/\.pptx?$/i, ''))
    trackRouteRequest(request, { tool: 'ppt-to-pdf', fileSizeB: file.size, format: 'pptx', success: true, durationMs })
    recordToolEvent('ppt-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'libreoffice' })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count':        result.pageCount.toString(),
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const status = (error as { _status?: number })._status ?? 500
    const msg = error instanceof Error ? error.message : 'Failed to convert presentation to PDF'
    console.error('[ppt-to-pdf]', error)
    trackRouteRequest(request, { tool: 'ppt-to-pdf', fileSizeB: files[0]?.size, format: 'pptx', success: false, durationMs, errorMsg: msg })
    recordToolEvent('ppt-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'libreoffice', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
