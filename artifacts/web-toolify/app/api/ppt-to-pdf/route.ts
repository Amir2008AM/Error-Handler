import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { streamUpload, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('ppt-to-pdf')
  if (guard) return guard

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileName = file.filename.toLowerCase()
    if (!fileName.endsWith('.pptx') && !fileName.endsWith('.ppt')) {
      return NextResponse.json(
        { error: 'File must be a PowerPoint presentation (.pptx or .ppt)' },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 })
    }

    const buffer = await readFile(file.path)
    const converter = new DocumentConverter()
    const result = await converter.pptToPdf(buffer)

    const baseName = safeFilename(file.filename.replace(/\.pptx?$/i, ''))
    trackRouteRequest(request, { tool: 'ppt-to-pdf', fileSizeB: file.size, format: 'pptx', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count':        result.pageCount.toString(),
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[ppt-to-pdf]', error)
    trackRouteRequest(request, { tool: 'ppt-to-pdf', fileSizeB: files[0]?.size, format: 'pptx', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert presentation to PDF'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
