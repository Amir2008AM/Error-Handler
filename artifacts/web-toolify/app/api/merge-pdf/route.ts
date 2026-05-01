import { NextRequest, NextResponse } from 'next/server'
import { pdf } from '@/lib/processing'
import { streamUpload, validateStreamedFile, readFileAsArrayBuffer } from '@/lib/stream-upload'
import { mapWithConcurrency } from '@/lib/processing/concurrency'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const { files, cleanup } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    // Collect files with fieldnames like pdf_0, pdf_1, ...
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

    // Load buffers from disk with bounded concurrency — avoids loading all
    // large PDFs into RAM simultaneously (e.g. 10 × 20 MB = 200 MB spike).
    const fileBuffers = await mapWithConcurrency(pdfEntries, 3, ({ file }) =>
      readFileAsArrayBuffer(file.path)
    )

    const result = await pdf.merge({ files: fileBuffers as ArrayBuffer[] })

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
  } finally {
    await cleanup()
  }
}
