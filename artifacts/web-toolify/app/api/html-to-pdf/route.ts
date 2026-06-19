import { NextRequest, NextResponse } from 'next/server'
import { htmlToPdfPuppeteer, urlToPdfPuppeteer } from '@/lib/processing/puppeteer-pdf'
import { streamUpload, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRouteRequest } from '@/lib/route-analytics'
import { getToolGuardResponse } from '@/lib/tool-guard'
import { applyToolRateLimit } from '@/lib/middleware/rate-limit'
import { acquireGuard } from '@/lib/concurrency-guard'
import { recordToolEvent } from '@/lib/tool-registry'
import { PDFDocument } from 'pdf-lib'

export const runtime = 'nodejs'
export const maxDuration = 120

async function getPageCount(buffer: Buffer): Promise<number> {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    return doc.getPageCount()
  } catch {
    return 1
  }
}

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
    const marginSize  = (fields['marginSize']  as 'none' | 'small' | 'big')  ?? 'small'
    const screenWidth = parseInt(fields['screenWidth'] ?? '1280') || 1280
    const oneLongPage = fields['oneLongPage'] === 'true'
    const blockAds    = fields['blockAds']    === 'true'
    const removePopups = fields['removePopups'] === 'true'
    const htmlContent = fields['html'] ?? null
    const urlInput    = fields['url']  ?? null

    const opts = { pageSize, orientation, marginSize, screenWidth, oneLongPage, blockAds, removePopups }

    const file = files.find((f) => f.fieldname === 'file')

    // ── URL mode ─────────────────────────────────────────────────────────
    if (urlInput) {
      let parsedUrl: URL
      try {
        parsedUrl = new URL(urlInput)
      } catch {
        return NextResponse.json({ error: 'Invalid URL provided' }, { status: 400 })
      }
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return NextResponse.json({ error: 'Only http and https URLs are supported' }, { status: 400 })
      }

      const release = await acquireGuard('libreoffice')
      let pdfBuffer: Buffer
      try {
        pdfBuffer = await urlToPdfPuppeteer(urlInput, opts)
      } finally {
        release()
      }

      const durationMs = Date.now() - start
      const baseName = safeFilename(parsedUrl.hostname)
      const pageCount = await getPageCount(pdfBuffer)
      trackRouteRequest(request, { tool: 'html-to-pdf', fileSizeB: 0, format: 'url', success: true, durationMs })
      recordToolEvent('html-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: 0, engine: 'wkhtmltopdf' })

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type':        'application/pdf',
          'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
          'X-Page-Count':        pageCount.toString(),
          'Cache-Control':       'no-store',
        },
      })
    }

    // ── HTML content / file mode ──────────────────────────────────────────
    let html: string
    let baseName = 'document'

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
      return NextResponse.json({ error: 'No HTML file, content, or URL provided' }, { status: 400 })
    }

    const release = await acquireGuard('libreoffice')
    let pdfBuffer: Buffer
    try {
      pdfBuffer = await htmlToPdfPuppeteer(html, opts)
    } finally {
      release()
    }

    const durationMs = Date.now() - start
    const pageCount = await getPageCount(pdfBuffer)
    trackRouteRequest(request, { tool: 'html-to-pdf', fileSizeB: file?.size ?? html.length, format: 'html', success: true, durationMs })
    recordToolEvent('html-to-pdf', { ts: Date.now(), success: true, durationMs, fileSizeB: file?.size ?? html.length, engine: 'wkhtmltopdf' })

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'X-Page-Count':        pageCount.toString(),
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    const durationMs = Date.now() - start
    const status = (error as { _status?: number })._status ?? 500
    const msg = error instanceof Error ? error.message : 'Failed to convert HTML to PDF'
    console.error('[html-to-pdf]', error)
    trackRouteRequest(request, { tool: 'html-to-pdf', fileSizeB: files[0]?.size, format: 'html', success: false, durationMs, errorMsg: msg })
    recordToolEvent('html-to-pdf', { ts: Date.now(), success: false, durationMs, fileSizeB: files[0]?.size, engine: 'wkhtmltopdf', error: msg })
    return NextResponse.json({ error: msg }, { status })
  } finally {
    await cleanup()
  }
}
