import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('pdf-to-word')
  if (guard) return guard

  const { files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'pdf')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const title  = safeFilename(file.filename.replace(/\.pdf$/i, ''))
    const buffer = await readFileAsArrayBuffer(file.path)

    const result = await pdf.toWord({ file: buffer })

    if (!result.success || !result.data) {
      trackRouteRequest(req, { tool: 'pdf-to-word', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'pdf-to-word failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to convert PDF to Word' },
        { status: 500 }
      )
    }

    trackRouteRequest(req, { tool: 'pdf-to-word', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

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
    trackRouteRequest(req, { tool: 'pdf-to-word', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to convert PDF to Word' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
