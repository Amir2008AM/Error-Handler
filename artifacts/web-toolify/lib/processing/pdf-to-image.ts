/**
 * PDF to Image Converter
 *
 * Primary engine  : Ghostscript (gs) — fast, accurate, no in-process rendering
 * Fallback engine : pdfjs-dist + node-canvas — used when GS is unavailable or fails
 *
 * GS command pattern:
 *   gs -dNOPAUSE -dBATCH -dSAFER -q -sDEVICE=jpeg -r{dpi} -dJPEGQ={q}
 *      -sOutputFile=page-%04d.jpg input.pdf
 */

import { PDFDocument } from 'pdf-lib'
import sharp from 'sharp'
import { createCanvas, type Canvas } from 'canvas'
import { join, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'

// ── Ghostscript helpers ────────────────────────────────────────────────────

const GS_RENDER_TIMEOUT_MS = 120_000

interface GsResult { code: number; stderr: string }

function runGs(args: string[]): Promise<GsResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('gs', args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', (c: Buffer) => { stderr += c.toString('utf8') })
    proc.on('error', (err) => { clearTimeout(timer); reject(err) })
    proc.on('close', (code) => { clearTimeout(timer); resolve({ code: code ?? -1, stderr }) })
    const timer = setTimeout(() => {
      proc.kill('SIGKILL')
      reject(new Error('Ghostscript render timed out'))
    }, GS_RENDER_TIMEOUT_MS)
  })
}

async function withGsTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), 'gs-img-'))
  try { return await fn(dir) } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}

// ── pdfjs setup (fallback) ─────────────────────────────────────────────────

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
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs')
    _pdfjs = mod as unknown as typeof import('pdfjs-dist')
    _pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC
  }
  return _pdfjs
}

// ── Public types ───────────────────────────────────────────────────────────

export interface PdfToImageOptions {
  format?: 'jpg' | 'png' | 'webp'
  quality?: number  // 1-100 for jpg/webp
  dpi?: number      // Dots per inch (72–600)
  pages?: number[] | 'all'
  background?: string
}

export interface ConvertedPage {
  pageNumber: number
  width: number
  height: number
  buffer: Buffer
  mimeType: string
  fileName: string
}

// ── Main converter ─────────────────────────────────────────────────────────

export class PdfToImageConverter {

