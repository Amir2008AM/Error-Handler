import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { validateFile, MAX_FILE_SIZE } from '@/lib/validation'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const fileEntries: { index: number; file: File }[] = []

    for (const [key, value] of formData.entries()) {
      if (key.startsWith('pdf_') && value instanceof File) {
        const index = parseInt(key.replace('pdf_', ''), 10)
        fileEntries.push({ index, file: value })
      }
    }

    if (fileEntries.length < 2) {
      return NextResponse.json({ error: 'At least 2 PDF files are required' }, { status: 400 })
    }

    // Validate each file
    for (const { file } of fileEntries) {
      const err = validateFile(file, 'pdf')
      if (err) return err
    }

    // Sort by user-defined order
    fileEntries.sort((a, b) => a.index - b.index)

    // Convert files to array buffers
    const files = await Promise.all(
      fileEntries.map(async ({ file }) => await file.arrayBuffer())
    )

    const result = await pdf.merge({ files })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || 'Failed to merge PDFs' },
        { status: 500 }
      )
    }

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
    return NextResponse.json({ error: 'Failed to merge PDFs' }, { status: 500 })
  }
}
