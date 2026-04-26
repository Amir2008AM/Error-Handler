import { NextRequest, NextResponse } from 'next/server'
import { pdfProcessor } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const pagesJson = formData.get('pages') as string | null

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    if (!pagesJson) {
      return NextResponse.json({ error: 'No pages specified' }, { status: 400 })
    }

    const pagesToDelete = JSON.parse(pagesJson) as number[]
    const buffer = await file.arrayBuffer()

    const result = await pdfProcessor.deletePages(buffer, pagesToDelete)

    if (!result.success || !result.data) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="edited.pdf"`,
      },
    })
  } catch (error) {
    console.error('Delete pages error:', error)
    return NextResponse.json(
      { error: 'Failed to delete pages' },
      { status: 500 }
    )
  }
}
