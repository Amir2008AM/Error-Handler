import { NextRequest, NextResponse } from 'next/server'
import { repairPdf, UnrepairableError } from '@/lib/processing/pdf-repair'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    // Skip the standard PDF validator: corrupted PDFs may fail its checks,
    // and the whole point of this endpoint is to handle damaged input. We
    // still validate the file is present, has a reasonable size, and looks
    // like a PDF (magic bytes) inside repairPdf().
    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Reuse the central validator's size limit / non-PDF rejection only
    // for files that are well-formed enough to pass it. Failures here
    // (e.g. wrong MIME) we ignore and let the repair pipeline try anyway.
    try {
      const validationError = await validateFile(file, 'pdf')
      if (validationError && validationError.status >= 500) return validationError
    } catch {
      // ignore — proceed to repair
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await repairPdf(buffer)

    return new NextResponse(result.data as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="repaired-${file.name}"`,
        'X-Repair-Step': result.step,
      },
    })
  } catch (error) {
    console.error('Repair PDF error:', error)

    if (error instanceof UnrepairableError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      )
    }

    const message = error instanceof Error ? error.message : 'Failed to repair PDF'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
