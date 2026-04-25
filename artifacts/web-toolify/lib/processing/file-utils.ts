/**
 * File Utilities Module
 * Common utilities for file handling and validation
 */

import JSZip from 'jszip'

// File type detection using magic bytes
const FILE_SIGNATURES: { [key: string]: number[] } = {
  // Images
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF, need to check 8-11 for WEBP
  bmp: [0x42, 0x4d],
  tiff_le: [0x49, 0x49, 0x2a, 0x00],
  tiff_be: [0x4d, 0x4d, 0x00, 0x2a],
  // Documents
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  zip: [0x50, 0x4b, 0x03, 0x04], // PK
  docx: [0x50, 0x4b, 0x03, 0x04], // Same as ZIP (OOXML)
}

export type FileType = 
  | 'jpeg' 
  | 'png' 
  | 'gif' 
  | 'webp' 
  | 'bmp' 
  | 'tiff' 
  | 'pdf' 
  | 'zip' 
  | 'docx'
  | 'unknown'

export interface FileInfo {
  type: FileType
  extension: string
  mimeType: string
  size: number
}

/**
 * Detect file type from magic bytes
 */
export function detectFileType(buffer: ArrayBuffer | Buffer): FileType {
  const bytes = Buffer.isBuffer(buffer) 
    ? buffer 
    : Buffer.from(buffer)

  if (bytes.length < 4) return 'unknown'

  const header = Array.from(bytes.subarray(0, 12))

  // Check JPEG
  if (matchSignature(header, FILE_SIGNATURES.jpeg)) {
    return 'jpeg'
  }

  // Check PNG
  if (matchSignature(header, FILE_SIGNATURES.png)) {
    return 'png'
  }

  // Check GIF
  if (matchSignature(header, FILE_SIGNATURES.gif)) {
    return 'gif'
  }

  // Check WebP (RIFF....WEBP)
  if (matchSignature(header, FILE_SIGNATURES.webp)) {
    if (header[8] === 0x57 && header[9] === 0x45 && 
        header[10] === 0x42 && header[11] === 0x50) {
      return 'webp'
    }
  }

  // Check BMP
  if (matchSignature(header, FILE_SIGNATURES.bmp)) {
    return 'bmp'
  }

  // Check TIFF
  if (matchSignature(header, FILE_SIGNATURES.tiff_le) || 
      matchSignature(header, FILE_SIGNATURES.tiff_be)) {
    return 'tiff'
  }

  // Check PDF
  if (matchSignature(header, FILE_SIGNATURES.pdf)) {
    return 'pdf'
  }

  // Check ZIP/DOCX
  if (matchSignature(header, FILE_SIGNATURES.zip)) {
    // Could be ZIP or DOCX, need deeper inspection
    return 'zip'
  }

  return 'unknown'
}

function matchSignature(header: number[], signature: number[]): boolean {
  return signature.every((byte, index) => header[index] === byte)
}

/**
 * Get file info from buffer
 */
export function getFileInfo(buffer: ArrayBuffer | Buffer): FileInfo {
  const type = detectFileType(buffer)
  const size = buffer.byteLength

  const typeInfo: Record<FileType, { extension: string; mimeType: string }> = {
    jpeg: { extension: 'jpg', mimeType: 'image/jpeg' },
    png: { extension: 'png', mimeType: 'image/png' },
    gif: { extension: 'gif', mimeType: 'image/gif' },
    webp: { extension: 'webp', mimeType: 'image/webp' },
    bmp: { extension: 'bmp', mimeType: 'image/bmp' },
    tiff: { extension: 'tiff', mimeType: 'image/tiff' },
    pdf: { extension: 'pdf', mimeType: 'application/pdf' },
    zip: { extension: 'zip', mimeType: 'application/zip' },
    docx: { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    unknown: { extension: 'bin', mimeType: 'application/octet-stream' },
  }

  return {
    type,
    ...typeInfo[type],
    size,
  }
}

/**
 * Validate file type
 */
export function validateFileType(
  buffer: ArrayBuffer | Buffer,
  allowedTypes: FileType[]
): { valid: boolean; detectedType: FileType; error?: string } {
  const detectedType = detectFileType(buffer)

  if (allowedTypes.includes(detectedType)) {
    return { valid: true, detectedType }
  }

  return {
    valid: false,
    detectedType,
    error: `Invalid file type. Expected ${allowedTypes.join(' or ')}, got ${detectedType}`,
  }
}

/**
 * Check if buffer is an image
 */
export function isImage(buffer: ArrayBuffer | Buffer): boolean {
  const type = detectFileType(buffer)
  return ['jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(type)
}

/**
 * Check if buffer is a PDF
 */
export function isPDF(buffer: ArrayBuffer | Buffer): boolean {
  return detectFileType(buffer) === 'pdf'
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0
  return Math.round((1 - compressedSize / originalSize) * 100)
}

/**
 * Generate safe filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 255)
}

/**
 * Get filename without extension
 */
export function getBasename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '')
}

/**
 * Get file extension
 */
export function getExtension(filename: string): string {
  const match = filename.match(/\.([^/.]+)$/)
  return match ? match[1].toLowerCase() : ''
}

/**
 * Create a ZIP archive from multiple files
 */
export async function createZipArchive(
  files: { name: string; data: Buffer | ArrayBuffer }[]
): Promise<Buffer> {
  const zip = new JSZip()

  for (const file of files) {
    zip.file(file.name, file.data)
  }

  return await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}

/**
 * Extract files from a ZIP archive
 */
export async function extractZipArchive(
  zipBuffer: ArrayBuffer | Buffer
): Promise<{ name: string; data: Buffer }[]> {
  const zip = await JSZip.loadAsync(zipBuffer)
  const files: { name: string; data: Buffer }[] = []

  for (const [name, file] of Object.entries(zip.files)) {
    if (!file.dir) {
      const data = await file.async('nodebuffer')
      files.push({ name, data })
    }
  }

  return files
}

/**
 * Parse page range string (e.g., "1-3,5,7-9")
 */
export function parsePageRange(
  rangeStr: string,
  totalPages: number
): number[] {
  const pages: number[] = []
  const segments = rangeStr.split(',').map((s) => s.trim())

  for (const seg of segments) {
    if (seg.includes('-')) {
      const [startStr, endStr] = seg.split('-')
      const start = parseInt(startStr.trim(), 10)
      const end = parseInt(endStr.trim(), 10)

      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.max(1, start); i <= Math.min(end, totalPages); i++) {
          if (!pages.includes(i)) pages.push(i)
        }
      }
    } else {
      const page = parseInt(seg, 10)
      if (!isNaN(page) && page >= 1 && page <= totalPages && !pages.includes(page)) {
        pages.push(page)
      }
    }
  }

  return pages.sort((a, b) => a - b)
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  maxSizeMB: number
): { valid: boolean; error?: string } {
  const maxBytes = maxSizeMB * 1024 * 1024

  if (size > maxBytes) {
    return {
      valid: false,
      error: `File size (${formatFileSize(size)}) exceeds maximum allowed (${maxSizeMB}MB)`,
    }
  }

  return { valid: true }
}

/**
 * Batch process files with concurrency control
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3
): Promise<R[]> {
  const results: R[] = new Array(items.length)

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => processor(item, i + batchIndex))
    )
    batchResults.forEach((result, batchIndex) => {
      results[i + batchIndex] = result
    })
  }

  return results
}
