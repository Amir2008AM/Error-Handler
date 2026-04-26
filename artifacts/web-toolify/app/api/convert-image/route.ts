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
    const targetFormat = (formData.get('format') as string) ?? 'jpeg'
    const quality = parseInt((formData.get('quality') as string) ?? '90', 10)

    const validationError = validateFile(file, 'image')
    if (validationError) return validationError

    const arrayBuffer = await file.arrayBuffer()
    
    const result = await image.convert({
      file: arrayBuffer,
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
    const originalName = file.name.replace(/\.[^/.]+$/, '')

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
  }
}
