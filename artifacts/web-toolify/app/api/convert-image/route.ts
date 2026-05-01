import { NextRequest, NextResponse } from 'next/server'
import { image } from '@/lib/processing'
import type { ImageFormat } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'image')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'image')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const targetFormat = fields['format'] ?? 'jpeg'
    const quality = parseInt(fields['quality'] ?? '90', 10)

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await image.convert({
      file: buffer,
      targetFormat: targetFormat as ImageFormat,
      quality,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to convert image' },
        { status: 500 }
      )
    }

    const contentType = image.getContentType(targetFormat as ImageFormat)
    const extension = image.getExtension(targetFormat as ImageFormat)
    const originalName = file.filename.replace(/\.[^/.]+$/, '')

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName}.${extension}"`,
        'X-Original-Format': String(result.metadata?.inputFormat ?? 'unknown').toUpperCase(),
        'X-Output-Format': extension.toUpperCase(),
        'X-Original-Size': (result.metadata?.inputSize ?? 0).toString(),
        'X-Output-Size': (result.metadata?.outputSize ?? 0).toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[convert-image]', err)
    return NextResponse.json({ error: 'Failed to convert image' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
