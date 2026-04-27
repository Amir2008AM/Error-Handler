/**
 * Image Processing Module
 *
 * All operations run as a single sharp pipeline:
 *   sharp(input) → transforms → encoder → toBuffer({ resolveWithObject })
 *
 * Why this matters:
 *   - Old code did `sharp(buf)` then `.metadata()` (full decode), then
 *     ran the transform, then in some places re-wrapped the *output* in
 *     a brand-new sharp instance just to read its dimensions. That's 3
 *     decodes for a single op.
 *   - The new code uses `resolveWithObject` to get final width/height
 *     **and** input metadata for free during the encode pass.
 *   - `failOn: 'error'` rejects malformed input early instead of
 *     silently returning a half-rendered image.
 *   - `limitInputPixels` blocks decompression-bomb DoS uploads.
 *   - `withTimeout` prevents a single bad image from pinning a worker.
 */

import sharp from 'sharp'
import { BaseProcessor } from './base-processor'
import { TIMEOUTS, withTimeout } from './timeout'

// Use all available CPU threads; cap cache to keep RSS predictable.
sharp.concurrency(0)
sharp.cache({ memory: 200, files: 20, items: 200 })

// Hard ceiling on input pixel count (≈ 24k × 24k) to prevent
// decompression-bomb attacks. Per-call override allowed via input opts.
const DEFAULT_PIXEL_LIMIT = 24_000 * 24_000

import type {
  ProcessingResult,
  ImageCompressOptions,
  ImageResizeOptions,
  ImageConvertOptions,
  ImageCropOptions,
  ImageRotateOptions,
  ImageFlipOptions,
  ImageMetadata,
  ImageFormat,
} from './types'

type EncoderOpts = {
  format: ImageFormat
  quality: number
}

export class ImageProcessor extends BaseProcessor {
  constructor() {
    super('ImageProcessor', '2.0.0')
  }

