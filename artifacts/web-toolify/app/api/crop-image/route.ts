import { NextRequest, NextResponse } from 'next/server'
import { image } from '@/lib/processing'
import type { ImageFormat } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest, extOf } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('crop-image')
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

    const left    = parseInt(fields['left']    ?? '0',  10)
    const top     = parseInt(fields['top']     ?? '0',  10)
    const width   = parseInt(fields['width']   ?? '0',  10)
    const height  = parseInt(fields['height']  ?? '0',  10)
    const format  = fields['format']  ?? 'same'
    const quality = parseInt(fields['quality'] ?? '90', 10)

    if (width <= 0 || height <= 0) {
      return NextResponse.json({ error: 'Invalid crop dimensions' }, { status: 400 })
    }

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await image.crop({
      file: buffer,
      left,
      top,
      width,
      height,
      format: format as ImageFormat | 'same',
      quality,
    })

    if (!result.success || !result.data) {
      trackRouteRequest(req, { tool: 'crop-image', fileSizeB: file.size, format: extOf(file.filename, 'image'), success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'crop failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to crop image' },
        { status: 500 }
      )
    }

    const outputFormat = (result.metadata?.outputFormat as ImageFormat) || 'jpeg'
    const contentType  = image.getContentType(outputFormat)
    const extension    = image.getExtension(outputFormat)
    const originalName = safeFilename(file.filename.replace(/\.[^/.]+$/, ''))

    trackRouteRequest(req, { tool: 'crop-image', fileSizeB: file.size, format: extOf(file.filename, 'image'), success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName}-cropped.${extension}"`,
        'X-Crop-Width': width.toString(),
        'X-Crop-Height': height.toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[crop-image]', err)
    trackRouteRequest(req, { tool: 'crop-image', fileSizeB: files[0]?.size, format: extOf(files[0]?.filename, 'image'), success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to crop image' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
