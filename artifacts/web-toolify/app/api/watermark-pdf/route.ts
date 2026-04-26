import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File
    const text = formData.get('text') as string | null
    const opacity = parseFloat((formData.get('opacity') as string) ?? '0.3')
    const position = (formData.get('position') as string) ?? 'diagonal'
    const fontSize = parseInt((formData.get('fontSize') as string) ?? '50', 10)

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Watermark text is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()

    const result = await pdf.watermark({
      file: arrayBuffer,
      text: text.trim(),
      opacity,
      position: position as 'center' | 'diagonal' | 'top' | 'bottom',
      fontSize,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to add watermark' },
        { status: 500 }
      )
    }

    const originalName = file.name.replace(/\.pdf$/i, '')

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}-watermarked.pdf"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[watermark-pdf]', err)
    return NextResponse.json({ error: 'Failed to add watermark' }, { status: 500 })
  }
}
