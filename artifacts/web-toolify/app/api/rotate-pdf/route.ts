import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf') as File | null
    const rotation = parseInt((formData.get('rotation') as string) ?? '90', 10)
    const pagesStr = formData.get('pages') as string | null

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    if (![90, 180, 270].includes(rotation)) {
      return NextResponse.json({ error: 'Invalid rotation angle. Must be 90, 180, or 270' }, { status: 400 })
    }

    // Parse pages if provided (e.g., "1,2,3" or empty for all)
    let pages: number[] | undefined
    if (pagesStr && pagesStr.trim()) {
      pages = pagesStr
        .split(',')
        .map((p) => parseInt(p.trim(), 10))
        .filter((p) => !isNaN(p) && p > 0)
    }

    const arrayBuffer = await file.arrayBuffer()

    const result = await pdf.rotate({
      file: arrayBuffer,
      rotation: rotation as 90 | 180 | 270,
      pages,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to rotate PDF' },
        { status: 500 }
      )
    }

    const originalName = file.name.replace(/\.pdf$/i, '')

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${originalName}-rotated.pdf"`,
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[rotate-pdf]', err)
    return NextResponse.json({ error: 'Failed to rotate PDF' }, { status: 500 })
  }
}
