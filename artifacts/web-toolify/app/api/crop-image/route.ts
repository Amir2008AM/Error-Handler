import { NextRequest, NextResponse } from 'next/server'
import { image } from '@/lib/processing'
import type { ImageFormat } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File
    const left = parseInt((formData.get('left') as string) ?? '0', 10)
    const top = parseInt((formData.get('top') as string) ?? '0', 10)
    const width = parseInt((formData.get('width') as string) ?? '0', 10)
    const height = parseInt((formData.get('height') as string) ?? '0', 10)
    const format = (formData.get('format') as string) ?? 'same'
    const quality = parseInt((formData.get('quality') as string) ?? '90', 10)

    const validationError = await validateFile(file, 'image')
    if (validationError) return validationError

    if (width <= 0 || height <= 0) {
      return NextResponse.json({ error: 'Invalid crop dimensions' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const result = await image.crop({
      file: arrayBuffer,
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
    const originalName = file.name.replace(/\.[^/.]+$/, '')

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
  }
}
