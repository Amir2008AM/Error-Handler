/**
 * PDF Processing Module
 * Self-contained PDF processing using pdf-lib and docx libraries
 * No external API dependencies
 */

import { PDFDocument, rgb, degrees, StandardFonts, PDFName, PDFRawStream } from 'pdf-lib'
import sharp from 'sharp'
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

let _pdfjs: typeof import('pdfjs-dist') | null = null
async function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist')
    _pdfjs.GlobalWorkerOptions.workerSrc = ''
  }
  return _pdfjs
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
          const pdf = await PDFDocument.load(fileBuffer)
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
   * Convert images to PDF
   */
  async imagesToPdf(options: ImageToPDFOptions): Promise<ProcessingResult<Buffer>> {
    try {
      if (!options.images || options.images.length === 0) {
        return this.error('At least one image is required')
      }

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.create()
        const margin = options.margin ?? 0
        const quality = options.quality ?? 0.9

        for (const imageBuffer of options.images) {
          this.validateBuffer(imageBuffer, 'image')
          const buffer = this.toBuffer(imageBuffer)
          
          // Detect image type from magic bytes
          let image
          if (buffer[0] === 0xff && buffer[1] === 0xd8) {
            // JPEG
            image = await pdfDoc.embedJpg(buffer)
          } else if (buffer[0] === 0x89 && buffer[1] === 0x50) {
            // PNG
            image = await pdfDoc.embedPng(buffer)
          } else {
            // Try PNG first, then JPEG
            try {
              image = await pdfDoc.embedPng(buffer)
            } catch {
              image = await pdfDoc.embedJpg(buffer)
            }
          }

          const imgDims = image.scale(1)
          
          // Calculate page size
          let pageWidth: number
          let pageHeight: number

          if (options.pageSize === 'a4') {
            pageWidth = 595.28
            pageHeight = 841.89
          } else if (options.pageSize === 'letter') {
            pageWidth = 612
            pageHeight = 792
          } else {
            // Auto: use image dimensions
            pageWidth = imgDims.width + margin * 2
            pageHeight = imgDims.height + margin * 2
          }

          const page = pdfDoc.addPage([pageWidth, pageHeight])

          // Scale image to fit page with margins
          const availableWidth = pageWidth - margin * 2
          const availableHeight = pageHeight - margin * 2
          const scale = Math.min(
            availableWidth / imgDims.width,
            availableHeight / imgDims.height,
            1
          )

          const scaledWidth = imgDims.width * scale
          const scaledHeight = imgDims.height * scale
          const x = margin + (availableWidth - scaledWidth) / 2
          const y = margin + (availableHeight - scaledHeight) / 2

          page.drawImage(image, {
            x,
            y,
            width: scaledWidth,
            height: scaledHeight,
          })
        }

        return Buffer.from(await pdfDoc.save())
      })

      return this.success(result, {
        outputSize: result.length,
        pageCount: options.images.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to convert images to PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert PDF to Word document using pdfjs-dist for text + position extraction.
   * Groups text by Y position into lines, detects headings by font size,
   * detects simple tables by X-alignment, and builds a real .docx.
   */
  async toWord(options: PDFToWordOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        // Use pdfjs-dist to extract text with position data
        const pdfjs = await getPdfjs()
        const loadingTask = pdfjs.getDocument({
          data: new Uint8Array(options.file),
          verbosity: 0,
        })
        const pdfDocument = await loadingTask.promise
        const pageCount = pdfDocument.numPages

        interface TextItem {
          str: string
          x: number
          y: number
          fontSize: number
        }

        const allPageItems: TextItem[][] = []

        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          const page = await pdfDocument.getPage(pageNum)
          const textContent = await page.getTextContent()
          const viewport = page.getViewport({ scale: 1 })

          const items: TextItem[] = []
          for (const item of textContent.items as Array<{
            str: string
            transform: number[]
            width: number
            height: number
          }>) {
            if (!item.str.trim()) continue
            // transform = [a, b, c, d, e, f] — e=x, f=y, d≈fontSize
            const x = item.transform[4]
            const y = viewport.height - item.transform[5] // flip Y (PDF coords are bottom-up)
            const fontSize = Math.abs(item.transform[3])
            items.push({ str: item.str, x, y, fontSize })
          }
          allPageItems.push(items)
        }

        // Determine dominant (body) font size to classify headings
        const allFontSizes = allPageItems.flat().map((i) => i.fontSize)
        const sortedSizes = [...allFontSizes].sort((a, b) => a - b)
        const medianFontSize = sortedSizes[Math.floor(sortedSizes.length / 2)] ?? 12

        const docChildren: (Paragraph | Table)[] = []

        for (let p = 0; p < allPageItems.length; p++) {
          const items = allPageItems[p]
          if (p > 0) {
            docChildren.push(
              new Paragraph({
                text: '',
                spacing: { before: 400 },
              })
            )
          }

          // Group items into lines by Y position (within 5 units = same line)
          const lines: TextItem[][] = []
          for (const item of items) {
            const existingLine = lines.find(
              (line) => Math.abs(line[0].y - item.y) <= 5
            )
            if (existingLine) {
              existingLine.push(item)
            } else {
              lines.push([item])
            }
          }
          // Sort lines by Y (top to bottom), items in each line by X (left to right)
          lines.sort((a, b) => a[0].y - b[0].y)
          for (const line of lines) {
            line.sort((a, b) => a.x - b.x)
          }

          // Detect table patterns: 3+ consecutive lines where ≥2 items share similar X positions
          const isTableLine = (lineA: TextItem[], lineB: TextItem[]): boolean => {
            if (lineA.length < 2 || lineB.length < 2) return false
            const matchCount = lineA.filter((a) =>
              lineB.some((b) => Math.abs(a.x - b.x) <= 10)
            ).length
            return matchCount >= 2
          }

          let i = 0
          while (i < lines.length) {
            // Try to detect a table block
            let tableEnd = i + 1
            while (
              tableEnd < lines.length &&
              isTableLine(lines[tableEnd - 1], lines[tableEnd])
            ) {
              tableEnd++
            }

            if (tableEnd - i >= 3) {
              // Build a docx Table from these lines
              const tableLines = lines.slice(i, tableEnd)
              const maxCols = Math.max(...tableLines.map((l) => l.length))
              const rows = tableLines.map((line) => {
                const cells = Array.from({ length: maxCols }, (_, ci) => {
                  const cell = line[ci]
                  return new TableCell({
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: cell?.str ?? '' })],
                      }),
                    ],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  })
                })
                return new TableRow({ children: cells })
              })
              docChildren.push(
                new Table({
                  rows,
                  width: { size: 100, type: WidthType.PERCENTAGE },
                })
              )
              i = tableEnd
            } else {
              // Normal line → paragraph
              const line = lines[i]
              const lineText = line.map((item) => item.str).join(' ').trim()
              const avgFontSize =
                line.reduce((s, item) => s + item.fontSize, 0) / line.length

              let heading: (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined
              if (avgFontSize >= medianFontSize * 1.8) {
                heading = HeadingLevel.HEADING_1
              } else if (avgFontSize >= medianFontSize * 1.4) {
                heading = HeadingLevel.HEADING_2
              } else if (avgFontSize >= medianFontSize * 1.2) {
                heading = HeadingLevel.HEADING_3
              }

              if (lineText) {
                docChildren.push(
                  new Paragraph({
                    ...(heading ? { heading } : {}),
                    children: [
                      new TextRun({
                        text: lineText,
                        bold: !!heading,
                        size: Math.round(Math.min(avgFontSize * 2, 72)),
                      }),
                    ],
                    spacing: { after: 100 },
                    alignment: AlignmentType.LEFT,
                  })
                )
              }
              i++
            }
          }
        }

        if (docChildren.length === 0) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'No extractable text found in this PDF.' }),
              ],
            })
          )
        }

        const doc = new Document({
          sections: [{ properties: {}, children: docChildren }],
        })

        return Buffer.from(await Packer.toBuffer(doc))
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
   * Compress PDF — strips metadata, recompresses embedded JPEGs at 60% quality,
   * removes thumbnails, and saves with object streams.
   */
  async compress(file: ArrayBuffer): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)
      const inputSize = file.byteLength

      const { result, time } = await this.measureTime(async () => {
        const pdfDoc = await PDFDocument.load(file, {
          ignoreEncryption: true,
          updateMetadata: false,
        })

        // 1. Strip all metadata
        pdfDoc.setTitle('')
        pdfDoc.setAuthor('')
        pdfDoc.setSubject('')
        pdfDoc.setKeywords([])
        pdfDoc.setProducer('')
        pdfDoc.setCreator('')

        // 2. Remove embedded thumbnail (/Thumb) from each page dict
        for (let i = 0; i < pdfDoc.getPageCount(); i++) {
          const page = pdfDoc.getPage(i)
          const pageNode = page.node
          if (pageNode.has(PDFName.of('Thumb'))) {
            pageNode.delete(PDFName.of('Thumb'))
          }
        }

        // 3. Re-compress embedded JPEG (DCTDecode) images with sharp at 60% quality
        try {
          const context = pdfDoc.context
          for (const [ref, obj] of context.enumerateIndirectObjects()) {
            if (!(obj instanceof PDFRawStream)) continue

            const dict = obj.dict
            const subtype = dict.get(PDFName.of('Subtype'))
            const filter = dict.get(PDFName.of('Filter'))

            const isJpeg =
              subtype?.toString() === '/Image' &&
              filter?.toString() === '/DCTDecode'

            if (!isJpeg) continue

            try {
              const original = Buffer.from(obj.contents)
              const recompressed = await sharp(original)
                .jpeg({ quality: 60 })
                .toBuffer()

              if (recompressed.length < original.length) {
                // Rebuild the stream with recompressed bytes
                const newStream = context.stream(recompressed, {
                  Type: 'XObject',
                  Subtype: 'Image',
                  Filter: 'DCTDecode',
                  Width: dict.get(PDFName.of('Width')),
                  Height: dict.get(PDFName.of('Height')),
                  ColorSpace: dict.get(PDFName.of('ColorSpace')),
                  BitsPerComponent: dict.get(PDFName.of('BitsPerComponent')),
                })
                context.assign(ref, newStream)
              }
            } catch {
              // Skip images that can't be recompressed
            }
          }
        } catch {
          // If image recompression fails, continue with other optimizations
        }

        // 4. Save with object streams for maximum compression
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true })

        return Buffer.from(pdfBytes)
      })

      const compressionRatio = inputSize > 0
        ? (1 - result.length / inputSize) * 100
        : 0

      return this.success(result, {
        inputSize,
        outputSize: result.length,
        compressionRatio,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to compress PDF: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }
}

// Export singleton instance
export const pdfProcessor = new PDFProcessor()
