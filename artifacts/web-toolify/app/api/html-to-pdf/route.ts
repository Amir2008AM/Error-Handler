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
  const guard = getToolGuardResponse('html-to-pdf')
  if (guard) return guard

  const rateLimited = applyToolRateLimit(request, 'html-to-pdf')
  if (rateLimited) return rateLimited

  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const pageSize    = (fields['pageSize']    as 'a4' | 'letter' | 'legal') ?? 'a4'
    const orientation = (fields['orientation'] as 'portrait' | 'landscape')  ?? 'portrait'
    const fontSize    = parseInt(fields['fontSize'] ?? '12') || 12
    const htmlContent = fields['html'] ?? null

    let html: string
    let baseName = 'document'

    const file = files.find((f) => f.fieldname === 'file')

    if (file) {
      const fileName = file.filename.toLowerCase()
      if (!fileName.endsWith('.html') && !fileName.endsWith('.htm')) {
        return NextResponse.json(
          { error: 'File must be an HTML file (.html or .htm)' },
          { status: 400 }
        )
      }

      const buffer = await readFile(file.path)
      html     = new TextDecoder('utf-8').decode(buffer)
      baseName = safeFilename(file.filename.replace(/\.(html?|htm)$/i, ''))
    } else if (htmlContent) {
      html = htmlContent
    } else {
      return NextResponse.json({ error: 'No HTML file or content provided' }, { status: 400 })
    }

    const release = await acquireGuard('libreoffice')
    let result: Awaited<ReturnType<DocumentConverter['htmlToPdf']>>
    try {
      const converter = new DocumentConverter()
      result = await converter.htmlToPdf(html, { pageSize, orientation, fontSize })
    } finally {
      release()
    }

    const durationMs = Date.now() - start
    trackRouteRequest(request, { tool: 'html-to-pdf', fileSizeB: file?.size ?? html.length, format: 'html', success: true, durationMs })
    recordToolEvent('html-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file?.size ?? html.length, engine: 'libreoffice' })

    return new NextResponse(result.buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count': result.pageCount.toString(),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const status = (error as { _status?: number })._status ?? 500
    const msg = error instanceof Error ? error.message : 'Failed to convert HTML to PDF'
    console.error('[html-to-pdf]', error)
    trackRouteRequest(request, { tool: 'html-to-pdf', fileSizeB: files[0]?.size, format: 'html', success: false, durationMs, errorMsg: msg })
    recordToolEvent('html-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'libreoffice', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
