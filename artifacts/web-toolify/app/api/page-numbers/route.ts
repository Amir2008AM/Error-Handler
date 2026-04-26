import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const position = (formData.get('position') as string) || 'bottom-center'
    const format = (formData.get('format') as string) || 'numeric'
    const startFrom = parseInt(formData.get('startFrom') as string) || 1
    const fontSize = parseInt(formData.get('fontSize') as string) || 12
    const margin = parseInt(formData.get('margin') as string) || 30

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    const buffer = await file.arrayBuffer()

    const result = await pdfProcessor.addPageNumbers({
      file: buffer,
      position: position as 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right',
      format: format as 'numeric' | 'roman' | 'page-of-total',
      startFrom,
      fontSize,
      margin,
    })

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="numbered.pdf"`,
      },
    })
  } catch (error) {
    console.error('Page numbers error:', error)
    return NextResponse.json(
      { error: 'Failed to add page numbers' },
      { status: 500 }
    )
  }
}
