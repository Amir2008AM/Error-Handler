import { NextRequest, NextResponse } from 'next/server'
import { repairPdf, UnrepairableError } from '@/lib/processing/pdf-repair'
import { streamUpload, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'

export const runtime = 'nodejs'
export const maxDuration = 180

export async function POST(request: NextRequest) {
  // Repair is intentionally lenient during upload: corrupted PDFs may fail
  // normal MIME validation, so we only enforce size via streamUpload limits.
  const { files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    }

    // Read from disk — repairPdf() performs its own header search internally.
    const buffer = await readFile(file.path)
    const result = await repairPdf(buffer)

    const outputName = safeFilename(`repaired-${file.filename}`)

    return new NextResponse(result.data as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${outputName}"`,
        'X-Repair-Step': result.step,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[repair-pdf]', error)

    if (error instanceof UnrepairableError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 422 })
    }

    const message = error instanceof Error ? error.message : 'Failed to repair PDF'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    await cleanup()
  }
}
