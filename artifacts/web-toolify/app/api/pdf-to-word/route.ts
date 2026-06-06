import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { acquireGuard } from '@/lib/concurrency-guard'
import { recordToolEvent } from '@/lib/tool-registry'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('pdf-to-word')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(req, 'pdf-to-word')
  if (rateLimited) return rateLimited

  const { files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const title  = safeFilename(file.filename.replace(/\.pdf$/i, ''))
    const buffer = await readFileAsArrayBuffer(file.path)

    const release = await acquireGuard('libreoffice')
    let result: Awaited<ReturnType<typeof pdf.toWord>>
    try {
      result = await pdf.toWord({ file: buffer })
    } finally {
      release()
    }

    if (!result.success || !result.data) {
      const durationMs = Date.now() - start
      trackRouteRequest(req, { tool: 'pdf-to-word', fileSizeB: file.size, format: 'pdf', success: false, durationMs, errorMsg: result.error ?? 'pdf-to-word failed' })
      recordToolEvent('pdf-to-word', { ts: Date.now(), success: false, durationMs, fileSizeB: file.size, engine: 'libreoffice', error: result.error ?? 'failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to convert PDF to Word' },
        { status: 500 }
      )
    }

    const durationMs = Date.now() - start
    trackRouteRequest(req, { tool: 'pdf-to-word', fileSizeB: file.size, format: 'pdf', success: true, durationMs })
    recordToolEvent('pdf-to-word', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'libreoffice' })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title}.docx"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    const durationMs = Date.now() - start
    const status = (err as { _status?: number })._status ?? 500
    const msg = err instanceof Error ? err.message : 'Failed to convert PDF to Word'
    console.error('[pdf-to-word]', err)
    trackRouteRequest(req, { tool: 'pdf-to-word', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs, errorMsg: msg })
    recordToolEvent('pdf-to-word', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'libreoffice', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
