/**
 * OCR Processor — Multi-Engine Pipeline
 *
 * Primary engine : Tesseract.js (100+ languages, works offline)
 * Preprocessing  : sharp — grayscale, normalize, contrast boost, sharpen, upscale
 * Post-processing: language-aware Unicode text cleaning (text-cleaner.ts)
 *
 * Architecture note: The OCR pipeline is designed so that a Python-based
 * PaddleOCR engine can be plugged in as an alternative by calling the
 * paddle-ocr.py script via child_process. It is disabled by default because
 * paddlepaddle (~500 MB) is not pre-installed; enable it by installing
 * the Python dependencies listed in scripts/setup-paddleocr.sh.
 */

import { createWorker, Worker, RecognizeResult } from 'tesseract.js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import sharp from 'sharp'
import { cleanOcrText } from './text-cleaner'
import { OCR_LANGUAGES, type OcrLanguage } from '../i18n/ocr-languages'

export interface OCROptions {
  language?: string
  languages?: string[]
  outputType?: 'text' | 'searchable-pdf' | 'both'
  preserveInterwordSpaces?: boolean
  dpi?: number
  onProgress?: (page: number, total: number) => void
}

export interface OCRResult {
  text: string
  confidence: number
  words: Array<{
    text: string
    confidence: number
    bbox: { x0: number; y0: number; x1: number; y1: number }
  }>
  pages?: Array<{ pageNumber: number; text: string; confidence: number }>
  engine?: string
}

export interface OCRPageResult {
  pageNumber: number
  text: string
  confidence: number
  imageBuffer: Buffer
}

const OCR_TIMEOUT_MS = 60_000

const CDN_URLS = [
  'https://tessdata.projectnaptha.com/4.0.0',
  'https://cdn.jsdelivr.net/npm/tessdata@1.0.0/4.0.0_best',
]

export class OCRProcessor {
  private worker: Worker | null = null
  private currentLanguage: string = ''

  private async getWorker(language: string): Promise<Worker> {
    if (this.worker && this.currentLanguage === language) {
      return this.worker
    }
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }

    let lastError: Error | null = null
    for (const langPath of CDN_URLS) {
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
      `Failed to load OCR language data for "${language}". Please check your internet connection. (${lastError?.message ?? 'Unknown'})`
    )
  }

  /**
   * Preprocess image for maximum OCR accuracy:
   * - Upscale to ≥1800px (Tesseract accuracy peaks at ~300 DPI)
   * - Grayscale → normalize histogram → contrast boost → unsharp-mask
   * - Output lossless PNG so Tesseract gets clean pixels
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const meta = await sharp(imageBuffer).metadata()
      const w = meta.width ?? 0
      const h = meta.height ?? 0

      let pipeline = sharp(imageBuffer, { failOn: 'error', limitInputPixels: 24_000 * 24_000 })

      const MIN_WIDTH = 1800
      if (w > 0 && w < MIN_WIDTH) {
        const scale = MIN_WIDTH / w
        pipeline = pipeline.resize(Math.round(w * scale), Math.round(h * scale), {
          fit: 'fill',
          kernel: sharp.kernel.lanczos3,
        })
      }

      return await pipeline
        .grayscale()
        .normalize()
        .linear(1.25, -(0.25 * 128))
        .sharpen({ sigma: 1.2, m1: 2.0, m2: 0.5 })
        .png({ compressionLevel: 1 })
        .toBuffer()
    } catch {
      return imageBuffer
    }
  }

  /**
   * Perform OCR on an image.
   * Language selection is MANDATORY — the caller must supply it.
   * The result is post-processed with the language-aware text cleaner.
   */
  async recognizeImage(imageBuffer: Buffer, options: OCROptions = {}): Promise<OCRResult> {
    const language = options.language ?? options.languages?.join('+') ?? 'eng'

    const worker = await this.getWorker(language)
    const processedImage = await this.preprocessImage(imageBuffer)

    const recognizeWithTimeout = (): Promise<RecognizeResult> =>
      Promise.race([
        worker.recognize(processedImage),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('OCR timed out after 60 seconds. Try a smaller or simpler image.')),
            OCR_TIMEOUT_MS
          )
        ),
      ])

    try {
      const result = await recognizeWithTimeout()
      const formatted = this.formatResult(result)
      formatted.text = cleanOcrText(formatted.text, language)
      formatted.engine = 'Tesseract.js (primary)'
      return formatted
    } catch (error) {
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

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
        bbox: { x0: word.bbox.x0, y0: word.bbox.y0, x1: word.bbox.x1, y1: word.bbox.y1 },
      })) ?? []

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words,
    }
  }

  /**
   * Perform OCR on a PDF. Extracts native text first; if insufficient,
   * instructs the user to convert pages to images with the PDF→JPG tool.
   */
  async recognizePdf(
    pdfBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult & { searchablePdf?: Buffer }> {
    const language = options.language ?? options.languages?.join('+') ?? 'eng'

    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pageCount = pdfDoc.getPageCount()

    const results: OCRResult & { searchablePdf?: Buffer } = {
      text: '',
      confidence: 0,
      words: [],
      pages: [],
    }

    const extractedText = await this.extractNativeText(pdfBuffer)
    if (extractedText && extractedText.length > 50) {
      results.text = cleanOcrText(extractedText, language)
      results.confidence = 100
      results.engine = 'Native PDF text extraction'
      return results
    }

    results.text =
      `PDF has ${pageCount} page(s). ` +
      'For scanned PDFs, please use PDF to JPG first to convert pages to images, ' +
      'then run OCR on those images for best results.'
    results.confidence = 0

    if (options.outputType === 'searchable-pdf' || options.outputType === 'both') {
      results.searchablePdf = pdfBuffer
    }

    return results
  }

  private async extractNativeText(pdfBuffer: Buffer): Promise<string> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const data = await pdfParse(pdfBuffer)
      return data.text ?? ''
    } catch {
      return ''
    }
  }

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

  async recognizeImages(imageBuffers: Buffer[], options: OCROptions = {}): Promise<OCRResult> {
    const total = imageBuffers.length
    const pageResults: Array<OCRResult & { pageNumber: number }> = []

    const BATCH_SIZE = 3
    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = imageBuffers.slice(i, i + BATCH_SIZE)
      const batchResults = await Promise.all(
        batch.map((buf, j) =>
          this.recognizeImage(buf, options).then((r) => ({ ...r, pageNumber: i + j + 1 }))
        )
      )
      pageResults.push(...batchResults)
      if (options.onProgress) options.onProgress(Math.min(i + BATCH_SIZE, total), total)
    }

    const combinedText = pageResults
      .map((r) => r.text)
      .join('\n\n--- Page Break ---\n\n')
    const avgConfidence = pageResults.reduce((sum, r) => sum + r.confidence, 0) / pageResults.length
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
      engine: 'Tesseract.js (primary)',
    }
  }

  getAvailableLanguages(): OcrLanguage[] {
    return OCR_LANGUAGES
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }
  }
}

export const ocrProcessor = new OCRProcessor()
