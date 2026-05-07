import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { trackRouteRequest } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const mode     = (fields['mode'] ?? 'all') as 'all' | 'range'
    const rangeStr = (fields['range'] ?? '').trim()

    if (mode === 'range' && !rangeStr) {
      return NextResponse.json(
        { error: 'Please specify a page range (e.g. "1-3,5") when using range mode.' },
        { status: 400 }
      )
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdf.split({
      file: buffer,
      mode,
      ranges: rangeStr,
    })

    if (!result.success || !result.data) {
      trackRouteRequest(req, { tool: 'split-pdf', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'split failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to split PDF' },
        { status: 500 }
      )
    }

    const isZip = result.metadata?.outputFormat === 'zip'
    trackRouteRequest(req, { tool: 'split-pdf', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': isZip ? 'application/zip' : 'application/pdf',
        'Content-Disposition': `attachment; filename="toolify-split.${isZip ? 'zip' : 'pdf'}"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[split-pdf]', err)
    trackRouteRequest(req, { tool: 'split-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to split PDF' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
