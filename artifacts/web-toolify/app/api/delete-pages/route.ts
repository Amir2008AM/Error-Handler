import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('delete-pages')
  if (guard) return guard

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const pagesJson = fields['pages'] ?? ''
    if (!pagesJson) {
      return NextResponse.json({ error: 'No pages specified' }, { status: 400 })
    }

    let pagesToDelete: number[]
    try {
      const parsed = JSON.parse(pagesJson)
      if (!Array.isArray(parsed)) {
        return NextResponse.json({ error: 'Pages must be an array of page numbers' }, { status: 400 })
      }
      pagesToDelete = parsed
        .map((p) => parseInt(String(p), 10))
        .filter((p) => Number.isFinite(p) && p > 0)
      if (pagesToDelete.length === 0) {
        return NextResponse.json({ error: 'No valid page numbers provided' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid pages format — expected a JSON array of numbers' }, { status: 400 })
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdfProcessor.deletePages(buffer, pagesToDelete)

    if (!result.success || !result.data) {
      trackRouteRequest(request, { tool: 'delete-pages', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'delete pages failed' })
      return NextResponse.json({ error: result.error || 'Failed to delete pages' }, { status: 500 })
    }

    trackRouteRequest(request, { tool: 'delete-pages', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="edited.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[delete-pages]', error)
    trackRouteRequest(request, { tool: 'delete-pages', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to delete pages' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
