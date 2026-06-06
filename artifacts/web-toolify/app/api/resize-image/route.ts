import { NextRequest, NextResponse } from 'next/server'
import { image } from '@/lib/processing'
import type { ImageFormat } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest, extOf } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('resize-image')
  if (guard) return guard

  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'image')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'image')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const widthStr       = fields['width']         ?? null
    const heightStr      = fields['height']        ?? null
    const maintainAspect = fields['maintainAspect'] !== 'false'
    const unit           = fields['unit']          ?? 'px'
    const format         = fields['format']        ?? 'same'
    const quality        = parseInt(fields['quality'] ?? '90', 10)

    let width: number | undefined
    let height: number | undefined

    if (unit === 'percent') {
      const pct = parseFloat(widthStr ?? '100')
      if (!isNaN(pct) && pct > 0) width = pct
    } else {
      if (widthStr && widthStr.trim() !== '') {
        const w = parseInt(widthStr, 10)
        if (!isNaN(w) && w > 0) width = w
      }
      if (heightStr && heightStr.trim() !== '') {
        const h = parseInt(heightStr, 10)
        if (!isNaN(h) && h > 0) height = h
      }
    }

    if (!width && !height) {
      return NextResponse.json({ error: 'Please provide at least one dimension' }, { status: 400 })
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await image.resize({
      file: buffer,
      width,
      height,
      unit: unit as 'px' | 'percent',
      maintainAspectRatio: maintainAspect,
      format: format as ImageFormat | 'same',
      quality,
    })

    if (!result.success || !result.data) {
      trackRouteRequest(req, { tool: 'resize-image', fileSizeB: file.size, format: extOf(file.filename, 'image'), success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'resize failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to resize image' },
        { status: 500 }
      )
    }

    const outputFormat = (result.metadata?.outputFormat as ImageFormat) || 'jpeg'
    const contentType  = image.getContentType(outputFormat)
    const extension    = image.getExtension(outputFormat)
    const originalName = safeFilename(file.filename.replace(/\.[^/.]+$/, ''))

    trackRouteRequest(req, { tool: 'resize-image', fileSizeB: file.size, format: extOf(file.filename, 'image'), success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName}-resized.${extension}"`,
        'X-Original-Width': (result.metadata?.originalWidth  ?? 0).toString(),
        'X-Original-Height': (result.metadata?.originalHeight ?? 0).toString(),
        'X-Output-Width': (result.metadata?.width  ?? 0).toString(),
        'X-Output-Height': (result.metadata?.height ?? 0).toString(),
        'X-Original-Size': (result.metadata?.inputSize  ?? 0).toString(),
        'X-Output-Size': (result.metadata?.outputSize ?? 0).toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[resize-image]', err)
    trackRouteRequest(req, { tool: 'resize-image', fileSizeB: files[0]?.size, format: extOf(files[0]?.filename, 'image'), success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to resize image' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
