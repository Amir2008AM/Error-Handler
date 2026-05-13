import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { streamUpload, validateStreamedFile, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('pdf-to-ppt')
  if (guard) return guard

  const { files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    if (file.size === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 })
    }

    const buffer = await readFile(file.path)
    const converter = new DocumentConverter()
    const result = await converter.pdfToPresentation(buffer)

    const baseName = safeFilename(file.filename.replace(/\.pdf$/i, ''))
    trackRouteRequest(request, {
      tool: 'pdf-to-ppt',
      fileSizeB: file.size,
      format: 'pdf',
      success: true,
      durationMs: Date.now() - start,
    })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${baseName}.pptx"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[pdf-to-ppt]', error)
    trackRouteRequest(request, {
      tool: 'pdf-to-ppt',
      fileSizeB: files[0]?.size,
      format: 'pdf',
      success: false,
      durationMs: Date.now() - start,
      errorMsg: error instanceof Error ? error.message : 'unknown',
    })
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to convert PDF to PowerPoint'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
