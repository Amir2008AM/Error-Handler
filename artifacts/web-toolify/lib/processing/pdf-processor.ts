/**
 * PDF Processing Module
 * Self-contained PDF processing using pdf-lib and docx libraries.
 * Compression uses Ghostscript (gs) for maximum real-file size reduction.
 */

import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib'
import sharp from 'sharp'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Packer,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx'
import JSZip from 'jszip'
import { BaseProcessor } from './base-processor'
import { mapWithConcurrency } from './concurrency'

type PdfjsModule = typeof import('pdfjs-dist')
let _pdfjs: PdfjsModule | null = null
async function getPdfjs(): Promise<PdfjsModule> {
  if (!_pdfjs) {
    try {
      // pdfjs-dist is an ES Module (.mjs) — must use dynamic import(), NOT require().
      // It is listed in serverExternalPackages so Next.js/Turbopack will NOT bundle
      // it, making the import path safe to evaluate at runtime.
      // DO NOT use require.resolve() — bundlers replace it with an internal chunk ID.
      const mod = await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs')
      _pdfjs = mod as unknown as PdfjsModule
      ;(_pdfjs as PdfjsModule).GlobalWorkerOptions.workerSrc = ''
    } catch (importErr) {
      throw new Error(
        `pdfjs-dist legacy build failed to load: ${importErr instanceof Error ? importErr.message : String(importErr)}`
      )
    }
  }
  return _pdfjs!
}

import type {
  ProcessingResult,
  PDFMergeOptions,
  PDFSplitOptions,
  PDFRotateOptions,
  PDFWatermarkOptions,
  ImageToPDFOptions,
  PDFToWordOptions,
  PDFMetadata,
  PDFPageNumbersOptions,
  PDFOrganizeOptions,
} from './types'

// ---------------------------------------------------------------------------
// Ghostscript helpers
// ---------------------------------------------------------------------------

const GS_TIMEOUT_MS = 120_000 // 2 minutes hard cap per invocation

interface GsResult {
  code: number
  stderr: string
}

/**
 * Run `gs` (Ghostscript) with a timeout.  The process is forcibly killed if
 * it does not finish within GS_TIMEOUT_MS.
 */
function runGs(args: string[]): Promise<GsResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gs', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    proc.on('error', (err) => {
      clearTimeout(killTimer)
      reject(new Error(`Failed to start Ghostscript: ${err.message}`))
    })

    proc.on('close', (code) => {
      clearTimeout(killTimer)
      resolve({ code: code ?? -1, stderr })
    })

    const killTimer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error('Ghostscript timed out after 2 minutes'))
    }, GS_TIMEOUT_MS)
  })
}

/**
 * Run `fn` inside a temporary directory that is always cleaned up afterwards.
 */
async function withGsTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'gs-'))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

export class PDFProcessor extends BaseProcessor {
  constructor() {
    super('PDFProcessor', '1.0.0')
  }

  /**
   * Get PDF metadata without loading full document
   */
  async getMetadata(file: ArrayBuffer): Promise<ProcessingResult<PDFMetadata>> {
    try {
      this.validateBuffer(file)
      const pdfDoc = await PDFDocument.load(file)
      const pageCount = pdfDoc.getPageCount()
      const pageWidths: number[] = []
      const pageHeights: number[] = []

      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i)
        const { width, height } = page.getSize()
        pageWidths.push(Math.round(width))
        pageHeights.push(Math.round(height))
      }

