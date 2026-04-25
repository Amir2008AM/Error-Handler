import { NextRequest, NextResponse } from 'next/server'
import { PdfToImageConverter } from '@/lib/processing/pdf-to-image'
import { createZipFromFiles } from '@/lib/processing/file-utils'
import { validateFile } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const format = (formData.get('format') as 'jpg' | 'png' | 'webp') || 'jpg'
    const quality = parseInt(formData.get('quality') as string) || 90
    const dpi = parseInt(formData.get('dpi') as string) || 150
    const pagesStr = formData.get('pages') as string | null

    const validationError = validateFile(file, 'pdf')
    if (validationError) return validationError

    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parse pages parameter
    let pages: number[] | 'all' = 'all'
    if (pagesStr && pagesStr !== 'all') {
      try {
        // Support formats like "1,3,5" or "1-5" or "1,3-5,7"
        pages = []
        const parts = pagesStr.split(',')
        for (const part of parts) {
          if (part.includes('-')) {
            const [start, end] = part.split('-').map(Number)
            for (let i = start; i <= end; i++) {
              pages.push(i)
            }
          } else {
            pages.push(parseInt(part))
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
      return NextResponse.json(
        { error: 'No pages could be converted' },
        { status: 500 }
      )
    }

    // If single page, return the image directly
    if (results.length === 1) {
      return new NextResponse(results[0].buffer, {
        headers: {
          'Content-Type': results[0].mimeType,
          'Content-Disposition': `attachment; filename="${results[0].fileName}"`,
        },
      })
    }

    // Multiple pages - create ZIP
    const zipBuffer = await createZipFromFiles(
      results.map((r) => ({
        name: r.fileName,
        buffer: r.buffer,
      }))
    )

    const baseName = file.name.replace(/\.pdf$/i, '')

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${baseName}-images.zip"`,
      },
    })
  } catch (error) {
    console.error('PDF to JPG error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to convert PDF to images'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
