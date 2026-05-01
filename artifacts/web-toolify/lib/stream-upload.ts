/**
 * Streaming multipart upload handler.
 *
 * Instead of `await request.formData()` (which buffers the ENTIRE request
 * body into RAM before returning), this module pipes the raw HTTP body through
 * busboy and writes each file field directly to a temp file on disk as bytes
 * arrive over the network.
 *
 * Benefits:
 *  - Zero RAM usage for the file during the upload phase
 *  - No backpressure on the TCP receive window → upload proceeds at network speed
 *  - Processing can start immediately after the last byte lands on disk
 *  - Peak memory drops from ~2× file size to ~1× file size (one copy for processing)
 */

import busboy from 'busboy'
import { createWriteStream, createReadStream } from 'node:fs'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import type { NextRequest } from 'next/server'

/** Max upload size accepted by the streaming parser (matches next.config). */
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // 100 MB

export interface StreamedFile {
  /** Form field name (e.g. "file"). */
  fieldname: string
  /** Original filename reported by the browser. */
  filename: string
  /** MIME type reported by the browser (use magic-byte check for real validation). */
  mimeType: string
  /** Absolute path to the temp file on disk. */
  path: string
  /** Number of bytes written. */
  size: number
}

export interface StreamUploadResult {
  /** Non-file form fields, keyed by field name. */
  fields: Record<string, string>
  /** All uploaded files in order of arrival. */
  files: StreamedFile[]
  /** Temp directory that holds all files. Call this when done with the files. */
  cleanup: () => Promise<void>
}

/**
 * Stream a multipart request body to disk without buffering it in memory.
 *
 * Usage:
 * ```typescript
 * const { fields, files, cleanup } = await streamUpload(request)
 * try {
 *   const file = files[0]            // already on disk
 *   const buf = await readFile(file.path) // one copy into RAM, only if needed
 *   // ... process ...
 * } finally {
 *   await cleanup()
 * }
 * ```
 */
export async function streamUpload(request: NextRequest): Promise<StreamUploadResult> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Expected multipart/form-data request')
  }

  const dir = await mkdtemp(join(tmpdir(), 'upload-'))
  const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => {})

  const fields: Record<string, string> = {}
  const files: StreamedFile[] = []

  try {
    await new Promise<void>((resolve, reject) => {
      const bb = busboy({
        headers: { 'content-type': contentType },
        limits: {
          fileSize: MAX_UPLOAD_BYTES,
          files: 20,
          fields: 50,
        },
      })

      // Collect all file write promises so we wait for disk flushes before resolving.
      const writePromises: Promise<void>[] = []
      let fileIndex = 0

      bb.on('field', (name, value) => {
        fields[name] = value
      })

      bb.on('file', (fieldname, fileStream, info) => {
        const { filename, mimeType } = info
        const idx = fileIndex++
        const filePath = join(dir, `${idx}-${Date.now()}.tmp`)
        let size = 0
        let limitHit = false

        const writePromise = new Promise<void>((res, rej) => {
          const ws = createWriteStream(filePath)

          fileStream.on('data', (chunk: Buffer) => {
            size += chunk.length
          })

          // busboy emits 'limit' when fileSize limit is exceeded; abort cleanly.
          fileStream.on('limit', () => {
            limitHit = true
            ws.destroy()
            rej(new Error(`File "${filename}" exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024}MB upload limit`))
          })

          fileStream.on('error', rej)
          ws.on('error', rej)

          ws.on('finish', () => {
            if (!limitHit) {
              files.push({ fieldname, filename, mimeType, path: filePath, size })
              res()
            }
          })

          fileStream.pipe(ws)
        })

        writePromises.push(writePromise)
      })

      bb.on('error', reject)

      // busboy emits 'close' when the entire multipart body has been parsed.
      // We then wait for all file write streams to finish flushing to disk.
      bb.on('close', () => {
        Promise.all(writePromises).then(() => resolve()).catch(reject)
      })

      // Convert the Web API ReadableStream (Next.js request.body) to a Node.js
      // Readable so we can pipe it into busboy.
      if (!request.body) {
        reject(new Error('Request body is empty'))
        return
      }

      const nodeStream = Readable.fromWeb(
        request.body as Parameters<typeof Readable.fromWeb>[0]
      )
      nodeStream.on('error', reject)
      nodeStream.pipe(bb)
    })

    return { fields, files, cleanup }
  } catch (err) {
    await cleanup()
    throw err
  }
}

/**
 * Read the first `n` bytes of a file on disk — used for magic-byte validation
 * after a streamed upload, avoiding loading the whole file into memory.
 */
export async function readFileHeader(filePath: string, n: number = 12): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let read = 0
    const stream = createReadStream(filePath, { start: 0, end: n - 1 })
    stream.on('data', (chunk: Buffer | string) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      chunks.push(buf)
      read += buf.length
      if (read >= n) stream.destroy()
    })
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('close', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

/**
 * Validate a streamed file by sniffing its magic bytes from disk.
 * Returns an error message on failure, or null on success.
 */
const PDF_SIG = Buffer.from('%PDF', 'ascii')
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47])
const JPEG_SIG = Buffer.from([0xff, 0xd8, 0xff])
const GIF_SIG = Buffer.from('GIF8', 'ascii')
const BMP_SIG = Buffer.from('BM', 'ascii')
const RIFF_SIG = Buffer.from('RIFF', 'ascii')
const WEBP_SIG = Buffer.from('WEBP', 'ascii')
const TIFF_LE = Buffer.from([0x49, 0x49, 0x2a, 0x00])
const TIFF_BE = Buffer.from([0x4d, 0x4d, 0x00, 0x2a])

export type FileKind = 'pdf' | 'image' | 'any'

export async function validateStreamedFile(
  file: StreamedFile,
  type: FileKind,
  maxBytes: number = MAX_UPLOAD_BYTES
): Promise<string | null> {
  if (file.size === 0) return 'The uploaded file is empty.'
  if (file.size > maxBytes) {
    return `File too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)}MB.`
  }
  if (type === 'any') return null

  const header = await readFileHeader(file.path, 12)

  if (type === 'pdf') {
    if (header.length < 4 || !header.subarray(0, 4).equals(PDF_SIG)) {
      return 'Invalid or corrupted PDF file.'
    }
  }

  if (type === 'image') {
    const ok =
      (header.length >= 4 && header.subarray(0, 4).equals(PNG_SIG)) ||
      (header.length >= 3 && header.subarray(0, 3).equals(JPEG_SIG)) ||
      (header.length >= 4 && header.subarray(0, 4).equals(GIF_SIG)) ||
      (header.length >= 2 && header.subarray(0, 2).equals(BMP_SIG)) ||
      (header.length >= 4 && header.subarray(0, 4).equals(TIFF_LE)) ||
      (header.length >= 4 && header.subarray(0, 4).equals(TIFF_BE)) ||
      (header.length >= 12 &&
        header.subarray(0, 4).equals(RIFF_SIG) &&
        header.subarray(8, 12).equals(WEBP_SIG))
    if (!ok) return 'Invalid or unsupported image file.'
  }

  return null
}

// Re-export readFile for convenience in routes that need it.
export { readFile }
