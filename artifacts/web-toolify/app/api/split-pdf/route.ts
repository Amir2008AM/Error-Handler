import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const mode = (formData.get('mode') as string) ?? 'all'
    const rangeStr = (formData.get('range') as string) ?? ''

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    const arrayBuffer = await file.arrayBuffer()

    const result = await pdf.split({
      file: arrayBuffer,
      mode: mode as 'all' | 'range',
      ranges: rangeStr,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to split PDF' },
        { status: 500 }
      )
    }

    const isZip = result.metadata?.outputFormat === 'zip'

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': isZip ? 'application/zip' : 'application/pdf',
        'Content-Disposition': `attachment; filename="toolify-split.${isZip ? 'zip' : 'pdf'}"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[split-pdf]', err)
    return NextResponse.json({ error: 'Failed to split PDF' }, { status: 500 })
  }
}