  /**
   * Open a sharp pipeline configured with the same safety defaults
   * everywhere. Centralizing this keeps every public op consistent.
   */
  private open(input: ArrayBuffer | Buffer): sharp.Sharp {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input)
    return sharp(buf, {
      failOn: 'error',
      limitInputPixels: DEFAULT_PIXEL_LIMIT,
      sequentialRead: true,
    })
  }

  private applyEncoder(s: sharp.Sharp, { format, quality }: EncoderOpts): sharp.Sharp {
    switch (format) {
      case 'jpeg':
      case 'jpg':
        return s.jpeg({ quality, mozjpeg: false, trellisQuantisation: true })
      case 'png':
        return s.png({ compressionLevel: 6, palette: true })
      case 'webp':
        return s.webp({ quality, effort: 4 })
      case 'avif':
        return s.avif({ quality, effort: 4 })
      case 'gif':
        return s.gif()
      case 'tiff':
        return s.tiff({ quality, compression: 'lzw' })
      default:
        return s.jpeg({ quality, mozjpeg: false })
    }
  }

  /** Run a pipeline and harvest both buffer + final dimensions in one decode. */
  private async finalize(s: sharp.Sharp, enc: EncoderOpts): Promise<{
    data: Buffer
    width: number
    height: number
    format: string
  }> {
    const { data, info } = await this.applyEncoder(s, enc).toBuffer({
      resolveWithObject: true,
    })
    return { data, width: info.width, height: info.height, format: info.format }
  }

  // ---------------------------------------------------------------
  // Public ops
  // ---------------------------------------------------------------

  async getMetadata(file: ArrayBuffer): Promise<ProcessingResult<ImageMetadata>> {
    try {
      this.validateBuffer(file)
      const meta = await withTimeout(
        this.open(file).metadata(),
        TIMEOUTS.imageOp,
        'image.getMetadata'
      )
      return this.success<ImageMetadata>({
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        format: meta.format ?? 'unknown',
        size: file.byteLength,
        hasAlpha: meta.hasAlpha,
        colorSpace: meta.space,
        density: meta.density,
      })
    } catch (err) {
      return this.error(`Failed to get image metadata: ${this.msg(err)}`)
    }
  }

  async compress(options: ImageCompressOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(this.runCompress(options), TIMEOUTS.imageOp, 'image.compress')
      )
      return this.success(result.data, {
        inputSize: options.file.byteLength,
        outputSize: result.data.length,
        inputFormat: result.inputFormat,
        outputFormat: result.outputFormat,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to compress image: ${this.msg(err)}`)
    }
  }

  private async runCompress(options: ImageCompressOptions) {
    // Single decode pass that yields both metadata and pixels.
    const pipeline = this.open(options.file)
    const inputMeta = await pipeline.metadata()
    const inputFormat = (inputMeta.format as ImageFormat) ?? 'jpeg'
    const outputFormat: ImageFormat =
      options.format === 'same' || !options.format ? inputFormat : options.format
    const final = await this.finalize(pipeline, {
      format: outputFormat,
      quality: options.quality ?? 80,
    })
    return {
      data: final.data,
      width: final.width,
      height: final.height,
      inputFormat,
      outputFormat,
    }
  }

  async resize(options: ImageResizeOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(this.runResize(options), TIMEOUTS.imageOp, 'image.resize')
      )
      return this.success(result.data, {
        inputSize: options.file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to resize image: ${this.msg(err)}`)
    }
  }

  private async runResize(options: ImageResizeOptions) {
    let pipeline = this.open(options.file)
    const meta = await pipeline.metadata()
    const origWidth = meta.width ?? 0
    const origHeight = meta.height ?? 0

    let targetWidth: number | undefined
    let targetHeight: number | undefined
    if (options.unit === 'percent') {
      const percent = options.width ?? 100
      targetWidth = Math.round(origWidth * (percent / 100))
      targetHeight = Math.round(origHeight * (percent / 100))
    } else {
      targetWidth = options.width
      targetHeight = options.height
    }
    if (!targetWidth && !targetHeight) {
      throw new Error('At least one dimension (width or height) is required')
    }

    const maintainAR = options.maintainAspectRatio !== false
    pipeline = pipeline.resize({
      width: targetWidth,
      height: targetHeight,
      fit: maintainAR ? 'inside' : 'fill',
      withoutEnlargement: false,
    })

    const outputFormat: ImageFormat =
      options.format === 'same' || !options.format
        ? ((meta.format as ImageFormat) ?? 'jpeg')
        : options.format

    const final = await this.finalize(pipeline, {
      format: outputFormat,
      quality: options.quality ?? 90,
    })
    return {
      data: final.data,
      width: final.width,
      height: final.height,
      originalWidth: origWidth,
      originalHeight: origHeight,
    }
  }

  async convert(options: ImageConvertOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(this.runConvert(options), TIMEOUTS.imageOp, 'image.convert')
      )
      return this.success(result.data, {
        inputSize: options.file.byteLength,
        outputSize: result.data.length,
        inputFormat: result.inputFormat,
        outputFormat: options.targetFormat,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to convert image: ${this.msg(err)}`)
    }
  }

  private async runConvert(options: ImageConvertOptions) {
    const pipeline = this.open(options.file)
    const meta = await pipeline.metadata()
    const final = await this.finalize(pipeline, {
      format: options.targetFormat,
      quality: options.quality ?? 90,
    })
    return {
      data: final.data,
      width: final.width,
      height: final.height,
      inputFormat: (meta.format as string) ?? 'unknown',
    }
  }

  async crop(options: ImageCropOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(this.runCrop(options), TIMEOUTS.imageOp, 'image.crop')
      )
      return this.success(result.data, {
        inputSize: options.file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to crop image: ${this.msg(err)}`)
    }
  }

  private async runCrop(options: ImageCropOptions) {
    let pipeline = this.open(options.file)
    const meta = await pipeline.metadata()
    const imgWidth = meta.width ?? 0
    const imgHeight = meta.height ?? 0
    if (
      options.left < 0 ||
      options.top < 0 ||
      options.left + options.width > imgWidth ||
      options.top + options.height > imgHeight
    ) {
      throw new Error('Crop region exceeds image boundaries')
    }
    pipeline = pipeline.extract({
      left: Math.round(options.left),
      top: Math.round(options.top),
      width: Math.round(options.width),
      height: Math.round(options.height),
    })
    const outputFormat: ImageFormat =
      options.format === 'same' || !options.format
        ? ((meta.format as ImageFormat) ?? 'jpeg')
        : options.format
    const final = await this.finalize(pipeline, {
      format: outputFormat,
      quality: options.quality ?? 90,
    })
    return { data: final.data, width: final.width, height: final.height }
  }

  async rotate(options: ImageRotateOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(this.runRotate(options), TIMEOUTS.imageOp, 'image.rotate')
      )
      return this.success(result.data, {
        inputSize: options.file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to rotate image: ${this.msg(err)}`)
    }
  }

  private async runRotate(options: ImageRotateOptions) {
    let pipeline = this.open(options.file)
    const meta = await pipeline.metadata()
    const background = options.background ?? { r: 255, g: 255, b: 255, alpha: 1 }
    pipeline = pipeline.rotate(options.angle, { background })
    const outputFormat: ImageFormat =
      options.format === 'same' || !options.format
        ? ((meta.format as ImageFormat) ?? 'jpeg')
        : options.format
    const final = await this.finalize(pipeline, {
      format: outputFormat,
      quality: options.quality ?? 90,
    })
    return { data: final.data, width: final.width, height: final.height }
  }

  async flip(options: ImageFlipOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(this.runFlip(options), TIMEOUTS.imageOp, 'image.flip')
      )
      return this.success(result.data, {
        inputSize: options.file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to flip image: ${this.msg(err)}`)
    }
  }

  private async runFlip(options: ImageFlipOptions) {
    let pipeline = this.open(options.file)
    const meta = await pipeline.metadata()
    if (options.direction === 'horizontal' || options.direction === 'both') {
      pipeline = pipeline.flop()
    }
    if (options.direction === 'vertical' || options.direction === 'both') {
      pipeline = pipeline.flip()
    }
    const outputFormat: ImageFormat =
      options.format === 'same' || !options.format
        ? ((meta.format as ImageFormat) ?? 'jpeg')
        : options.format
    const final = await this.finalize(pipeline, {
      format: outputFormat,
      quality: options.quality ?? 90,
    })
    return { data: final.data, width: final.width, height: final.height }
  }

  async grayscale(file: ArrayBuffer, format?: ImageFormat): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(
          (async () => {
            const pipeline = this.open(file).grayscale()
            const meta = await pipeline.clone().metadata()
            const outputFormat: ImageFormat =
              format ?? ((meta.format as ImageFormat) ?? 'jpeg')
            return this.finalize(pipeline, { format: outputFormat, quality: 90 })
          })(),
          TIMEOUTS.imageOp,
          'image.grayscale'
        )
      )
      return this.success(result.data, {
        inputSize: file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to apply grayscale: ${this.msg(err)}`)
    }
  }

  async blur(
    file: ArrayBuffer,
    sigma: number = 3,
    format?: ImageFormat
  ): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(
          (async () => {
            const pipeline = this.open(file).blur(sigma)
            const meta = await pipeline.clone().metadata()
            const outputFormat: ImageFormat =
              format ?? ((meta.format as ImageFormat) ?? 'jpeg')
            return this.finalize(pipeline, { format: outputFormat, quality: 90 })
          })(),
          TIMEOUTS.imageOp,
          'image.blur'
        )
      )
      return this.success(result.data, {
        inputSize: file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to blur image: ${this.msg(err)}`)
    }
  }

  async sharpen(
    file: ArrayBuffer,
    sigma: number = 1,
    format?: ImageFormat
  ): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)
      const { result, time } = await this.measureTime(() =>
        withTimeout(
          (async () => {
            const pipeline = this.open(file).sharpen(sigma)
            const meta = await pipeline.clone().metadata()
            const outputFormat: ImageFormat =
              format ?? ((meta.format as ImageFormat) ?? 'jpeg')
            return this.finalize(pipeline, { format: outputFormat, quality: 90 })
          })(),
          TIMEOUTS.imageOp,
          'image.sharpen'
        )
      )
      return this.success(result.data, {
        inputSize: file.byteLength,
        outputSize: result.data.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to sharpen image: ${this.msg(err)}`)
    }
  }

  getContentType(format: ImageFormat): string {
    const types: Record<ImageFormat, string> = {
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      avif: 'image/avif',
      gif: 'image/gif',
      tiff: 'image/tiff',
    }
    return types[format] || 'image/jpeg'
  }

  getExtension(format: ImageFormat): string {
    if (format === 'jpeg') return 'jpg'
    return format
  }

  private msg(err: unknown): string {
    return err instanceof Error ? err.message : 'Unknown error'
  }
}

export const imageProcessor = new ImageProcessor()
