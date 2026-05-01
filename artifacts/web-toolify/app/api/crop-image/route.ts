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

    const left = parseInt(fields['left'] ?? '0', 10)
    const top = parseInt(fields['top'] ?? '0', 10)
    const width = parseInt(fields['width'] ?? '0', 10)
    const height = parseInt(fields['height'] ?? '0', 10)
    const format = fields['format'] ?? 'same'
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
      return NextResponse.json(
        { error: result.error || 'Failed to crop image' },
        { status: 500 }
      )
    }

    const outputFormat = format === 'same' ? 'jpeg' : (format as ImageFormat)
    const contentType = image.getContentType(outputFormat)
    const extension = image.getExtension(outputFormat)
    const originalName = file.filename.replace(/\.[^/.]+$/, '')

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
    return NextResponse.json({ error: 'Failed to crop image' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
