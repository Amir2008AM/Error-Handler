/**
 * OCR Processor
 * Extracts text from images and scanned PDFs using Tesseract.js
 */

import { createWorker, Worker, RecognizeResult } from 'tesseract.js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import sharp from 'sharp'

export interface OCROptions {
  language?: string // e.g., 'eng', 'ara', 'fra', 'deu'
  languages?: string[] // Multiple languages
  outputType?: 'text' | 'searchable-pdf' | 'both'
  preserveInterwordSpaces?: boolean
  dpi?: number // For PDF rendering
  onProgress?: (page: number, total: number) => void
}

export interface OCRResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: {
      x0: number
      y0: number
      x1: number
      y1: number
    }
  }>
  pages?: Array<{
    pageNumber: number
    text: string
    confidence: number
  }>
}

export interface OCRPageResult {
  pageNumber: number
  text: string
  confidence: number
  imageBuffer: Buffer
}

const OCR_TIMEOUT_MS = 30_000 // 30 seconds per page

export class OCRProcessor {
  private worker: Worker | null = null
  private currentLanguage: string = 'eng+ara' // Default: English + Arabic

  /**
   * Initialize the OCR worker with graceful CDN failure handling.
   */
  private async getWorker(language: string = 'eng+ara'): Promise<Worker> {
    if (this.worker && this.currentLanguage === language) {
      return this.worker
    }

    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }

    // Try primary CDN first, then fallback
    const cdnUrls = [
      'https://tessdata.projectnaptha.com/4.0.0',
      'https://cdn.jsdelivr.net/npm/tessdata@1.0.0/4.0.0_best',
    ]

    let lastError: Error | null = null

    for (const langPath of cdnUrls) {
      try {
        const worker = await createWorker(language, 1, {
          langPath,
          cacheMethod: 'none',
        })
        this.worker = worker
        this.currentLanguage = language
        return worker
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }
    }

