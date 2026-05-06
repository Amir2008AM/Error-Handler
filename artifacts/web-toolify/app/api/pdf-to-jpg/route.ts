import { NextRequest, NextResponse } from 'next/server'
import { PdfToImageConverter } from '@/lib/processing/pdf-to-image'
import { createZipFromFiles } from '@/lib/processing/file-utils'
import { streamUpload, validateStreamedFile, readFile } from '@/lib/stream-upload'
import { safeFilename } from '@/lib/safe-filename'
import { trackRoute } from '@/lib/route-analytics'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const { fields, files, cleanup } = await streamUpload(request).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  const start = Date.now()

  try {
    const file = files.find((f) => f.fieldname === 'file')
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })

    const validationError = await validateStreamedFile(file, 'pdf')
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    const format   = ((fields['format'] as 'jpg' | 'png' | 'webp') || 'jpg')
    const quality  = parseInt(fields['quality'] ?? '90', 10) || 90
    const dpi      = parseInt(fields['dpi']     ?? '150', 10) || 150
    const pagesStr = fields['pages'] ?? null

    const buffer = await readFile(file.path)

    let pages: number[] | 'all' = 'all'
    if (pagesStr && pagesStr !== 'all') {
      try {
        pages = []
        const parts = pagesStr.split(',')
        for (const part of parts) {
          if (part.includes('-')) {
            const [start2, end] = part.split('-').map(Number)
            for (let i = start2; i <= end; i++) {
              pages.push(i)
            }
          } else {
            pages.push(parseInt(part, 10))
          }
        }
        pages = pages.filter((p) => !isNaN(p) && p > 0)
      } catch {
        pages = 'all'
      }
    }

    const converter = new PdfToImageConverter()

    const results = await converter.convert(buffer, {
      format,
      quality,
      dpi,
      pages,
    })

    if (results.length === 0) {
      trackRoute({ tool: 'pdf-to-jpg', fileSizeB: file.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: 'No pages converted' })
      return NextResponse.json(
        { error: 'No pages could be converted' },
        { status: 500 }
      )
    }

    if (results.length === 1) {
      const safeOutputName = safeFilename(results[0].fileName)
      trackRoute({ tool: 'pdf-to-jpg', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })
      return new NextResponse(results[0].buffer, {
        headers: {
          'Content-Type': results[0].mimeType,
          'Content-Disposition': `attachment; filename="${safeOutputName}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const zipBuffer = await createZipFromFiles(
      results.map((r) => ({
        name: r.fileName,
        buffer: r.buffer,
      }))
    )

    const baseName = safeFilename(file.filename.replace(/\.pdf$/i, ''))
    trackRoute({ tool: 'pdf-to-jpg', fileSizeB: file.size, format: 'pdf', success: true, durationMs: Date.now() - start })

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}-images.zip"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[pdf-to-jpg]', error)
    trackRoute({ tool: 'pdf-to-jpg', fileSizeB: files[0]?.size, format: 'pdf', success: false, durationMs: Date.now() - start, errorMsg: error instanceof Error ? error.message : 'unknown' })
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert PDF to images'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  } finally {
    await cleanup()
  }
}
