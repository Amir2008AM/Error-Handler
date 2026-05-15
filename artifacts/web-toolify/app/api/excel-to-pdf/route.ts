import { NextRequest, NextResponse } from 'next/server'
import { DocumentConverter } from '@/lib/processing/document-converter'
import { streamUpload, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { acquireGuard } from '@/lib/concurrency-guard'
import { recordToolEvent } from '@/lib/tool-registry'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const guard = getToolGuardResponse('excel-to-pdf')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'excel-to-pdf')
  if (rateLimited) return rateLimited

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const fileName = file.filename.toLowerCase()
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be an Excel file (.xlsx, .xls, or .csv)' },
        { status: 400 }
      )
    }

    const pageSize    = (fields['pageSize']    as 'a4' | 'letter' | 'legal') ?? 'a4'
    const orientation = (fields['orientation'] as 'portrait' | 'landscape')  ?? 'landscape'
    // fontSize=0 triggers auto-detection in the enterprise pipeline
    const fontSizeRaw = parseInt(fields['fontSize'] ?? '0') || 0
    const fontSize    = fontSizeRaw > 0 ? fontSizeRaw : 0

    const buffer = await readFile(file.path)

    const release = await acquireGuard('python')
    let result: Awaited<ReturnType<DocumentConverter['excelToPdf']>>
    try {
      const converter = new DocumentConverter()
      result = await converter.excelToPdf(buffer, { pageSize, orientation, fontSize })
    } finally {
      release()
    }

    const durationMs = Date.now() - start
    const baseName = safeFilename(file.filename.replace(/\.(xlsx?|xls|csv)$/i, ''))
    trackRouteRequest(request, { tool: 'excel-to-pdf', fileSizeB: file.size, format: 'xlsx', success: true, durationMs })
    recordToolEvent('excel-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file.size, engine: 'python-reportlab' })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
        'X-Engine-Used': result.engine ?? 'python-reportlab',
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const status = (error as { _status?: number })._status ?? 500
    const msg = error instanceof Error ? error.message : 'Failed to convert Excel to PDF'
    console.error('[excel-to-pdf]', error)
    trackRouteRequest(request, { tool: 'excel-to-pdf', fileSizeB: files[0]?.size, format: 'xlsx', success: false, durationMs, errorMsg: msg })
    recordToolEvent('excel-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'python-reportlab', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
