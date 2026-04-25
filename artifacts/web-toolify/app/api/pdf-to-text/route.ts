import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    const buffer = await file.arrayBuffer()
    const result = await pdfProcessor.toText(buffer)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="extracted.txt"`,
      },
    })
  } catch (error) {
    console.error('PDF to text error:', error)
    return NextResponse.json(
      { error: 'Failed to extract text from PDF' },
      { status: 500 }
    )
  }
}