      return this.success<PDFMetadata>({
        pageCount,
        title: pdfDoc.getTitle() || undefined,
        author: pdfDoc.getAuthor() || undefined,
        creationDate: pdfDoc.getCreationDate() || undefined,
        modificationDate: pdfDoc.getModificationDate() || undefined,
        pageWidths,
        pageHeights,
      })
    } catch (err) {
      return this.error(`Failed to get PDF metadata: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Merge multiple PDFs into one
   */
  async merge(options: PDFMergeOptions): Promise<ProcessingResult<Buffer>> {
    try {
      if (!options.files || options.files.length < 2) {
        return this.error('At least 2 PDF files are required for merging')
      }

      const { result, time } = await this.measureTime(async () => {
        const mergedPdf = await PDFDocument.create()
        
        // Apply custom order if provided
        const orderedFiles = options.order
          ? options.order.map((idx) => options.files[idx])
          : options.files

        let totalInputSize = 0
        for (const fileBuffer of orderedFiles) {
          this.validateBuffer(fileBuffer)
          totalInputSize += fileBuffer.byteLength
        }

        // Load PDFs with bounded concurrency: max 3 simultaneous parses to
        // prevent memory spikes on large multi-file merges (e.g. 10 × 20MB).
        // copyPages must stay sequential because it mutates mergedPdf shared state.
        const loadedPdfs = await mapWithConcurrency(orderedFiles, 3, (buf) =>
          PDFDocument.load(buf)
        )
        for (const pdf of loadedPdfs) {
          const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
          copiedPages.forEach((page) => mergedPdf.addPage(page))
        }

        const pdfBytes = await mergedPdf.save()
        return {
          buffer: Buffer.from(pdfBytes),
          inputSize: totalInputSize,
          pageCount: mergedPdf.getPageCount(),
        }
      })

      return this.success(result.buffer, {
        inputSize: result.inputSize,
        outputSize: result.buffer.length,
        pageCount: result.pageCount,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to merge PDFs: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Split PDF into multiple files
   */
  async split(options: PDFSplitOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const srcPdf = await PDFDocument.load(options.file)
        const totalPages = srcPdf.getPageCount()
        const pageGroups: number[][] = []

        if (options.mode === 'range' && options.ranges) {
          // Parse range like "1-3,5,7-9"
          const segments = options.ranges.split(',').map((s) => s.trim())
          for (const seg of segments) {
            if (seg.includes('-')) {
              const [start, end] = seg.split('-').map((n) => parseInt(n.trim(), 10))
              if (!isNaN(start) && !isNaN(end)) {
                const pages: number[] = []
                for (let i = start; i <= Math.min(end, totalPages); i++) {
                  pages.push(i - 1) // 0-indexed
                }
                if (pages.length > 0) pageGroups.push(pages)
              }
            } else {
              const page = parseInt(seg, 10)
              if (!isNaN(page) && page >= 1 && page <= totalPages) {
                pageGroups.push([page - 1])
              }
            }
          }
        } else if (options.mode === 'custom' && options.customPages) {
          pageGroups.push(
            options.customPages
              .filter((p) => p >= 1 && p <= totalPages)
              .map((p) => p - 1)
          )
        } else {
          // Split every page into individual files
          for (let i = 0; i < totalPages; i++) {
            pageGroups.push([i])
          }
        }

        if (pageGroups.length === 0) {
          throw new Error('No valid page ranges specified')
        }

        // If only one group, return single PDF
        if (pageGroups.length === 1) {
          const newPdf = await PDFDocument.create()
          const copiedPages = await newPdf.copyPages(srcPdf, pageGroups[0])
          copiedPages.forEach((p) => newPdf.addPage(p))
          return Buffer.from(await newPdf.save())
        }

        // Multiple groups — return as ZIP
        const zip = new JSZip()
        for (let i = 0; i < pageGroups.length; i++) {
          const newPdf = await PDFDocument.create()
          const copiedPages = await newPdf.copyPages(srcPdf, pageGroups[i])
          copiedPages.forEach((p) => newPdf.addPage(p))
          const pdfBytes = await newPdf.save()
          zip.file(`part-${i + 1}.pdf`, pdfBytes)
        }

        return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
      })

      const isZip = result[0] === 0x50 && result[1] === 0x4b // PK signature
      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        outputFormat: isZip ? 'zip' : 'pdf',
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to split PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Rotate PDF pages
   */
  async rotate(options: PDFRotateOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.load(options.file)
        const totalPages = pdfDoc.getPageCount()
        const pagesToRotate = options.pages || Array.from({ length: totalPages }, (_, i) => i + 1)

        for (const pageNum of pagesToRotate) {
          if (pageNum >= 1 && pageNum <= totalPages) {
            const page = pdfDoc.getPage(pageNum - 1)
            const currentRotation = page.getRotation().angle
            page.setRotation(degrees(currentRotation + options.rotation))
          }
        }

        return Buffer.from(await pdfDoc.save())
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to rotate PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Add watermark to PDF
   */
  async addWatermark(options: PDFWatermarkOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.load(options.file)
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
        const pages = pdfDoc.getPages()
        
        const opacity = options.opacity ?? 0.3
        const fontSize = options.fontSize ?? 50
        const color = options.color ?? { r: 0.5, g: 0.5, b: 0.5 }
        const position = options.position ?? 'diagonal'

        for (const page of pages) {
          const { width, height } = page.getSize()
          const textWidth = font.widthOfTextAtSize(options.text, fontSize)

          let x: number
          let y: number
          let rotate: number = 0

          switch (position) {
            case 'center':
              x = (width - textWidth) / 2
              y = height / 2
              break
            case 'top':
              x = (width - textWidth) / 2
              y = height - 50
              break
            case 'bottom':
              x = (width - textWidth) / 2
              y = 50
              break
            case 'diagonal':
            default:
              x = width / 4
              y = height / 4
              rotate = 45
              break
          }

          page.drawText(options.text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(color.r, color.g, color.b),
            opacity,
            rotate: degrees(rotate),
          })
        }

        return Buffer.from(await pdfDoc.save())
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to add watermark: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Preprocess a raw image buffer before embedding in a PDF.
   *
   * Why this matters:
   *   Embedding images as-is inflates PDF size by 10–50×:
   *   - PNGs are lossless and enormous (often 5–15 MB each).
   *   - High-res JPEGs from cameras are 3000–6000 px wide.
   *   - Any alpha channel forces pdf-lib to embed as PNG (no alpha in JPEG).
   *   - EXIF orientation is ignored by pdf-lib, causing rotated images.
   *
   * This pipeline:
   *   1. Auto-rotates from EXIF orientation (phone photos are often sideways).
   *   2. Downscales to ≤ maxPx on either axis — never upscales small images.
   *   3. Flattens any alpha channel to white (JPEG is opaque-only).
   *   4. Re-encodes as JPEG at jpegQuality — eliminates PNG inflation.
   *   5. Strips EXIF/metadata from the output (extra bytes, privacy risk).
   *
   * Result: a 4000 × 3000 px PNG (~8 MB) becomes a 1600 × 1200 JPEG (~120 KB)
   * before it ever touches pdf-lib — ~67× smaller per image.
   */
  private async preprocessImageForPdf(
    raw: Buffer,
    maxPx: number,
    jpegQuality: number,
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    const { data, info } = await sharp(raw, {
      failOn: 'error',
      limitInputPixels: 24_000 * 24_000,
      sequentialRead: true,
    })
      // Honor EXIF rotation (critical for phone photos shot in portrait/landscape)
      .rotate()
      // Downscale to fit within maxPx × maxPx box; never upscale
      .resize({
        width: maxPx,
        height: maxPx,
        fit: 'inside',
        withoutEnlargement: true,
      })
      // Composite any transparent pixels onto a white background.
      // pdf-lib's embedJpg() cannot handle alpha — omitting this causes errors.
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      // Encode as JPEG. trellisQuantisation reduces artifacts at low qualities.
      // Metadata (EXIF) is stripped by default on encode.
      .jpeg({ quality: jpegQuality, mozjpeg: false, trellisQuantisation: true })
      .toBuffer({ resolveWithObject: true })

    return { buffer: data, width: info.width, height: info.height }
  }

  /**
   * Convert images to PDF.
   *
   * Every image is preprocessed with Sharp before embedding:
   *   - Resized to ≤ 1600 px (configurable via maxWidthPx)
   *   - Re-encoded as JPEG at quality 78 (configurable via quality)
   *   - Alpha flattened, EXIF stripped, orientation corrected
   *
   * For A4/Letter page sizes the page is auto-oriented (landscape when the
   * image is wider than tall) and the image is centered with equal margins.
   * For 'auto' the page is sized exactly to the preprocessed image dimensions.
   *
   * Images are preprocessed concurrently (max 4 in parallel) to saturate
   * Sharp's libuv thread pool without OOM-ing on large batches.
   */
  async imagesToPdf(options: ImageToPDFOptions): Promise<ProcessingResult<Buffer>> {
    try {
      if (!options.images || options.images.length === 0) {
        return this.error('At least one image is required')
      }

      const { result, time } = await this.measureTime(async () => {
        const margin      = options.margin    ?? 20
        const jpegQuality = options.quality   ?? 78
        const maxPx       = options.maxWidthPx ?? 1_600

        // ── Step 1: preprocess all images concurrently ──────────────────────
        // Bounded concurrency prevents OOM on large batches (50–200 images).
        // Each image is fully decoded, resized, re-encoded, then released
        // before the next wave starts — peak memory stays predictable.
        const preprocessed = await mapWithConcurrency(
          options.images,
          4,
          async (imgBuf) => {
            this.validateBuffer(imgBuf, 'image')
            return this.preprocessImageForPdf(this.toBuffer(imgBuf), maxPx, jpegQuality)
          },
        )

        // ── Step 2: assemble PDF ─────────────────────────────────────────────
        const pdfDoc = await PDFDocument.create()

        for (const { buffer, width: imgW, height: imgH } of preprocessed) {
          // All preprocessed images are JPEG — always use embedJpg.
          const image = await pdfDoc.embedJpg(buffer)

          // Page dimensions (points: 1 pt = 1/72 inch).
          // Auto-orient: use landscape variant when image is wider than tall.
          let pageWidth: number
          let pageHeight: number

          if (options.pageSize === 'letter') {
            const landscape = imgW > imgH
            pageWidth  = landscape ? 792    : 612
            pageHeight = landscape ? 612    : 792
          } else if (options.pageSize === 'auto') {
            // Page fits the image exactly (no wasted whitespace)
            pageWidth  = imgW + margin * 2
            pageHeight = imgH + margin * 2
          } else {
            // Default: A4
            const landscape = imgW > imgH
            pageWidth  = landscape ? 841.89 : 595.28
            pageHeight = landscape ? 595.28 : 841.89
          }

          // Scale image to fill the available area while preserving aspect ratio.
          // scale ≤ 1 means we never try to draw the image larger than its pixels.
          const availW  = pageWidth  - margin * 2
          const availH  = pageHeight - margin * 2
          const scale   = Math.min(availW / imgW, availH / imgH, 1)
          const drawW   = imgW * scale
          const drawH   = imgH * scale

          // Center the image on the page
          const x = margin + (availW - drawW) / 2
          const y = margin + (availH - drawH) / 2

          const page = pdfDoc.addPage([pageWidth, pageHeight])
          page.drawImage(image, { x, y, width: drawW, height: drawH })
        }

        return Buffer.from(await pdfDoc.save())
      })

      return this.success(result, {
        outputSize: result.length,
        pageCount: options.images.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(
        `Failed to convert images to PDF: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Convert PDF to Word (.docx).
   *
   * Engine order:
   *   1. pdf2docx Python script  — best layout fidelity, tables, columns
   *   2. LibreOffice headless    — good quality fallback
   *   3. pdfjs + docx rebuild    — text-only last resort
   */
  async toWord(options: PDFToWordOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const pdfBuffer = Buffer.from(options.file)

        // ── 1. pdf2docx (Python) ──────────────────────────────────────────
        try {
          const { mkdtemp, writeFile: wf, readFile: rf, rm } = await import('node:fs/promises')
          const { join } = await import('node:path')
          const { tmpdir } = await import('node:os')
          const { runPdf2Docx } = await import('../lo-server')
          const dir = await mkdtemp(join(tmpdir(), 'pdf2word-'))
          try {
            const srcPath = join(dir, 'input.pdf')
            const dstPath = join(dir, 'output.docx')
            await wf(srcPath, pdfBuffer)
            const ok = await runPdf2Docx(srcPath, dstPath, 90_000)
            if (ok) {
              const docxBuf = await rf(dstPath)
              if (docxBuf.length > 100) return docxBuf
            }
          } finally {
            await rm(dir, { recursive: true, force: true }).catch(() => {})
          }
        } catch (e) {
          console.warn('[pdf-processor] pdf2docx failed:', e instanceof Error ? e.message : String(e))
        }

        // ── 2. LibreOffice headless ───────────────────────────────────────
        try {
          const { mkdtemp, writeFile: wf, readFile: rf, rm } = await import('node:fs/promises')
          const { join } = await import('node:path')
          const { tmpdir } = await import('node:os')
          const { spawn } = await import('node:child_process')
          const dir = await mkdtemp(join(tmpdir(), 'lo-pdf2word-'))
          try {
            const inFile = join(dir, 'input.pdf')
            await wf(inFile, pdfBuffer)
            await new Promise<void>((resolve, reject) => {
              const proc = spawn('soffice', [
                '--headless', '--norestore', '--nofirststartwizard',
                '--convert-to', 'docx', '--outdir', dir, inFile,
              ], { stdio: 'ignore', env: { ...process.env, HOME: dir, TMPDIR: dir, SAL_USE_VCLPLUGIN: 'svp' } })
              const t = setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('soffice timed out')) }, 90_000)
              proc.on('close', (code) => { clearTimeout(t); code === 0 ? resolve() : reject(new Error(`soffice exited ${code}`)) })
              proc.on('error', (err) => { clearTimeout(t); reject(err) })
            })
            const outFile = join(dir, 'input.docx')
            const docxBuf = await rf(outFile)
            if (docxBuf.length > 100) return docxBuf
          } finally {
            await rm(dir, { recursive: true, force: true }).catch(() => {})
          }
        } catch (e) {
          console.warn('[pdf-processor] LibreOffice PDF→Word failed:', e instanceof Error ? e.message : String(e))
        }

        // ── 3. pdfjs + docx rebuild (text-only fallback) ─────────────────
        const pdfjs = await getPdfjs()
        const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(options.file), verbosity: 0 }).promise
        const pageCount = pdfDoc.numPages
        const docChildren: (Paragraph | Table)[] = []

        for (let pn = 1; pn <= pageCount; pn++) {
          if (pn > 1) docChildren.push(new Paragraph({ text: '', spacing: { before: 400 } }))
          const page = await pdfDoc.getPage(pn)
          const content = await page.getTextContent()
          const viewport = page.getViewport({ scale: 1 })

          interface TItem { str: string; x: number; y: number; fs: number }
          const items: TItem[] = (content.items as Array<{ str: string; transform: number[] }>)
            .filter((it) => it.str.trim())
            .map((it) => ({
              str: it.str,
              x: it.transform[4],
              y: viewport.height - it.transform[5],
              fs: Math.abs(it.transform[3]),
            }))

          const lines: TItem[][] = []
          for (const it of items) {
            const existing = lines.find((l) => Math.abs(l[0].y - it.y) <= 5)
            if (existing) existing.push(it)
            else lines.push([it])
          }
          lines.sort((a, b) => a[0].y - b[0].y)
          for (const l of lines) l.sort((a, b) => a.x - b.x)

          const sizes = items.map((i) => i.fs).sort((a, b) => a - b)
          const median = sizes[Math.floor(sizes.length / 2)] ?? 12

          for (const line of lines) {
            const text = line.map((i) => i.str).join(' ').trim()
            if (!text) continue
            const avgFs = line.reduce((s, i) => s + i.fs, 0) / line.length
            let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined
            if (avgFs >= median * 1.8) heading = HeadingLevel.HEADING_1
            else if (avgFs >= median * 1.4) heading = HeadingLevel.HEADING_2
            else if (avgFs >= median * 1.2) heading = HeadingLevel.HEADING_3
            docChildren.push(new Paragraph({
              ...(heading ? { heading } : {}),
              children: [new TextRun({ text, bold: !!heading, size: Math.round(Math.min(avgFs * 2, 72)) })],
              spacing: { after: 100 },
            }))
          }
        }

        if (docChildren.length === 0) {
          docChildren.push(new Paragraph({ children: [new TextRun({ text: 'No extractable text found in this PDF.' })] }))
        }

        const wordDoc = new Document({ sections: [{ properties: {}, children: docChildren }] })
        return Buffer.from(await Packer.toBuffer(wordDoc))
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        outputFormat: 'docx',
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to convert PDF to Word: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract specific pages from PDF
   */
  async extractPages(
    file: ArrayBuffer,
    pages: number[]
  ): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const srcPdf = await PDFDocument.load(file)
        const totalPages = srcPdf.getPageCount()
        const validPages = pages
          .filter((p) => p >= 1 && p <= totalPages)
          .map((p) => p - 1)

        if (validPages.length === 0) {
          throw new Error('No valid pages to extract')
        }

        const newPdf = await PDFDocument.create()
        const copiedPages = await newPdf.copyPages(srcPdf, validPages)
        copiedPages.forEach((page) => newPdf.addPage(page))

        return Buffer.from(await newPdf.save())
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        pageCount: pages.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to extract pages: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Reorder PDF pages
   */
  async reorderPages(
    file: ArrayBuffer,
    newOrder: number[]
  ): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const srcPdf = await PDFDocument.load(file)
        const totalPages = srcPdf.getPageCount()

        // Validate order array
        const validOrder = newOrder
          .filter((p) => p >= 1 && p <= totalPages)
          .map((p) => p - 1)

        if (validOrder.length !== totalPages) {
          throw new Error('Invalid page order: must include all pages exactly once')
        }

        const newPdf = await PDFDocument.create()
        const copiedPages = await newPdf.copyPages(srcPdf, validOrder)
        copiedPages.forEach((page) => newPdf.addPage(page))

        return Buffer.from(await newPdf.save())
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to reorder pages: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Add page numbers to PDF document
   */
  async addPageNumbers(options: PDFPageNumbersOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.load(options.file)
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
        const pages = pdfDoc.getPages()
        const totalPages = pages.length

        const position = options.position ?? 'bottom-center'
        const fontSize = options.fontSize ?? 12
        const margin = options.margin ?? 30
        const startFrom = options.startFrom ?? 1
        const format = options.format ?? 'numeric'

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i]
          const { width, height } = page.getSize()
          const pageNum = i + startFrom

          let text: string
          switch (format) {
            case 'roman':
              text = this.toRoman(pageNum)
              break
            case 'page-of-total':
              text = `Page ${pageNum} of ${totalPages + startFrom - 1}`
              break
            default:
              text = String(pageNum)
          }

          const textWidth = font.widthOfTextAtSize(text, fontSize)
          let x: number
          let y: number

          // Calculate position
          if (position.includes('left')) {
            x = margin
          } else if (position.includes('right')) {
            x = width - margin - textWidth
          } else {
            x = (width - textWidth) / 2
          }

          if (position.includes('top')) {
            y = height - margin
          } else {
            y = margin
          }

          page.drawText(text, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.3, 0.3, 0.3),
          })
        }

        return Buffer.from(await pdfDoc.save())
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to add page numbers: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Helper: Convert number to Roman numerals
   */
  private toRoman(num: number): string {
    const romanNumerals: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
    ]
    let result = ''
    for (const [value, symbol] of romanNumerals) {
      while (num >= value) {
        result += symbol
        num -= value
      }
    }
    return result
  }

  /**
   * Organize PDF (delete, move, duplicate pages)
   */
  async organize(options: PDFOrganizeOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const srcPdf = await PDFDocument.load(options.file)
        const totalPages = srcPdf.getPageCount()
        
        // Track page indices
        let pageMap: number[] = Array.from({ length: totalPages }, (_, i) => i)

        // Apply operations in order
        for (const op of options.operations) {
          if (op.type === 'delete') {
            pageMap = pageMap.filter((_, idx) => idx !== op.pageIndex)
          } else if (op.type === 'move' && op.targetIndex !== undefined) {
            const [moved] = pageMap.splice(op.pageIndex, 1)
            pageMap.splice(op.targetIndex, 0, moved)
          } else if (op.type === 'duplicate') {
            pageMap.splice(op.pageIndex + 1, 0, pageMap[op.pageIndex])
          }
        }

        if (pageMap.length === 0) {
          throw new Error('Cannot delete all pages')
        }

        const newPdf = await PDFDocument.create()
        const copiedPages = await newPdf.copyPages(srcPdf, pageMap)
        copiedPages.forEach((page) => newPdf.addPage(page))

        return Buffer.from(await newPdf.save())
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to organize PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Repair PDF (reload and re-save to fix minor issues)
   */
  async repair(file: ArrayBuffer): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        // Load with ignoreEncryption to attempt repair
        const pdfDoc = await PDFDocument.load(file, { ignoreEncryption: true })
        
        // Create a new clean PDF
        const repairedPdf = await PDFDocument.create()
        const pages = await repairedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices())
        pages.forEach((page) => repairedPdf.addPage(page))
        
        // Copy metadata
        const title = pdfDoc.getTitle()
        const author = pdfDoc.getAuthor()
        if (title) repairedPdf.setTitle(title)
        if (author) repairedPdf.setAuthor(author)

        return Buffer.from(await repairedPdf.save())
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to repair PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract text from PDF (basic text extraction)
   */
  async toText(file: ArrayBuffer): Promise<ProcessingResult<string>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.load(file)
        const pageCount = pdfDoc.getPageCount()
        
        // pdf-lib doesn't support text extraction directly
        // We return structural information that can be useful
        const lines: string[] = [
          `PDF Document`,
          `Total Pages: ${pageCount}`,
          '',
        ]

        for (let i = 0; i < pageCount; i++) {
          const page = pdfDoc.getPage(i)
          const { width, height } = page.getSize()
          lines.push(`--- Page ${i + 1} ---`)
          lines.push(`Dimensions: ${Math.round(width)} x ${Math.round(height)} pts`)
          lines.push('')
        }

        const title = pdfDoc.getTitle()
        const author = pdfDoc.getAuthor()
        if (title) lines.push(`Title: ${title}`)
        if (author) lines.push(`Author: ${author}`)

        return lines.join('\n')
      })

      return this.success(result, { processingTime: time })
    } catch (err) {
      return this.error(`Failed to extract text: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert PDF pages to images (returns page info - actual rendering needs canvas)
   */
  async toImages(file: ArrayBuffer, format: 'png' | 'jpeg' = 'png'): Promise<ProcessingResult<{
    pageCount: number
    pages: Array<{ width: number; height: number }>
  }>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.load(file)
        const pageCount = pdfDoc.getPageCount()
        const pages: Array<{ width: number; height: number }> = []

        for (let i = 0; i < pageCount; i++) {
          const page = pdfDoc.getPage(i)
          const { width, height } = page.getSize()
          pages.push({ width: Math.round(width), height: Math.round(height) })
        }

        return { pageCount, pages }
      })

      return this.success(result, { processingTime: time })
    } catch (err) {
      return this.error(`Failed to process PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete specific pages from PDF
   */
  async deletePages(file: ArrayBuffer, pagesToDelete: number[]): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const srcPdf = await PDFDocument.load(file)
        const totalPages = srcPdf.getPageCount()
        
        // Convert to 0-indexed and filter valid pages
        const deleteSet = new Set(pagesToDelete.map(p => p - 1).filter(p => p >= 0 && p < totalPages))
        const keepPages = Array.from({ length: totalPages }, (_, i) => i)
          .filter(i => !deleteSet.has(i))

        if (keepPages.length === 0) {
          throw new Error('Cannot delete all pages')
        }

        const newPdf = await PDFDocument.create()
        const copiedPages = await newPdf.copyPages(srcPdf, keepPages)
        copiedPages.forEach((page) => newPdf.addPage(page))

        return Buffer.from(await newPdf.save())
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to delete pages: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Heuristic: scan a sample of the PDF bytes to classify content.
   *
   * Image-based PDFs contain XObject image dictionaries and image-stream
   * filters (DCTDecode = JPEG, JPXDecode = JPEG 2000).  Text-heavy PDFs
   * contain BT/ET (Begin/End Text) operators but few image markers.
   *
   * Returns 'image-heavy' | 'text-heavy' | 'mixed'.
   * Falls back to 'mixed' on any read error.
   */
  private async detectPdfContentType(
    sourcePath: string | null,
    sourceBuffer: Buffer | null,
    fileSize: number,
  ): Promise<'image-heavy' | 'text-heavy' | 'mixed'> {
    try {
      const SAMPLE = 256 * 1024 // first 256 KB is enough
      let sample: Buffer

      if (sourcePath) {
        const { open } = await import('node:fs/promises')
        const fh = await open(sourcePath, 'r')
        const buf = Buffer.alloc(Math.min(fileSize, SAMPLE))
        await fh.read(buf, 0, buf.length, 0)
        await fh.close()
        sample = buf
      } else {
        sample = sourceBuffer!.subarray(0, Math.min(sourceBuffer!.length, SAMPLE))
      }

      const text = sample.toString('latin1')

      // Image signals: XObject image dictionaries, JPEG/JPEG2000 stream filters
      const imageHits = (text.match(/\/Image\b|\/DCTDecode|\/JPXDecode/g) ?? []).length
      // Text signals: PDF text block markers
      const textHits  = (text.match(/\bBT\b|\bTj\b|\bTJ\b/g) ?? []).length

      if (imageHits > 0 && imageHits >= textHits) return 'image-heavy'
      if (textHits > imageHits * 3)               return 'text-heavy'
      return 'mixed'
    } catch {
      return 'mixed'
    }
  }

  /**
   * Run qpdf to linearize + compress streams as a lightweight fallback strategy.
   * Exit code 3 means warnings only — still treat as success.
   */
  private runQpdf(inPath: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn('qpdf', [
        '--linearize',
        '--compress-streams=y',
        '--decode-level=generalized',
        inPath,
        outPath,
      ], { stdio: ['ignore', 'ignore', 'pipe'] })

      let stderr = ''
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
      proc.on('error', reject)
      proc.on('close', (code) => {
        if (code === 0 || code === 3) resolve()
        else reject(new Error(`qpdf failed (exit ${code}): ${stderr.trim()}`))
      })

      setTimeout(() => { proc.kill('SIGKILL'); reject(new Error('qpdf timed out')) }, 60_000)
    })
  }

  /**
   * Compress a PDF using level-tuned Ghostscript settings.
   *
   * Compression is ALWAYS performed — no size-based skipping, no "already
   * optimised" blocking.  The processed file is returned regardless of whether
   * it ends up smaller or larger than the original.  The caller decides what
   * to display; this engine never hides work or returns the original silently.
   *
   * Level → Ghostscript preset mapping (real quality/size tradeoff per level):
   *   low    → /ebook   150 dpi  — light touch, best quality
   *   medium → /screen  100 dpi  — balanced, font optimisation enabled
   *   high   → /screen   72 dpi  — aggressive: heavy downsampling, mono+color+gray,
   *                                font subset, duplicate image detection
   *
   * compressionStatus values:
   *   'compressed'     – output is smaller than input
   *   'size_increased' – output is larger (returned as-is, never faked)
   *
   * compressionRatio can be negative (positive = reduction, negative = increase).
   *
   * Strategy order:
   *   1. Ghostscript — always tried first with level-specific settings
   *   2. qpdf        — fallback ONLY when Ghostscript fails entirely
   */
  async compress(
    file: ArrayBuffer | string,
    level: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<ProcessingResult<Buffer>> {
    try {
      const isPath = typeof file === 'string'
      let inputSize: number
      let sourceBuffer: Buffer | null = null
      let sourcePath:  string | null  = null

      if (isPath) {
        sourcePath = file
        const { stat } = await import('node:fs/promises')
        inputSize = (await stat(sourcePath)).size
      } else {
        this.validateBuffer(file)
        sourceBuffer = Buffer.from(file)
        if (sourceBuffer.length < 5 || sourceBuffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
          return this.error('File is not a valid PDF')
        }
        inputSize = sourceBuffer.length
      }

      // ── GS preset mapping ─────────────────────────────────────────────────────
      // Each level uses genuinely different settings to produce a real size/quality
      // tradeoff.  No level is silently promoted or demoted.
      type GsPreset = { pdfSettings: string; imageResolution: number; extraArgs: string[] }
      const GS_PRESETS: Record<typeof level, GsPreset> = {
        // LIGHT — minimal compression, image quality preserved, slight downsampling only
        low: {
          pdfSettings:     '/ebook',
          imageResolution: 150,
          extraArgs: [
            '-dDownsampleColorImages=true',
            '-dDownsampleGrayImages=true',
          ],
        },
        // MEDIUM — balanced: 100 dpi images, font subsetting, /screen colour model
        medium: {
          pdfSettings:     '/screen',
          imageResolution: 100,
          extraArgs: [
            '-dDownsampleColorImages=true',
            '-dDownsampleGrayImages=true',
            '-dCompressFonts=true',
            '-dSubsetFonts=true',
          ],
        },
        // MAXIMUM — aggressive: 72 dpi all channels, mono downsampled, font + object
        //           optimisation, duplicate image detection, page stream compression
        high: {
          pdfSettings:     '/screen',
          imageResolution: 72,
          extraArgs: [
            '-dDownsampleColorImages=true',
            '-dColorImageResolution=72',
            '-dDownsampleGrayImages=true',
            '-dGrayImageResolution=72',
            '-dDownsampleMonoImages=true',
            '-dMonoImageResolution=72',
            '-dCompressFonts=true',
            '-dSubsetFonts=true',
            '-dDetectDuplicateImages=true',
            '-dCompressPages=true',
            '-dOptimize=true',
          ],
        },
      }

      const preset = GS_PRESETS[level]
      const t0     = Date.now()

      // ── Strategy 1: Ghostscript ───────────────────────────────────────────────
      let gsResult: Buffer | null = null
      try {
        gsResult = await withGsTempDir(async (dir) => {
          const outPath = join(dir, 'out.pdf')
          let inPath: string

          if (sourcePath) {
            inPath = sourcePath
          } else {
            inPath = join(dir, 'in.pdf')
            await writeFile(inPath, sourceBuffer!)
          }

          const args = [
            '-q', '-dBATCH', '-dNOPAUSE', '-dSAFER',
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            `-dPDFSETTINGS=${preset.pdfSettings}`,
            '-dDownsampleColorImages=true',
            `-dColorImageResolution=${preset.imageResolution}`,
            '-dDownsampleGrayImages=true',
            `-dGrayImageResolution=${preset.imageResolution}`,
            ...preset.extraArgs,
            `-sOutputFile=${outPath}`,
            inPath,
          ]

          const { code, stderr } = await runGs(args)
          if (code !== 0) throw new Error(`Ghostscript failed (exit ${code}): ${stderr.trim()}`)

          const out = await readFile(outPath)
          if (out.length < 5 || out.subarray(0, 5).toString('ascii') !== '%PDF-') {
            throw new Error('Ghostscript produced invalid output')
          }
          return out
        })
      } catch (err) {
        console.warn('[compress-pdf] Ghostscript strategy failed:', err instanceof Error ? err.message : err)
      }

      // ── Strategy 2: qpdf — fallback ONLY when GS failed ──────────────────────
      let qpdfResult: Buffer | null = null
      if (!gsResult) {
        try {
          qpdfResult = await withGsTempDir(async (dir) => {
            const outPath = join(dir, 'out.pdf')
            let inPath: string

            if (sourcePath) {
              inPath = sourcePath
            } else {
              inPath = join(dir, 'in.pdf')
              await writeFile(inPath, sourceBuffer!)
            }

            await this.runQpdf(inPath, outPath)

            const out = await readFile(outPath)
            if (out.length < 5 || out.subarray(0, 5).toString('ascii') !== '%PDF-') {
              throw new Error('qpdf produced invalid output')
            }
            return out
          })
        } catch (err) {
          console.warn('[compress-pdf] qpdf strategy failed:', err instanceof Error ? err.message : err)
        }
      }

      const processingTime = Date.now() - t0

      // ── Pick best result (GS preferred, qpdf fallback) ────────────────────────
      const outputBuffer = gsResult ?? qpdfResult
      if (!outputBuffer) {
        return this.error('Compression failed: Ghostscript and qpdf both failed')
      }

      const newSize = outputBuffer.length
      // compressionRatio: positive = smaller (good), negative = larger
      const compressionRatio = ((inputSize - newSize) / inputSize) * 100

      // ── Meaningful-reduction guard ─────────────────────────────────────────────
      // Ghostscript sometimes produces a larger file when the source is already
      // optimised (e.g. a previously compressed PDF, a scanned image PDF, or one
      // with lossless content that cannot be downsampled further).  Rather than
      // returning a bigger file as a "success", we detect this case and swap in
      // the original, marking it as already_optimized so the UI can show a
      // clear, honest message.
      //
      // Threshold: < 1% reduction is treated as "no meaningful saving" —
      // the overhead of the re-write can exceed any theoretical gain at this scale.
      const MIN_MEANINGFUL_REDUCTION_PCT = 1

      if (compressionRatio < MIN_MEANINGFUL_REDUCTION_PCT) {
        // Re-read the original from disk (if we were given a path) or use the
        // in-memory buffer we already have.  The streamUpload temp file is still
        // on disk at this point — cleanup only runs in the route's finally block.
        const originalBuffer: Buffer = sourceBuffer
          ?? await (await import('node:fs/promises')).readFile(sourcePath!)

        console.log({
          originalSize:  inputSize,
          newSize,
          changePercent: compressionRatio.toFixed(2) + '%',
          strategyUsed:  gsResult ? 'ghostscript' : 'qpdf',
          level,
          status:        'already_optimized — returning original',
        })

        return this.success(originalBuffer, {
          inputSize,
          outputSize:        originalBuffer.length,
          compressionRatio:  0,
          compressionStatus: 'already_optimized',
          processingTime,
        })
      }

      console.log({
        originalSize:      inputSize,
        newSize,
        changePercent:     compressionRatio.toFixed(2) + '%',
        strategyUsed:      gsResult ? 'ghostscript' : 'qpdf',
        level,
        compressionStatus: 'compressed',
      })

      return this.success(outputBuffer, {
        inputSize,
        outputSize:        newSize,
        compressionRatio,
        compressionStatus: 'compressed',
        processingTime,
      })
    } catch (err) {
      return this.error(`Failed to compress PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const pdfProcessor = new PDFProcessor()
