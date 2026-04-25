import { NextRequest, NextResponse } from 'next/server'
import { image } from '@/lib/processing'
import type { ImageFormat } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('image') as File | null
    const widthStr = formData.get('width') as string | null
    const heightStr = formData.get('height') as string | null
    const maintainAspect = (formData.get('maintainAspect') as string) !== 'false'
    const unit = (formData.get('unit') as string) ?? 'px'
    const format = (formData.get('format') as string) ?? 'same'
    const quality = parseInt((formData.get('quality') as string) ?? '90', 10)

    const validationError = validateFile(file, 'image')
    if (validationError) return validationError

    // Parse dimensions
    let width: number | undefined
    let height: number | undefined

    if (unit === 'percent') {
      const pct = parseFloat(widthStr ?? '100')
      if (!isNaN(pct) && pct > 0) {
        width = pct // For percent, we pass the percentage value
      }
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

    const arrayBuffer = await file.arrayBuffer()
    
    const result = await image.resize({
      file: arrayBuffer,
      width,
      height,
      unit: unit as 'px' | 'percent',
      maintainAspectRatio: maintainAspect,
      format: format as ImageFormat | 'same',
      quality,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to resize image' },
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
        'Content-Disposition': `attachment; filename="${originalName}-resized.${extension}"`,
        'X-Original-Width': (result.metadata?.originalWidth ?? 0).toString(),
        'X-Original-Height': (result.metadata?.originalHeight ?? 0).toString(),
        'X-Output-Width': (result.metadata?.width ?? 0).toString(),
        'X-Output-Height': (result.metadata?.height ?? 0).toString(),
        'X-Original-Size': (result.metadata?.inputSize ?? 0).toString(),
        'X-Output-Size': (result.metadata?.outputSize ?? 0).toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[resize-image]', err)
    return NextResponse.json({ error: 'Failed to resize image' }, { status: 500 })
  }
}
