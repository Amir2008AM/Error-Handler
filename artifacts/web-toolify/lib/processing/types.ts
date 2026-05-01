/**
 * Core types for the self-contained file processing engine
 * No external API dependencies - all processing happens server-side
 */

// Processing result types
export interface ProcessingResult<T = Buffer> {
  success: boolean
  data?: T
  error?: string
  metadata?: ProcessingMetadata
}

export interface ProcessingMetadata {
  inputSize?: number
  outputSize?: number
  inputFormat?: string
  outputFormat?: string
  processingTime?: number
  pageCount?: number
  width?: number
  height?: number
  [key: string]: string | number | boolean | undefined
}

// PDF Processing Types
export interface PDFMergeOptions {
  files: ArrayBuffer[]
  order?: number[]
}

export interface PDFSplitOptions {
  file: ArrayBuffer
  mode: 'all' | 'range' | 'custom'
  ranges?: string // e.g., "1-3,5,7-9"
  customPages?: number[]
}

export interface PDFRotateOptions {
  file: ArrayBuffer
  rotation: 90 | 180 | 270
  pages?: number[] // specific pages, or all if not provided
}

export interface PDFWatermarkOptions {
  file: ArrayBuffer
  text: string
  opacity?: number
  position?: 'center' | 'diagonal' | 'top' | 'bottom'
  fontSize?: number
  color?: { r: number; g: number; b: number }
}

export interface PDFCompressOptions {
  file: ArrayBuffer
  quality?: 'low' | 'medium' | 'high'
}

export interface PDFToImageOptions {
  file: ArrayBuffer
  format?: 'png' | 'jpeg'
  dpi?: number
  pages?: number[]
}

export interface ImageToPDFOptions {
  images: ArrayBuffer[]
  pageSize?: 'auto' | 'a4' | 'letter'
  margin?: number
  /** JPEG quality for embedded images, 1-100. Default: 78 */
  quality?: number
  /** Maximum pixel dimension (width or height) before downscaling. Default: 1600 */
  maxWidthPx?: number
}

export interface PDFMetadata {
  pageCount: number
  title?: string
  author?: string
  creationDate?: Date
  modificationDate?: Date
  pageWidths: number[]
  pageHeights: number[]
}

// Image Processing Types
export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff'

export interface ImageCompressOptions {
  file: ArrayBuffer
  quality?: number // 1-100
  format?: ImageFormat | 'same'
}

export interface ImageResizeOptions {
  file: ArrayBuffer
  width?: number
  height?: number
  unit?: 'px' | 'percent'
  maintainAspectRatio?: boolean
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  format?: ImageFormat | 'same'
  quality?: number
}

export interface ImageConvertOptions {
  file: ArrayBuffer
  targetFormat: ImageFormat
  quality?: number
}

export interface ImageCropOptions {
  file: ArrayBuffer
  left: number
  top: number
  width: number
  height: number
  format?: ImageFormat | 'same'
  quality?: number
}

export interface ImageRotateOptions {
  file: ArrayBuffer
  angle: number // degrees
  background?: { r: number; g: number; b: number; alpha: number }
  format?: ImageFormat | 'same'
  quality?: number
}

export interface ImageFlipOptions {
  file: ArrayBuffer
  direction: 'horizontal' | 'vertical' | 'both'
  format?: ImageFormat | 'same'
  quality?: number
}

export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  hasAlpha?: boolean
  colorSpace?: string
  density?: number
}

// Document Conversion Types
export interface PDFToWordOptions {
  file: ArrayBuffer
  preserveFormatting?: boolean
}

export interface PDFProtectOptions {
  file: ArrayBuffer
  userPassword?: string
  ownerPassword?: string
  permissions?: {
    printing?: boolean
    modifying?: boolean
    copying?: boolean
    annotating?: boolean
  }
}

export interface PDFUnlockOptions {
  file: ArrayBuffer
  password: string
}

export interface PDFPageNumbersOptions {
  file: ArrayBuffer
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  format?: 'numeric' | 'roman' | 'page-of-total'
  startFrom?: number
  fontSize?: number
  margin?: number
}

export interface PDFOrganizeOptions {
  file: ArrayBuffer
  operations: Array<{
    type: 'delete' | 'move' | 'duplicate'
    pageIndex: number
    targetIndex?: number
  }>
}

export interface PDFRepairOptions {
  file: ArrayBuffer
}

export interface PDFToTextOptions {
  file: ArrayBuffer
}

export interface HTMLToPDFOptions {
  html: string
  pageSize?: 'a4' | 'letter' | 'legal'
  margin?: number
}

export interface ExcelToPDFOptions {
  file: ArrayBuffer
}

export interface WordToPDFOptions {
  file: ArrayBuffer
}

// Batch Processing Types
export interface BatchProcessingOptions<T> {
  files: ArrayBuffer[]
  options: T
  concurrency?: number
}

export interface BatchResult<T = Buffer> {
  results: ProcessingResult<T>[]
  totalProcessed: number
  totalFailed: number
  processingTime: number
}

// Processing Module Interface
export interface ProcessingModule {
  name: string
  version: string
  supportedOperations: string[]
}
