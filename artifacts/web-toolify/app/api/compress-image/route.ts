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

    const quality = parseInt(fields['quality'] ?? '80', 10)
    const format = fields['format'] ?? 'same'

    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await image.compress({
      file: buffer,
      quality,
      format: format as ImageFormat | 'same',
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to compress image' },
        { status: 500 }
      )
    }

    const outputFormat = (result.metadata?.outputFormat as ImageFormat) || 'jpeg'
    const contentType = image.getContentType(outputFormat)
    const extension = image.getExtension(outputFormat)
    const originalName = file.filename.replace(/\.[^/.]+$/, '')

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalName}-compressed.${extension}"`,
        'X-Original-Size': (result.metadata?.inputSize ?? 0).toString(),
        'X-Compressed-Size': (result.metadata?.outputSize ?? 0).toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[compress-image]', err)
    return NextResponse.json({ error: 'Failed to compress image' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
