/**
 * Tool definitions for the Dev Test panel.
 * Shared between the API route (server) and the UI panel (client).
 * Must NOT import any server-only or Node.js modules.
 */

export type FileType = 'pdf' | 'image' | 'document'

export interface ParamDef {
  name:         string
  type:         'text' | 'select' | 'number'
  label?:       string
  placeholder?: string
  options?:     string[]
  default?:     string
  required?:    boolean
}

export interface ToolConfig {
  label:           string
  category:        string
  fileField:       string
  fileField2?:     string
  fileType:        FileType
  endpoint:        string
  engine:          string
  steps:           string[]
  params?:         ParamDef[]
  multiFile?:      boolean
  skipValidation?: boolean
}

export const TOOL_CONFIGS: Record<string, ToolConfig> = {
  'compress-pdf': {
    label: 'Compress PDF', category: 'PDF',
    fileField: 'file', fileType: 'pdf',
    endpoint: '/api/compress-pdf', engine: 'Ghostscript',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'GS_COMPRESS', 'STORE'],
    params: [{ name: 'level', type: 'select', label: 'Level', options: ['low', 'medium', 'high'], default: 'medium' }],
  },
  'protect-pdf': {
    label: 'Protect PDF', category: 'Security',
    fileField: 'file', fileType: 'pdf',
    endpoint: '/api/protect-pdf', engine: 'qpdf (AES-256)',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'ENCRYPT', 'STORE'],
    params: [
      { name: 'password',     type: 'text',   label: 'Password',      placeholder: 'min 4 chars', required: true },
      { name: 'allowPrinting', type: 'select', label: 'Allow Printing', options: ['true', 'false'], default: 'true' },
    ],
  },
  'unlock-pdf': {
    label: 'Unlock PDF', category: 'Security',
    fileField: 'file', fileType: 'pdf',
    endpoint: '/api/unlock-pdf', engine: 'qpdf',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'DECRYPT', 'STORE'],
    params: [{ name: 'password', type: 'text', label: 'Password', placeholder: 'PDF password', required: true }],
  },
  'merge-pdf': {
    label: 'Merge PDF', category: 'PDF',
    fileField: 'pdf_0', fileField2: 'pdf_1', fileType: 'pdf',
    endpoint: '/api/merge-pdf', engine: 'pdf-lib',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'PDF_MERGE', 'RESULT'],
    multiFile: true,
  },
  'split-pdf': {
    label: 'Split PDF', category: 'PDF',
    fileField: 'pdf', fileType: 'pdf',
    endpoint: '/api/split-pdf', engine: 'pdf-lib',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'PDF_SPLIT', 'RESULT'],
    params: [
      { name: 'mode',  type: 'select', label: 'Mode',  options: ['all', 'range'], default: 'all' },
      { name: 'range', type: 'text',   label: 'Range', placeholder: 'e.g. 1-3,5', default: '' },
    ],
  },
  'rotate-pdf': {
    label: 'Rotate PDF', category: 'PDF',
    fileField: 'pdf', fileType: 'pdf',
    endpoint: '/api/rotate-pdf', engine: 'pdf-lib',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'ROTATE_PAGES', 'RESULT'],
    params: [{ name: 'rotation', type: 'select', label: 'Angle', options: ['90', '180', '270'], default: '90' }],
  },
  'watermark-pdf': {
    label: 'Watermark PDF', category: 'PDF',
    fileField: 'pdf', fileType: 'pdf',
    endpoint: '/api/watermark-pdf', engine: 'pdf-lib',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'EMBED_WATERMARK', 'RESULT'],
    params: [
      { name: 'text',     type: 'text',   label: 'Text',     placeholder: 'Watermark text', default: 'CONFIDENTIAL' },
      { name: 'position', type: 'select', label: 'Position', options: ['diagonal', 'center', 'top', 'bottom'], default: 'diagonal' },
      { name: 'opacity',  type: 'number', label: 'Opacity',  placeholder: '0.1 – 1.0', default: '0.3' },
    ],
  },
  'pdf-to-text': {
    label: 'PDF to Text', category: 'Converters',
    fileField: 'file', fileType: 'pdf',
    endpoint: '/api/pdf-to-text', engine: 'pdf-lib / pdf-parse',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'TEXT_EXTRACT', 'RESULT'],
  },
  'pdf-to-jpg': {
    label: 'PDF to JPG', category: 'Converters',
    fileField: 'file', fileType: 'pdf',
    endpoint: '/api/pdf-to-jpg', engine: 'pdfjs-dist + node-canvas',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'PDF_RENDER', 'ZIP_OUTPUT'],
  },
  'pdf-to-word': {
    label: 'PDF to Word', category: 'Converters',
    fileField: 'file', fileType: 'pdf',
    endpoint: '/api/pdf-to-word', engine: 'pdf-lib / docx',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'DOC_BUILD', 'RESULT'],
  },
  'compress-image': {
    label: 'Compress Image', category: 'Image',
    fileField: 'image', fileType: 'image',
    endpoint: '/api/compress-image', engine: 'sharp',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'SHARP_PIPELINE', 'ENCODE'],
    params: [
      { name: 'quality', type: 'number', label: 'Quality', placeholder: '10–100', default: '80' },
      { name: 'format',  type: 'select', label: 'Format',  options: ['same', 'jpeg', 'png', 'webp', 'avif'], default: 'same' },
    ],
  },
  'resize-image': {
    label: 'Resize Image', category: 'Image',
    fileField: 'image', fileType: 'image',
    endpoint: '/api/resize-image', engine: 'sharp',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'SHARP_RESIZE', 'ENCODE'],
    params: [
      { name: 'width',  type: 'number', label: 'Width',  placeholder: 'pixels', default: '800' },
      { name: 'height', type: 'number', label: 'Height', placeholder: 'pixels (opt)' },
    ],
  },
  'convert-image': {
    label: 'Convert Image', category: 'Image',
    fileField: 'image', fileType: 'image',
    endpoint: '/api/convert-image', engine: 'sharp',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'SHARP_CONVERT', 'ENCODE'],
    params: [{ name: 'format', type: 'select', label: 'Output Format', options: ['jpeg', 'png', 'webp', 'avif', 'tiff'], default: 'jpeg' }],
  },
  'ocr-image': {
    label: 'OCR (Image → Text)', category: 'OCR',
    fileField: 'file', fileType: 'image',
    endpoint: '/api/ocr/image', engine: 'Tesseract 5',
    steps: ['UPLOAD', 'VALIDATION', 'PREFLIGHT', 'ENGINE_INIT', 'RECOGNITION', 'RESULT'],
    params: [
      { name: 'language',   type: 'select', label: 'Language',    options: ['eng', 'ara', 'fra', 'deu', 'spa', 'chi_sim', 'chi_tra', 'jpn', 'kor', 'rus'], default: 'eng' },
      { name: 'outputType', type: 'select', label: 'Output Type', options: ['json', 'text'], default: 'json' },
    ],
  },
  'word-to-pdf': {
    label: 'Word to PDF', category: 'Converters',
    fileField: 'file', fileType: 'document', skipValidation: true,
    endpoint: '/api/word-to-pdf', engine: 'LibreOffice',
    steps: ['UPLOAD', 'PREFLIGHT', 'SOFFICE_CONVERT', 'STORE'],
  },
  'ppt-to-pdf': {
    label: 'PPT to PDF', category: 'Converters',
    fileField: 'file', fileType: 'document', skipValidation: true,
    endpoint: '/api/ppt-to-pdf', engine: 'LibreOffice',
    steps: ['UPLOAD', 'PREFLIGHT', 'SOFFICE_CONVERT', 'STORE'],
  },
  'excel-to-pdf': {
    label: 'Excel to PDF', category: 'Converters',
    fileField: 'file', fileType: 'document', skipValidation: true,
    endpoint: '/api/excel-to-pdf', engine: 'LibreOffice / Python',
    steps: ['UPLOAD', 'PREFLIGHT', 'SOFFICE_CONVERT', 'STORE'],
  },
}