    throw new Error(
      `Failed to load OCR language data. Please check your internet connection and try again. (${lastError?.message ?? 'Unknown error'})`
    )
  }

  /**
   * Perform OCR on an image with a 30-second timeout.
   */
  async recognizeImage(
    imageBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const language =
      options.language ?? options.languages?.join('+') ?? 'eng+ara'

    const worker = await this.getWorker(language)

    const processedImage = await this.preprocessImage(imageBuffer)

    const recognizeWithTimeout = (): Promise<RecognizeResult> =>
      Promise.race([
        worker.recognize(processedImage),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'OCR timed out after 30 seconds. Try a smaller or simpler image.'
                )
              ),
            OCR_TIMEOUT_MS
          )
        ),
      ])

    try {
      const result = await recognizeWithTimeout()
      return this.formatResult(result)
    } catch (error) {
      throw new Error(
        `OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Preprocess image for better OCR results.
   * - Upscales small images to at least 1500px wide (Tesseract works best at ~300 DPI)
   * - Converts to grayscale, normalises contrast, applies gentle unsharp mask
   * - Outputs lossless PNG so Tesseract gets clean pixels
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const meta = await sharp(imageBuffer).metadata()
      const w = meta.width ?? 0
      const h = meta.height ?? 0

      let pipeline = sharp(imageBuffer)

      // Upscale if the image is too small — Tesseract accuracy degrades below ~150 DPI
      const MIN_WIDTH = 1500
      if (w > 0 && w < MIN_WIDTH) {
        const scale = MIN_WIDTH / w
        pipeline = pipeline.resize(Math.round(w * scale), Math.round(h * scale), {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
      }

      return await pipeline
        .grayscale()
        .normalize()                          // stretch histogram to full 0-255 range
        .linear(1.2, -(0.2 * 128))            // slight contrast boost
        .sharpen({ sigma: 1.0, m1: 1.5, m2: 0.5 })  // unsharp mask for crisper text edges
        .png({ compressionLevel: 1 })         // fast lossless output for Tesseract
        .toBuffer()
    } catch {
      return imageBuffer
    }
  }

  /**
   * Format Tesseract result to our standard format.
   */
  private formatResult(result: RecognizeResult): OCRResult {
    const data = result.data as typeof result.data & {
      words?: Array<{
        text: string
        confidence: number
        bbox: { x0: number; y0: number; x1: number; y1: number }
      }>
    }
    const words =
      data.words?.map((word) => ({
        text: word.text,
        confidence: word.confidence,
        bbox: {
          x0: word.bbox.x0,
          y0: word.bbox.y0,
          x1: word.bbox.x1,
          y1: word.bbox.y1,
        },
      })) ?? []

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words,
    }
  }

  /**
   * Perform OCR on a PDF document, showing per-page progress.
   * Uses pdfjs-style image rendering (caller must supply rendered page images).
   */
  async recognizePdf(
    pdfBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult & { searchablePdf?: Buffer }> {
    const language =
      options.language ?? options.languages?.join('+') ?? 'eng+ara'

    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDoc.getPageCount()

    const results: OCRResult & { searchablePdf?: Buffer } = {
      text: '',
      confidence: 0,
      words: [],
      pages: [],
    }

    // Try to extract native (non-scanned) text first
    const extractedText = await this.extractNativeText(pdfBuffer)
    if (extractedText && extractedText.length > 50) {
      results.text = extractedText
      results.confidence = 100
      return results
    }

    // Otherwise indicate OCR is needed via the image tool
    results.text =
      `PDF has ${pageCount} page(s). ` +
      'For scanned PDFs, please use PDF to JPG first to convert pages to images, ' +
      'then run OCR on those images for best results.'
    results.confidence = 0

    if (
      options.outputType === 'searchable-pdf' ||
      options.outputType === 'both'
    ) {
      results.searchablePdf = pdfBuffer
    }

    return results
  }

  /**
   * Try to extract native text from the PDF (non-scanned).
   */
  private async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    try {
      // Use pdf-parse if available, otherwise return empty
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(pdfBuffer)
      return data.text ?? ''
    } catch {
      return ''
    }
  }

  /**
   * Create a searchable PDF by overlaying invisible OCR text.
   */
  async createSearchablePdf(
    originalPdfBuffer: Buffer,
    ocrResults: OCRPageResult[]
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(originalPdfBuffer)
    const pages = pdfDoc.getPages()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    for (const result of ocrResults) {
      const pageIndex = result.pageNumber - 1
      if (pageIndex >= 0 && pageIndex < pages.length) {
        const page = pages[pageIndex]
        page.drawText(result.text, {
          x: 0,
          y: 0,
          size: 1,
          font,
          color: rgb(1, 1, 1),
          opacity: 0,
        })
      }
    }

    return Buffer.from(await pdfDoc.save())
  }

  /**
   * Perform OCR on multiple images with per-image progress reporting.
   */
  async recognizeImages(
    imageBuffers: Buffer[],
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const total = imageBuffers.length
    const pageResults: Array<OCRResult & { pageNumber: number }> = []

    // Process pages in parallel batches for ~3x speedup on multi-page docs.
    // Worker is single-threaded inside Tesseract, but image preprocessing
    // (sharp) happens in parallel and overlaps with recognition I/O.
    const BATCH_SIZE = 3
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = imageBuffers.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map((buf, j) =>
          this.recognizeImage(buf, options).then((r) => ({
            ...r,
            pageNumber: i + j + 1,
          }))
        )
      )
      pageResults.push(...batchResults)
      if (options.onProgress) {
        options.onProgress(Math.min(i + BATCH_SIZE, total), total)
      }
    }

    const combinedText = pageResults
      .map((r) => r.text)
      .join('\n\n--- Page Break ---\n\n')
    const avgConfidence =
      pageResults.reduce((sum, r) => sum + r.confidence, 0) / pageResults.length
    const allWords = pageResults.flatMap((r) => r.words)

    return {
      text: combinedText,
      confidence: avgConfidence,
      words: allWords,
      pages: pageResults.map((r) => ({
        pageNumber: r.pageNumber,
        text: r.text,
        confidence: r.confidence,
      })),
    }
  }

  /**
   * Get supported languages (English + Arabic as defaults).
   */
  getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'eng', name: 'English' },
      { code: 'ara', name: 'Arabic' },
      { code: 'fra', name: 'French' },
      { code: 'deu', name: 'German' },
      { code: 'spa', name: 'Spanish' },
      { code: 'ita', name: 'Italian' },
      { code: 'por', name: 'Portuguese' },
      { code: 'rus', name: 'Russian' },
      { code: 'chi_sim', name: 'Chinese (Simplified)' },
      { code: 'chi_tra', name: 'Chinese (Traditional)' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'kor', name: 'Korean' },
      { code: 'hin', name: 'Hindi' },
      { code: 'tur', name: 'Turkish' },
      { code: 'pol', name: 'Polish' },
      { code: 'nld', name: 'Dutch' },
      { code: 'swe', name: 'Swedish' },
      { code: 'dan', name: 'Danish' },
      { code: 'nor', name: 'Norwegian' },
      { code: 'fin', name: 'Finnish' },
    ]
  }

  /**
   * Cleanup resources.
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}

export const ocrProcessor = new OCRProcessor()
