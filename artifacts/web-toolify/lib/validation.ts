import { NextResponse } from 'next/server'

/** Default upload ceiling. Per-tool routes may override via `validateFile(opts)`. */
export const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

/**
 * Magic-byte signatures we trust over `file.type` (which is just the
 * client's claim and trivially spoofed).
 *
 * Note: WebP/MP4/MOV need to inspect bytes 0..11; the rest are 0..3.
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

export interface ValidateOptions {
  /** Override the default 50MB limit for this call. */
  maxBytes?: number
  /** Allow zero-byte files (rare; default false). */
  allowEmpty?: boolean
  /** Verify magic bytes match the declared kind (default true). */
  checkMagicBytes?: boolean
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Read just enough bytes off the front of a `File` to inspect its magic
 * header without buffering the whole upload.
 */
async function readHeader(file: File, n: number): Promise<Buffer> {
  const slice = file.slice(0, Math.min(n, file.size))
  const ab = await slice.arrayBuffer()
  return Buffer.from(ab)
}

function isPdfHeader(h: Buffer): boolean {
  return h.length >= 4 && h.subarray(0, 4).equals(PDF_SIG)
}

function isImageHeader(h: Buffer): boolean {
  if (h.length < 4) return false
  if (h.subarray(0, 4).equals(PNG_SIG)) return true
  if (h.subarray(0, 3).equals(JPEG_SIG)) return true
  if (h.subarray(0, 4).equals(GIF_SIG)) return true
  if (h.subarray(0, 2).equals(BMP_SIG)) return true
  if (h.subarray(0, 4).equals(TIFF_LE)) return true
  if (h.subarray(0, 4).equals(TIFF_BE)) return true
  if (
    h.length >= 12 &&
    h.subarray(0, 4).equals(RIFF_SIG) &&
    h.subarray(8, 12).equals(WEBP_SIG)
  ) {
    return true
  }
  return false
}

/**
 * Validate a single uploaded file. Returns a NextResponse on failure or
 * `null` on success. When `checkMagicBytes` is true (default) the
 * header is sniffed asynchronously without buffering the full file.
 */
export async function validateFile(
  file: File | null | undefined,
  type: FileKind,
  opts: ValidateOptions = {}
): Promise<NextResponse | null> {
  const max = opts.maxBytes ?? MAX_FILE_SIZE
  const allowEmpty = opts.allowEmpty ?? false
  const checkMagic = opts.checkMagicBytes ?? true

  if (!file) return jsonError('No file provided.', 400)
  if (!allowEmpty && file.size === 0) {
    return jsonError('The uploaded file is empty.', 400)
  }
  if (file.size > max) {
    return jsonError(
      `File too large. Maximum size is ${Math.round(max / 1024 / 1024)}MB.`,
      413
    )
  }

  if (type === 'any') return null

  if (checkMagic) {
    const header = await readHeader(file, 12)
    if (type === 'pdf' && !isPdfHeader(header)) {
      return jsonError('Invalid or corrupted PDF file.', 400)
    }
    if (type === 'image' && !isImageHeader(header)) {
      return jsonError('Invalid or unsupported image file.', 400)
    }
  } else {
    // Lightweight type/extension check fallback.
    if (type === 'pdf') {
      const isPdf =
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) return jsonError('Only PDF files are accepted.', 400)
    }
    if (type === 'image') {
      if (!file.type.startsWith('image/')) {
        return jsonError('Only image files are accepted.', 400)
      }
    }
  }

  return null
}

export async function validateFiles(
  files: (File | null | undefined)[],
  type: FileKind,
  opts: ValidateOptions = {}
): Promise<NextResponse | null> {
  for (const file of files) {
    const err = await validateFile(file, type, opts)
    if (err) return err
  }
  return null
}
