/**
 * Processing Engine - Main Entry Point
 * 
 * A self-contained, scalable file-processing engine
 * All processing happens server-side with no external API dependencies
 * 
 * Supported Operations:
 * - PDF: merge, split, rotate, watermark, extract pages, reorder, convert to/from images
 * - Images: compress, resize, convert, crop, rotate, flip, grayscale, blur, sharpen
 * - Documents: PDF to Word conversion
 * - Utilities: file type detection, ZIP handling, batch processing
 */

// Core types
export * from './types'

// Processing modules
export { pdfProcessor, PDFProcessor } from './pdf-processor'
export { imageProcessor, ImageProcessor } from './image-processor'

// Utilities
export * from './file-utils'

// Base processor for extending
export { BaseProcessor } from './base-processor'

// Quick access functions for common operations
import { pdfProcessor } from './pdf-processor'
import { imageProcessor } from './image-processor'

/**
 * Quick PDF operations
 */
export const pdf = {
  merge: pdfProcessor.merge.bind(pdfProcessor),
  split: pdfProcessor.split.bind(pdfProcessor),
  rotate: pdfProcessor.rotate.bind(pdfProcessor),
  watermark: pdfProcessor.addWatermark.bind(pdfProcessor),
  toWord: pdfProcessor.toWord.bind(pdfProcessor),
  fromImages: pdfProcessor.imagesToPdf.bind(pdfProcessor),
  extractPages: pdfProcessor.extractPages.bind(pdfProcessor),
  reorderPages: pdfProcessor.reorderPages.bind(pdfProcessor),
  getMetadata: pdfProcessor.getMetadata.bind(pdfProcessor),
}

/**
 * Quick image operations
 */
export const image = {
  compress: imageProcessor.compress.bind(imageProcessor),
  resize: imageProcessor.resize.bind(imageProcessor),
  convert: imageProcessor.convert.bind(imageProcessor),
  crop: imageProcessor.crop.bind(imageProcessor),
  rotate: imageProcessor.rotate.bind(imageProcessor),
  flip: imageProcessor.flip.bind(imageProcessor),
  grayscale: imageProcessor.grayscale.bind(imageProcessor),
  blur: imageProcessor.blur.bind(imageProcessor),
  sharpen: imageProcessor.sharpen.bind(imageProcessor),
  getMetadata: imageProcessor.getMetadata.bind(imageProcessor),
  getContentType: imageProcessor.getContentType.bind(imageProcessor),
  getExtension: imageProcessor.getExtension.bind(imageProcessor),
}

/**
 * Engine info
 */
export const engineInfo = {
  name: 'Toolify Processing Engine',
  version: '1.0.0',
  modules: {
    pdf: pdfProcessor.getInfo(),
    image: imageProcessor.getInfo(),
  },
  capabilities: {
    pdf: [
      'merge',
      'split',
      'rotate',
      'watermark',
      'extract-pages',
      'reorder-pages',
      'to-word',
      'from-images',
    ],
    image: [
      'compress',
      'resize',
      'convert',
      'crop',
      'rotate',
      'flip',
      'grayscale',
      'blur',
      'sharpen',
    ],
  },
}
