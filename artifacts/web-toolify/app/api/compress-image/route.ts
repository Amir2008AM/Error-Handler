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
    const quality = parseInt((formData.get('quality') as string) ?? '80', 10)
    const format = (formData.get('format') as string) ?? 'same'

    const validationError = await validateFile(file, 'image')
    if (validationError) return validationError

    const arrayBuffer = await file.arrayBuffer()
    
    const result = await image.compress({
      file: arrayBuffer,
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
    const originalName = file.name.replace(/\.[^/.]+$/, '')

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
  }
}
