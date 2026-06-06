import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { mapWithConcurrency } from '@/lib/processing/concurrency'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  const guard = getToolGuardResponse('merge-pdf')
  if (guard) return guard

  const { files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const pdfEntries = files
      .filter((f) => f.fieldname.startsWith('pdf_'))
      .map((f) => {
        const index = parseInt(f.fieldname.replace('pdf_', ''), 10)
        return { index: isNaN(index) ? 0 : index, file: f }
      })
      .sort((a, b) => a.index - b.index)

    if (pdfEntries.length < 2) {
      return NextResponse.json({ error: 'At least 2 PDF files are required' }, { status: 400 })
    }

    for (const { file } of pdfEntries) {
      const err = await validateStreamedFile(file, 'pdf')
      if (err) return NextResponse.json({ error: err }, { status: 400 })
    }

    const fileBuffers = await mapWithConcurrency(pdfEntries, 3, ({ file }) =>
      readFileAsArrayBuffer(file.path)
    )

    const totalSize = pdfEntries.reduce((s, e) => s + e.file.size, 0)
    const result = await pdf.merge({ files: fileBuffers as ArrayBuffer[] })

    if (!result.success || !result.data) {
      trackRouteRequest(req, { tool: 'merge-pdf', fileSizeB: totalSize, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: result.error ?? 'merge failed' })
      return NextResponse.json(
        { error: result.error || 'Failed to merge PDFs' },
        { status: 500 }
      )
    }

    trackRouteRequest(req, { tool: 'merge-pdf', fileSizeB: totalSize, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="toolify-merged.pdf"',
        'X-Page-Count': (result.metadata?.pageCount ?? 0).toString(),
        'X-Processing-Time': `${result.metadata?.processingTime ?? 0}ms`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[merge-pdf]', err)
    trackRouteRequest(req, { tool: 'merge-pdf', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: err instanceof Error ? err.message : 'unknown' })
    return NextResponse.json({ error: 'Failed to merge PDFs' }, { status: 500 })
  } finally {
    await cleanup()
  }
}
