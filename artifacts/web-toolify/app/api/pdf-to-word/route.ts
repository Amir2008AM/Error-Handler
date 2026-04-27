import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File

    const validationError = await validateFile(file, 'pdf')
    if (validationError) return validationError

    const arrayBuffer = await file.arrayBuffer()
    const title = file.name.replace(/\.pdf$/i, '')

    const result = await pdf.toWord({ file: arrayBuffer })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to convert PDF to Word' },
        { status: 500 }
      )
    }

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${title}.docx"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[pdf-to-word]', err)
    return NextResponse.json({ error: 'Failed to convert PDF to Word' }, { status: 500 })
  }
}
