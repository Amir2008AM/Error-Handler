/**
 * PDF to Image Converter
 * Converts PDF pages to images using pdfjs-dist (legacy) + canvas + sharp
 */

import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { createCanvas, type Canvas } from 'canvas'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

// Anchor require() at the project root — using `import.meta.url` here would
// point at Next.js's bundled output path and break module resolution.
const nodeRequire = createRequire(join(process.cwd(), 'package.json'))
const pdfjsRoot = dirname(nodeRequire.resolve('pdfjs-dist/package.json'))
const STANDARD_FONT_DATA_URL = pathToFileURL(
  join(pdfjsRoot, 'standard_fonts') + '/'
).href
const CMAP_URL = pathToFileURL(join(pdfjsRoot, 'cmaps') + '/').href

const PDFJS_WORKER_SRC = pathToFileURL(
  join(pdfjsRoot, 'legacy/build/pdf.worker.mjs')
).href

let _pdfjs: typeof import('pdfjs-dist') | null = null
async function getPdfjs(): Promise<typeof import('pdfjs-dist')> {
  if (!_pdfjs) {
    // Use the legacy build for Node.js compatibility (pdfjs-dist v5+)
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs')
    _pdfjs = mod as unknown as typeof import('pdfjs-dist')
    // pdfjs-dist v5 requires a workerSrc even when running in Node
    // (it spins up a fake worker that loads this file).
    _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
  }
  return _pdfjs
}

export interface PdfToImageOptions {
  format?: 'jpg' | 'png' | 'webp'
  quality?: number // 1-100 for jpg/webp
  dpi?: number // Dots per inch (72-600)
  pages?: number[] | 'all' // Specific pages or all
  scale?: number // Scale factor (1 = 72dpi, 2 = 144dpi, etc.)
  background?: string // Background color (hex)
}

export interface ConvertedPage {
  pageNumber: number
  width: number
  height: number
  buffer: Buffer
  mimeType: string
  fileName: string
}

export class PdfToImageConverter {
  /**
   * Convert PDF pages to images
   */
  async convert(
    pdfBuffer: Buffer,
    options: PdfToImageOptions = {}
  ): Promise<ConvertedPage[]> {
    const {
      format = 'jpg',
      quality = 90,
      dpi = 150,
      pages = 'all',
      background = '#ffffff',
    } = options

    // Calculate scale from DPI (72 DPI is the base)
    const scale = dpi / 72

    // Load PDF with pdfjs-dist legacy build
    const pdfjs = await getPdfjs()
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      cMapUrl: CMAP_URL,
      cMapPacked: true,
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
    })

    const pdfDoc = await loadingTask.promise
    const numPages = pdfDoc.numPages

    // Determine which pages to convert
    let pageNumbers: number[]
    if (pages === 'all') {
      pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1)
    } else {
      pageNumbers = pages.filter((p) => p >= 1 && p <= numPages)
    }

    // Convert each page
    const results: ConvertedPage[] = []

    try {
      for (const pageNum of pageNumbers) {
        const pageResult = await this.convertPage(pdfDoc, pageNum, {
          scale,
          format,
          quality,
          background,
        })
        results.push(pageResult)
      }
    } finally {
      try {
        await pdfDoc.cleanup()
        await pdfDoc.destroy()
      } catch {
        // best-effort cleanup
      }
    }

    return results
  }

  /**
   * Convert a single PDF page to an image using node-canvas for rendering
   */
  private async convertPage(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfDoc: any,
    pageNum: number,
    options: {
      scale: number
      format: 'jpg' | 'png' | 'webp'
      quality: number
      background: string
    }
  ): Promise<ConvertedPage> {
    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: options.scale })

    const width = Math.floor(viewport.width)
    const height = Math.floor(viewport.height)

    // Create a node-canvas instance for pdfjs to render into
    const canvas: Canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    // Fill background
    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, width, height)

    // pdfjs v5 expects a canvas (HTMLCanvasElement-like) plus context.
    // node-canvas exposes a compatible enough surface; cast through unknown.
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise

    // Get raw pixel data from canvas (BGRA on node-canvas) and convert via sharp
    const rawBuffer = canvas.toBuffer('raw')
    const sharpImage = sharp(rawBuffer, {
      raw: { width, height, channels: 4 },
    }).removeAlpha()

    let buffer: Buffer
    let mimeType: string

    switch (options.format) {
      case 'png':
        buffer = await sharpImage.png().toBuffer()
        mimeType = 'image/png'
        break
      case 'webp':
        buffer = await sharpImage.webp({ quality: options.quality }).toBuffer()
        mimeType = 'image/webp'
        break
      case 'jpg':
      default:
        buffer = await sharpImage.jpeg({ quality: options.quality }).toBuffer()
        mimeType = 'image/jpeg'
        break
    }

    const extension = options.format === 'jpg' ? 'jpg' : options.format

    return {
      pageNumber: pageNum,
      width,
      height,
      buffer,
      mimeType,
      fileName: `page-${pageNum}.${extension}`,
    }
  }

  /**
   * Get PDF page count and dimensions
   */
  async getInfo(pdfBuffer: Buffer): Promise<{
    pageCount: number
    pages: Array<{
      pageNumber: number
      width: number
      height: number
    }>
  }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()

    return {
      pageCount: pages.length,
      pages: pages.map((page, index) => {
        const { width, height } = page.getSize()
        return {
          pageNumber: index + 1,
          width,
          height,
        }
      }),
    }
  }

  /**
   * Convert a single page to image
   */
  async convertSinglePage(
    pdfBuffer: Buffer,
    pageNumber: number,
    options: Omit<PdfToImageOptions, 'pages'> = {}
  ): Promise<ConvertedPage | null> {
    const results = await this.convert(pdfBuffer, {
      ...options,
      pages: [pageNumber],
    })

    return results[0] || null
  }

  /**
   * Generate thumbnails for all pages
   */
  async generateThumbnails(
    pdfBuffer: Buffer,
    options: {
      maxWidth?: number
      maxHeight?: number
      format?: 'jpg' | 'png' | 'webp'
      quality?: number
    } = {}
  ): Promise<ConvertedPage[]> {
    const {
      maxWidth = 200,
      maxHeight = 300,
      format = 'jpg',
      quality = 70,
    } = options

    const results = await this.convert(pdfBuffer, {
      format,
      quality,
      dpi: 72,
      pages: 'all',
    })

    const thumbnails: ConvertedPage[] = []

    for (const page of results) {
      const resized = await sharp(page.buffer)
        .resize(maxWidth, maxHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .toBuffer()

      const metadata = await sharp(resized).metadata()

      thumbnails.push({
        pageNumber: page.pageNumber,
        width: metadata.width || maxWidth,
        height: metadata.height || maxHeight,
        buffer: resized,
        mimeType: page.mimeType,
        fileName: `thumb-${page.pageNumber}.${format}`,
      })
    }

    return thumbnails
  }
}

// Export singleton instance
export const pdfToImageConverter = new PdfToImageConverter()