  /**
   * Convert PDF pages to images.
   * Tries Ghostscript first (fast, no canvas required) then falls back to pdfjs+canvas.
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

    // ── Primary: Ghostscript ──────────────────────────────────────────────
    try {
      return await this.convertWithGhostscript(pdfBuffer, { format, quality, dpi, pages })
    } catch (gsErr) {
      console.warn(
        '[PdfToImage] Ghostscript render failed — falling back to pdfjs+canvas:',
        gsErr instanceof Error ? gsErr.message : String(gsErr)
      )
    }

    // ── Fallback: pdfjs-dist + node-canvas ────────────────────────────────
    return this.convertWithPdfjs(pdfBuffer, { format, quality, dpi, pages, background })
  }

  // ── Ghostscript engine ──────────────────────────────────────────────────

  private async convertWithGhostscript(
    pdfBuffer: Buffer,
    options: {
      format: 'jpg' | 'png' | 'webp'
      quality: number
      dpi: number
      pages: number[] | 'all'
    }
  ): Promise<ConvertedPage[]> {
    // GS supports jpeg and png natively; webp is rendered as jpeg then converted
    const gsDevice = options.format === 'png' ? 'png16m' : 'jpeg'
    const tmpExt   = options.format === 'png' ? 'png' : 'jpg'

    return withGsTempDir(async (dir) => {
      const inPath     = join(dir, 'in.pdf')
      const outPattern = join(dir, `page-%04d.${tmpExt}`)

      await writeFile(inPath, pdfBuffer)

      const args: string[] = [
        '-dNOPAUSE', '-dBATCH', '-dSAFER', '-q',
        `-sDEVICE=${gsDevice}`,
        `-r${options.dpi}`,
      ]

      if (gsDevice === 'jpeg') {
        // Clamp to valid range — GS ignores values outside 1-100
        args.push(`-dJPEGQ=${Math.min(100, Math.max(1, options.quality))}`)
      }

      // Page range: GS renders ALL pages by default.
      // For a specific subset we set FirstPage/LastPage to the contiguous
      // range that covers the requested pages; post-filter to exact set below.
      let requestedPages: number[] | null = null
      if (Array.isArray(options.pages) && options.pages.length > 0) {
        requestedPages = [...options.pages].sort((a, b) => a - b)
        args.push(
          `-dFirstPage=${requestedPages[0]}`,
          `-dLastPage=${requestedPages[requestedPages.length - 1]}`
        )
      }

      args.push(`-sOutputFile=${outPattern}`, inPath)

      const { code, stderr } = await runGs(args)
      if (code !== 0) {
        throw new Error(
          `Ghostscript render failed (exit ${code}): ${stderr.slice(0, 300)}`
        )
      }

      // Read output files in sorted order
      const allFiles  = await readdir(dir)
      const pageFiles = allFiles
        .filter(f => f.startsWith('page-') && f.endsWith(`.${tmpExt}`))
        .sort()

      if (pageFiles.length === 0) {
        throw new Error('Ghostscript produced no output pages')
      }

      const results: ConvertedPage[] = []

      for (let i = 0; i < pageFiles.length; i++) {
        let buf: Buffer = Buffer.from(await readFile(join(dir, pageFiles[i])))

        // Derive page number: GS always starts at FirstPage when -dFirstPage is set,
        // so the i-th file corresponds to requestedPages[i] when a subset was chosen.
        const pageNum = requestedPages ? (requestedPages[i] ?? i + 1) : i + 1

        let mimeType: string
        let fileName: string

        if (options.format === 'webp') {
          buf      = await sharp(buf).webp({ quality: options.quality }).toBuffer()
          mimeType = 'image/webp'
          fileName = `page-${pageNum}.webp`
        } else if (options.format === 'png') {
          mimeType = 'image/png'
          fileName = `page-${pageNum}.png`
        } else {
          mimeType = 'image/jpeg'
          fileName = `page-${pageNum}.jpg`
        }

        const meta = await sharp(buf).metadata()
        results.push({
          pageNumber: pageNum,
          width:  meta.width  ?? 0,
          height: meta.height ?? 0,
          buffer: buf,
          mimeType,
          fileName,
        })
      }

      return results
    })
  }

  // ── pdfjs + node-canvas fallback ────────────────────────────────────────

  private async convertWithPdfjs(
    pdfBuffer: Buffer,
    options: {
      format: 'jpg' | 'png' | 'webp'
      quality: number
      dpi: number
      pages: number[] | 'all'
      background: string
    }
  ): Promise<ConvertedPage[]> {
    const scale = options.dpi / 72

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

    const pdfDoc  = await loadingTask.promise
    const numPages = pdfDoc.numPages

    let pageNumbers: number[]
    if (options.pages === 'all') {
      pageNumbers = Array.from({ length: numPages }, (_, i) => i + 1)
    } else {
      pageNumbers = options.pages.filter((p) => p >= 1 && p <= numPages)
    }

    const results: ConvertedPage[] = []
    try {
      for (const pageNum of pageNumbers) {
        const pageResult = await this.convertPageWithCanvas(pdfDoc, pageNum, {
          scale,
          format:     options.format,
          quality:    options.quality,
          background: options.background,
        })
        results.push(pageResult)
      }
    } finally {
      try { await pdfDoc.cleanup(); await pdfDoc.destroy() } catch { /* best-effort */ }
    }

    return results
  }

  private async convertPageWithCanvas(
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
    const page     = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: options.scale })
    const width    = Math.floor(viewport.width)
    const height   = Math.floor(viewport.height)

    const canvas: Canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, width, height)

    await page.render({
      canvas:        canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx    as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise

    const rawBuffer  = canvas.toBuffer('raw')
    const sharpImage = sharp(rawBuffer, {
      raw: { width, height, channels: 4 },
    }).removeAlpha()

    let buffer: Buffer
    let mimeType: string

    switch (options.format) {
      case 'png':
        buffer   = await sharpImage.png().toBuffer()
        mimeType = 'image/png'
        break
      case 'webp':
        buffer   = await sharpImage.webp({ quality: options.quality }).toBuffer()
        mimeType = 'image/webp'
        break
      default:
        buffer   = await sharpImage.jpeg({ quality: options.quality }).toBuffer()
        mimeType = 'image/jpeg'
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

  // ── Utility methods ────────────────────────────────────────────────────

  async getInfo(pdfBuffer: Buffer): Promise<{
    pageCount: number
    pages: Array<{ pageNumber: number; width: number; height: number }>
  }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages  = pdfDoc.getPages()
    return {
      pageCount: pages.length,
      pages: pages.map((page, index) => {
        const { width, height } = page.getSize()
        return { pageNumber: index + 1, width, height }
      }),
    }
  }

  async convertSinglePage(
    pdfBuffer: Buffer,
    pageNumber: number,
    options: Omit<PdfToImageOptions, 'pages'> = {}
  ): Promise<ConvertedPage | null> {
    const results = await this.convert(pdfBuffer, { ...options, pages: [pageNumber] })
    return results[0] || null
  }

  async generateThumbnails(
    pdfBuffer: Buffer,
    options: {
      maxWidth?:  number
      maxHeight?: number
      format?:    'jpg' | 'png' | 'webp'
      quality?:   number
    } = {}
  ): Promise<ConvertedPage[]> {
    const { maxWidth = 200, maxHeight = 300, format = 'jpg', quality = 70 } = options

    const results = await this.convert(pdfBuffer, { format, quality, dpi: 72, pages: 'all' })
    const thumbnails: ConvertedPage[] = []

    for (const page of results) {
      const resized = await sharp(page.buffer)
        .resize(maxWidth, maxHeight, { fit: 'inside', withoutEnlargement: true })
        .toBuffer()
      const meta = await sharp(resized).metadata()
      thumbnails.push({
        pageNumber: page.pageNumber,
        width:      meta.width  || maxWidth,
        height:     meta.height || maxHeight,
        buffer:     resized,
        mimeType:   page.mimeType,
        fileName:   `thumb-${page.pageNumber}.${format}`,
      })
    }

    return thumbnails
  }
}

export const pdfToImageConverter = new PdfToImageConverter()
