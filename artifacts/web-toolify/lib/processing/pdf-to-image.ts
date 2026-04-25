/**
 * PDF to Image Converter
 * Converts PDF pages to images using pdfjs-dist (legacy) + canvas + sharp
 */

import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { createCanvas } from 'canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.js'

// Disable the worker in Node.js environment
pdfjs.GlobalWorkerOptions.workerSrc = ''

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

    try {
      // Load PDF with the legacy pdfjs build
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        useSystemFonts: true,
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

      for (const pageNum of pageNumbers) {
        const pageResult = await this.convertPage(pdfDoc, pageNum, {
          scale,
          format,
          quality,
          background,
        })
        results.push(pageResult)
      }

      return results
    } catch (error) {
      console.error('PDF to image conversion failed:', error)

      // Fallback: use pdf-lib dimensions + blank sharp image
      return this.fallbackConvert(pdfBuffer, options)
    }
  }

  /**
   * Convert a single PDF page to an image using node-canvas for rendering
   */
  private async convertPage(
    pdfDoc: pdfjs.PDFDocumentProxy,
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
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

    // Fill background
    ;(ctx as unknown as { fillStyle: string }).fillStyle = options.background
    ;(ctx as unknown as { fillRect: (x: number, y: number, w: number, h: number) => void }).fillRect(0, 0, width, height)

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise

    // Get raw pixel data from canvas and pass to sharp
    const rawBuffer = canvas.toBuffer('raw')
    let sharpImage = sharp(rawBuffer, {
      raw: { width, height, channels: 4 },
    })

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
   * Fallback conversion method when canvas rendering isn't available.
   * Returns blank images with correct page dimensions.
   */
  private async fallbackConvert(
    pdfBuffer: Buffer,
    options: PdfToImageOptions
  ): Promise<ConvertedPage[]> {
    const format = options.format || 'jpg'
    const background = options.background || '#ffffff'

    // Use pdf-lib to get page dimensions
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()

    const results: ConvertedPage[] = []

    // Determine which pages to process
    let pageIndices: number[]
    if (options.pages === 'all' || !options.pages) {
      pageIndices = Array.from({ length: pages.length }, (_, i) => i)
    } else {
      pageIndices = options.pages
        .map((p) => p - 1)
        .filter((i) => i >= 0 && i < pages.length)
    }

    for (const index of pageIndices) {
      const page = pages[index]
      const { width, height } = page.getSize()

      const scale = (options.dpi || 150) / 72
      const scaledWidth = Math.floor(width * scale)
      const scaledHeight = Math.floor(height * scale)

      const image = sharp({
        create: {
          width: scaledWidth,
          height: scaledHeight,
          channels: 4,
          background,
        },
      })

      let buffer: Buffer
      let mimeType: string

      switch (format) {
        case 'png':
          buffer = await image.png().toBuffer()
          mimeType = 'image/png'
          break
        case 'webp':
          buffer = await image
            .webp({ quality: options.quality || 90 })
            .toBuffer()
          mimeType = 'image/webp'
          break
        case 'jpg':
        default:
          buffer = await image
            .jpeg({ quality: options.quality || 90 })
            .toBuffer()
          mimeType = 'image/jpeg'
          break
      }

      results.push({
        pageNumber: index + 1,
        width: scaledWidth,
        height: scaledHeight,
        buffer,
        mimeType,
        fileName: `page-${index + 1}.${format === 'jpg' ? 'jpg' : format}`,
      })
    }

    return results
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
