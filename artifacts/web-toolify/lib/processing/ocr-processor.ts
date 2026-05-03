import { createWorker, Worker, RecognizeResult, PSM } from 'tesseract.js'
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

type LangFamily = 'rtl' | 'cjk' | 'indic' | 'latin'

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
   * Determine language family for PSM / preprocessing tuning.
   */
  private getLangFamily(language: string): LangFamily {
    const rtl = ['ara', 'heb', 'fas', 'urd', 'syc', 'nqo', 'thaana']
    const cjk = ['chi_sim', 'chi_tra', 'jpn', 'kor']
    const indic = ['hin', 'ben', 'tam', 'tel', 'kan', 'mal', 'guj', 'pan', 'ori', 'sin', 'nep', 'mar', 'san']
    if (rtl.some((l) => language.includes(l))) return 'rtl'
    if (cjk.some((l) => language.includes(l))) return 'cjk'
    if (indic.some((l) => language.includes(l))) return 'indic'
    return 'latin'
  }

  /**
   * Set Tesseract PSM and parameters optimised for each language family.
   * PSM 3 = Auto (default). PSM 6 = Assume single uniform block of text.
   * PSM 6 works best for RTL, CJK, and Indic scripts; reduces mis-segmentation.
   */
  private async configureWorkerForLanguage(worker: Worker, language: string): Promise<void> {
    const family = this.getLangFamily(language)
    const psm = family === 'latin' ? PSM.AUTO : PSM.SINGLE_BLOCK
    try {
      await worker.setParameters({ tessedit_pageseg_mode: psm })
    } catch {
      // setParameters may not be available in all versions — safe to ignore
    }
  }

  /**
   * Primary preprocessing:
   * - Upscale small images to ≥1800px wide for adequate resolution
   * - Grayscale → normalise histogram → contrast boost → unsharp-mask
   * - Output lossless PNG so OCR gets clean pixels
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
        .linear(1.3, -(0.3 * 128))
        .sharpen({ sigma: 1.5, m1: 2.5, m2: 0.5 })
        .png({ compressionLevel: 1 })
        .toBuffer()
    } catch {
      return imageBuffer
    }
  }

  /**
   * Alternative preprocessing strategy for difficult images:
   * - Detects dark-background images and inverts them automatically
   * - Uses stronger contrast + binary threshold for maximum clarity
   * - Falls back gracefully if sharp fails
   */
  private async preprocessImageAlt(imageBuffer: Buffer): Promise<Buffer> {
    try {
      const stats = await sharp(imageBuffer).grayscale().stats()
      const avgBrightness = stats.channels[0].mean ?? 128

      let pipeline = sharp(imageBuffer, { failOn: 'error', limitInputPixels: 24_000 * 24_000 })
        .grayscale()
        .normalize()

      // Invert dark-background images (white text on black → black on white)
      if (avgBrightness < 100) {
        pipeline = pipeline.negate()
      }

      return await pipeline
        .linear(1.6, -(0.6 * 128))
        .threshold(128)
        .sharpen({ sigma: 2.0, m1: 3.0, m2: 0.5 })
        .png({ compressionLevel: 1 })
        .toBuffer()
    } catch {
      return imageBuffer
    }
  }

  private recognizeWithTimeout(worker: Worker, image: Buffer): Promise<RecognizeResult> {
    return Promise.race([
      worker.recognize(image),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('OCR timed out after 60 seconds. Try a smaller or simpler image.')),
          OCR_TIMEOUT_MS
        )
      ),
    ])
  }

  async recognizeImage(imageBuffer: Buffer, options: OCROptions = {}): Promise<OCRResult> {
    const language = options.language ?? options.languages?.join('+') ?? 'eng'

    const worker = await this.getWorker(language)

    // Configure optimal Tesseract parameters for the language family
    await this.configureWorkerForLanguage(worker, language)

    // Strategy 1: Standard preprocessing
    const processedImage = await this.preprocessImage(imageBuffer)

    let result: RecognizeResult
    try {
      result = await this.recognizeWithTimeout(worker, processedImage)
    } catch (error) {
      throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    const formatted = this.formatResult(result)

    // Strategy 2: If confidence is low or output is too short, retry with alternative preprocessing
    if (formatted.confidence < 35 || formatted.text.trim().length < 10) {
      try {
        const processedAlt = await this.preprocessImageAlt(imageBuffer)
        const resultAlt = await this.recognizeWithTimeout(worker, processedAlt)
        const formattedAlt = this.formatResult(resultAlt)

        // Use alternative result if meaningfully better
        const altIsBetter =
          formattedAlt.confidence > formatted.confidence + 5 ||
          (formattedAlt.text.trim().length > formatted.text.trim().length * 1.3 &&
            formattedAlt.confidence > 15)

        if (altIsBetter) {
          formattedAlt.text = cleanOcrText(formattedAlt.text, language)
          return formattedAlt
        }
      } catch {
        // Strategy 2 failed — stick with strategy 1 result
      }
    }

    formatted.text = cleanOcrText(formatted.text, language)
    return formatted
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
