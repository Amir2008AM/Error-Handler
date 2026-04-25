import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const operationsJson = formData.get('operations') as string | null

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    if (!operationsJson) {
      return NextResponse.json({ error: 'No operations provided' }, { status: 400 })
    }

    const operations = JSON.parse(operationsJson)
    const buffer = await file.arrayBuffer()

    const result = await pdfProcessor.organize({
      file: buffer,
      operations,
    })

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="organized.pdf"`,
      },
    })
  } catch (error) {
    console.error('Organize PDF error:', error)
    return NextResponse.json(
      { error: 'Failed to organize PDF' },
      { status: 500 }
    )
  }
}
