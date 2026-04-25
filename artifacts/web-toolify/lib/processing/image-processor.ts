/**
 * Image Processing Module
 * Self-contained image processing using sharp library
 * No external API dependencies
 */

import sharp from 'sharp'
import { BaseProcessor } from './base-processor'
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

export class ImageProcessor extends BaseProcessor {
  constructor() {
    super('ImageProcessor', '1.0.0')
  }

  /**
   * Get image metadata
   */
  async getMetadata(file: ArrayBuffer): Promise<ProcessingResult<ImageMetadata>> {
    try {
      this.validateBuffer(file)
      const buffer = this.toBuffer(file)
      const metadata = await sharp(buffer).metadata()

      return this.success<ImageMetadata>({
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        format: metadata.format ?? 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha,
        colorSpace: metadata.space,
        density: metadata.density,
      })
    } catch (err) {
      return this.error(`Failed to get image metadata: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Compress image with quality settings
   */
  async compress(options: ImageCompressOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(options.file)
        const sharpInstance = sharp(buffer)
        const metadata = await sharpInstance.metadata()

        const quality = options.quality ?? 80
        const outputFormat = options.format === 'same' || !options.format
          ? (metadata.format as ImageFormat) ?? 'jpeg'
          : options.format

        const outputBuffer = await this.applyFormat(sharpInstance, outputFormat, quality)

        return {
          buffer: outputBuffer,
          inputFormat: metadata.format ?? 'unknown',
          outputFormat,
        }
      })

      return this.success(result.buffer, {
        inputSize: options.file.byteLength,
        outputSize: result.buffer.length,
        inputFormat: result.inputFormat,
        outputFormat: result.outputFormat,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to compress image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Resize image to specific dimensions
   */
  async resize(options: ImageResizeOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(options.file)
        let sharpInstance = sharp(buffer)
        const metadata = await sharpInstance.metadata()

        const origWidth = metadata.width ?? 800
        const origHeight = metadata.height ?? 600

        // Calculate target dimensions
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

        // Apply resize
        sharpInstance = sharpInstance.resize({
          width: targetWidth,
          height: targetHeight,
          fit: options.maintainAspectRatio !== false ? 'inside' : 'fill',
          withoutEnlargement: false,
        })

        const quality = options.quality ?? 90
        const outputFormat = options.format === 'same' || !options.format
          ? (metadata.format as ImageFormat) ?? 'jpeg'
          : options.format

        const outputBuffer = await this.applyFormat(sharpInstance, outputFormat, quality)
        const outputMeta = await sharp(outputBuffer).metadata()

        return {
          buffer: outputBuffer,
          outputWidth: outputMeta.width ?? 0,
          outputHeight: outputMeta.height ?? 0,
          originalWidth: origWidth,
          originalHeight: origHeight,
        }
      })

      return this.success(result.buffer, {
        inputSize: options.file.byteLength,
        outputSize: result.buffer.length,
        width: result.outputWidth,
        height: result.outputHeight,
        originalWidth: result.originalWidth,
        originalHeight: result.originalHeight,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to resize image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Convert image to different format
   */
  async convert(options: ImageConvertOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(options.file)
        const sharpInstance = sharp(buffer)
        const metadata = await sharpInstance.metadata()

        const quality = options.quality ?? 90
        const outputBuffer = await this.applyFormat(sharpInstance, options.targetFormat, quality)

        return {
          buffer: outputBuffer,
          inputFormat: metadata.format ?? 'unknown',
        }
      })

      return this.success(result.buffer, {
        inputSize: options.file.byteLength,
        outputSize: result.buffer.length,
        inputFormat: result.inputFormat,
        outputFormat: options.targetFormat,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to convert image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Crop image to specific region
   */
  async crop(options: ImageCropOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(options.file)
        let sharpInstance = sharp(buffer)
        const metadata = await sharpInstance.metadata()

        // Validate crop region
        const imgWidth = metadata.width ?? 0
        const imgHeight = metadata.height ?? 0

        if (
          options.left < 0 ||
          options.top < 0 ||
          options.left + options.width > imgWidth ||
          options.top + options.height > imgHeight
        ) {
          throw new Error('Crop region exceeds image boundaries')
        }

        sharpInstance = sharpInstance.extract({
          left: Math.round(options.left),
          top: Math.round(options.top),
          width: Math.round(options.width),
          height: Math.round(options.height),
        })

        const quality = options.quality ?? 90
        const outputFormat = options.format === 'same' || !options.format
          ? (metadata.format as ImageFormat) ?? 'jpeg'
          : options.format

        return await this.applyFormat(sharpInstance, outputFormat, quality)
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        width: options.width,
        height: options.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to crop image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Rotate image by specified angle
   */
  async rotate(options: ImageRotateOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(options.file)
        let sharpInstance = sharp(buffer)
        const metadata = await sharpInstance.metadata()

        const background = options.background ?? { r: 255, g: 255, b: 255, alpha: 1 }
        sharpInstance = sharpInstance.rotate(options.angle, { background })

        const quality = options.quality ?? 90
        const outputFormat = options.format === 'same' || !options.format
          ? (metadata.format as ImageFormat) ?? 'jpeg'
          : options.format

        const outputBuffer = await this.applyFormat(sharpInstance, outputFormat, quality)
        const outputMeta = await sharp(outputBuffer).metadata()

        return {
          buffer: outputBuffer,
          width: outputMeta.width ?? 0,
          height: outputMeta.height ?? 0,
        }
      })

      return this.success(result.buffer, {
        inputSize: options.file.byteLength,
        outputSize: result.buffer.length,
        width: result.width,
        height: result.height,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to rotate image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Flip image horizontally or vertically
   */
  async flip(options: ImageFlipOptions): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(options.file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(options.file)
        let sharpInstance = sharp(buffer)
        const metadata = await sharpInstance.metadata()

        if (options.direction === 'horizontal' || options.direction === 'both') {
          sharpInstance = sharpInstance.flop()
        }
        if (options.direction === 'vertical' || options.direction === 'both') {
          sharpInstance = sharpInstance.flip()
        }

        const quality = options.quality ?? 90
        const outputFormat = options.format === 'same' || !options.format
          ? (metadata.format as ImageFormat) ?? 'jpeg'
          : options.format

        return await this.applyFormat(sharpInstance, outputFormat, quality)
      })

      return this.success(result, {
        inputSize: options.file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to flip image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Apply grayscale filter
   */
  async grayscale(file: ArrayBuffer, format?: ImageFormat): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(file)
        let sharpInstance = sharp(buffer).grayscale()
        const metadata = await sharpInstance.metadata()

        const outputFormat = format ?? (metadata.format as ImageFormat) ?? 'jpeg'
        return await this.applyFormat(sharpInstance, outputFormat, 90)
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to apply grayscale: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Blur image
   */
  async blur(
    file: ArrayBuffer,
    sigma: number = 3,
    format?: ImageFormat
  ): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(file)
        let sharpInstance = sharp(buffer).blur(sigma)
        const metadata = await sharpInstance.metadata()

        const outputFormat = format ?? (metadata.format as ImageFormat) ?? 'jpeg'
        return await this.applyFormat(sharpInstance, outputFormat, 90)
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to blur image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Sharpen image
   */
  async sharpen(
    file: ArrayBuffer,
    sigma: number = 1,
    format?: ImageFormat
  ): Promise<ProcessingResult<Buffer>> {
    try {
      this.validateBuffer(file)

      const { result, time } = await this.measureTime(async () => {
        const buffer = this.toBuffer(file)
        let sharpInstance = sharp(buffer).sharpen(sigma)
        const metadata = await sharpInstance.metadata()

        const outputFormat = format ?? (metadata.format as ImageFormat) ?? 'jpeg'
        return await this.applyFormat(sharpInstance, outputFormat, 90)
      })

      return this.success(result, {
        inputSize: file.byteLength,
        outputSize: result.length,
        processingTime: time,
      })
    } catch (err) {
      return this.error(`Failed to sharpen image: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  /**
   * Apply format and quality to sharp instance
   */
  private async applyFormat(
    sharpInstance: sharp.Sharp,
    format: ImageFormat,
    quality: number
  ): Promise<Buffer> {
    switch (format) {
      case 'jpeg':
      case 'jpg':
        return sharpInstance.jpeg({ quality, mozjpeg: true }).toBuffer()
      case 'png':
        return sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer()
      case 'webp':
        return sharpInstance.webp({ quality }).toBuffer()
      case 'avif':
        return sharpInstance.avif({ quality }).toBuffer()
      case 'gif':
        return sharpInstance.gif().toBuffer()
      case 'tiff':
        return sharpInstance.tiff({ quality }).toBuffer()
      default:
        return sharpInstance.jpeg({ quality }).toBuffer()
    }
  }

  /**
   * Get content type for format
   */
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

  /**
   * Get file extension for format
   */
  getExtension(format: ImageFormat): string {
    if (format === 'jpeg') return 'jpg'
    return format
  }
}

// Export singleton instance
export const imageProcessor = new ImageProcessor()
