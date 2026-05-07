import { NextRequest, NextResponse } from 'next/server'
import { image } from '@/lib/processing'
import type { ImageFormat } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest, extOf } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'image')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'image')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const targetFormat = fields['format'] ?? 'jpeg'
    const quality      = parseInt(fields['quality'] ?? '90', 10)

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await image.convert({
      file: buffer,
      targetFormat: targetFormat as ImageFormat,
      quality,
    })

    if (!result.success || !result.data) {
      trackRouteRequest(req, { tool: 'convert-image', fileSizeB: file.size, format: extOf(file.filename, 'image'), success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'convert failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to convert image' },
        { status: 500 }
      )
    }

    const contentType  = image.getContentType(targetFormat as ImageFormat)
    const extension    = image.getExtension(targetFormat as ImageFormat)
    const originalName = safeFilename(file.filename.replace(/\.[^/.]+$/, ''))

    trackRouteRequest(req, { tool: 'convert-image', fileSizeB: file.size, format: extOf(file.filename, 'image'), success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName}.${extension}"`,
        'X-Original-Format': String(result.metadata?.inputFormat ?? 'unknown').toUpperCase(),
        'X-Output-Format': extension.toUpperCase(),
        'X-Original-Size': (result.metadata?.inputSize  ?? 0).toString(),
        'X-Output-Size': (result.metadata?.outputSize ?? 0).toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[convert-image]', err)
    trackRouteRequest(req, { tool: 'convert-image', fileSizeB: files[0]?.size, format: extOf(files[0]?.filename, 'image'), success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to convert image' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
