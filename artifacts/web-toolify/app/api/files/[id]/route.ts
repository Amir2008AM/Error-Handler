/**
 * File Download API Route
 *
 * Streams processed files from temporary storage. The file payload is
 * piped from disk → Node Readable → Web ReadableStream → response body
 * so even multi-hundred-MB downloads never hit the JS heap.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTempStorage } from '@/lib/storage'
import { nodeToWebStream } from '@/lib/processing/stream-utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeContentDisposition(name: string): string {
  // RFC 5987 — give clients an ASCII fallback and a UTF-8 filename*.
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const storage = getTempStorage()
    const result = await storage.getStream(id)

    if (!result) {
      return NextResponse.json(
        { error: 'File not found or expired' },
        { status: 404 }
      )
    }

    const { meta, stream } = result
    const body = nodeToWebStream(stream)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': meta.mimeType,
        'Content-Length': meta.size.toString(),
        'Content-Disposition': safeContentDisposition(meta.fileName),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('[files/get]', error)
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const storage = getTempStorage()
    const deleted = await storage.delete(id)

    if (!deleted) {
      return NextResponse.json(
        { error: 'File not found or already deleted' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, message: 'File deleted' })
  } catch (error) {
    console.error('[files/delete]', error)
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    )
  }
}
