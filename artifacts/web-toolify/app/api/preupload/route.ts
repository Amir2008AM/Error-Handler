/**
 * POST /api/preupload
 *
 * Accepts a file upload and stores it temporarily.
 * Returns { uploadId } that conversion endpoints can reference.
 * Entry expires after 10 minutes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { streamUpload } from '@/lib/stream-upload'
import { createPreUploadId, setPreUpload } from '@/lib/preupload-store'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: NextRequest) {
  const { files } = await streamUpload(req).catch((err) => {
    throw Object.assign(err, { _status: 400 })
  })

  try {
    const file = files[0]
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const uploadId = createPreUploadId()

    setPreUpload({
      uploadId,
      path: file.path,
      dir: require('node:path').dirname(file.path),
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
    })

    return NextResponse.json({ uploadId, size: file.size, filename: file.filename })
  } catch (err) {
    const status = (err as { _status?: number })._status ?? 500
    const msg = err instanceof Error ? err.message : 'Pre-upload failed'
    return NextResponse.json({ error: msg }, { status })
  }
  // NOTE: we do NOT call cleanup() — the preupload-store manages the temp dir lifetime
}
