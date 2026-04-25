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
    const result = await pdfProcessor.repair(buffer)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="repaired.pdf"`,
      },
    })
  } catch (error) {
    console.error('Repair PDF error:', error)
    return NextResponse.json(
      { error: 'Failed to repair PDF' },
      { status: 500 }
    )
  }
}
