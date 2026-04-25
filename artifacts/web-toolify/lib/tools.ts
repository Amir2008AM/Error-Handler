export type ToolCategory = 'PDF Tools' | 'Image Tools' | 'Text Tools' | 'Converters' | 'Calculators' | 'Security Tools' | 'OCR Tools'

export interface Tool {
  id: string
  name: string
  description: string
  longDescription: string
  category: ToolCategory
  slug: string
  icon: string
  color: string
  bgColor: string
  tags: string[]
  popular?: boolean
  isNew?: boolean
}

export const tools: Tool[] = [
  // PDF Tools
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    description: 'Combine multiple PDF files into a single document.',
    longDescription:
      'Upload multiple PDF files and merge them into one. Reorder them by dragging before merging for full control of the output.',
    category: 'PDF Tools',
    slug: 'merge-pdf',
    icon: 'FilePlus2',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    tags: ['pdf', 'merge', 'combine'],
    popular: true,
  },
  {
    id: 'split-pdf',
    name: 'Split PDF',
    description: 'Split a PDF into multiple separate files.',
    longDescription:
      'Upload a PDF and split it by page ranges or extract individual pages. Perfect for extracting specific sections of large documents.',
    category: 'PDF Tools',
    slug: 'split-pdf',
    icon: 'Scissors',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    tags: ['pdf', 'split', 'extract'],
    popular: true,
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    description: 'Reduce PDF file size while maintaining quality.',
    longDescription:
      'Compress your PDF files to reduce their size significantly. Choose from different compression levels to balance quality and file size.',
    category: 'PDF Tools',
    slug: 'compress-pdf',
    icon: 'FileArchive',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    tags: ['pdf', 'compress', 'reduce', 'size'],
    popular: true,
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    description: 'Rotate PDF pages by 90, 180, or 270 degrees.',
    longDescription:
      'Upload a PDF and rotate all pages by your chosen angle. Perfect for fixing scanned documents or adjusting page orientation.',
    category: 'PDF Tools',
    slug: 'rotate-pdf',
    icon: 'RotateCw',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    tags: ['pdf', 'rotate', 'orientation'],
  },
  {
    id: 'watermark-pdf',
    name: 'Watermark PDF',
    description: 'Add text watermarks to your PDF documents.',
    longDescription:
      'Add custom text watermarks to all pages of your PDF. Control position, opacity, and font size for professional document protection.',
    category: 'PDF Tools',
    slug: 'watermark-pdf',
    icon: 'Droplets',
    color: 'text-sky-600',
    bgColor: 'bg-sky-50',
    tags: ['pdf', 'watermark', 'protect', 'stamp'],
  },
  {
    id: 'page-numbers',
    name: 'Add Page Numbers',
    description: 'Add page numbers to your PDF documents.',
    longDescription:
      'Automatically add page numbers to all pages of your PDF. Choose position, format, and starting number for professional documents.',
    category: 'PDF Tools',
    slug: 'page-numbers',
    icon: 'Hash',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    tags: ['pdf', 'page numbers', 'numbering'],
  },
  {
    id: 'organize-pdf',
    name: 'Organize PDF',
    description: 'Reorder, delete, or duplicate PDF pages.',
    longDescription:
      'Reorganize your PDF by reordering pages, deleting unwanted pages, or duplicating specific pages. Full control over your document structure.',
    category: 'PDF Tools',
    slug: 'organize-pdf',
    icon: 'LayoutList',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    tags: ['pdf', 'organize', 'reorder', 'delete pages'],
  },
  {
    id: 'repair-pdf',
    name: 'Repair PDF',
    description: 'Fix corrupted or damaged PDF files.',
    longDescription:
      'Attempt to repair corrupted or damaged PDF files. Recovers readable content and rebuilds the document structure.',
    category: 'PDF Tools',
    slug: 'repair-pdf',
    icon: 'Wrench',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    tags: ['pdf', 'repair', 'fix', 'recover'],
  },
  
  // Security Tools
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    description: 'Add password protection to your PDF files.',
    longDescription:
      'Secure your PDF documents with password encryption. Set user and owner passwords, control permissions for printing, copying, and editing.',
    category: 'Security Tools',
    slug: 'protect-pdf',
    icon: 'Lock',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    tags: ['pdf', 'protect', 'password', 'encrypt', 'security'],
    popular: true,
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    description: 'Remove password protection from PDF files.',
    longDescription:
      'Remove password restrictions from your PDF files. Unlock PDFs to enable printing, copying, and editing (requires the original password).',
    category: 'Security Tools',
    slug: 'unlock-pdf',
    icon: 'Unlock',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    tags: ['pdf', 'unlock', 'remove password', 'decrypt'],
  },

  
  // Converters
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    description: 'Convert images to a PDF file with custom ordering.',
    longDescription:
      'Upload multiple images and convert them into a single PDF document. Click to assign order numbers and arrange pages exactly how you want them.',
    category: 'Converters',
    slug: 'image-to-pdf',
    icon: 'ImageIcon',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    tags: ['pdf', 'image', 'convert', 'jpg to pdf', 'png to pdf'],
    popular: true,
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    description: 'Convert PDF pages to JPG images.',
    longDescription:
      'Convert each page of your PDF document into high-quality JPG images. Choose output format (JPG, PNG, WebP), quality, and DPI settings.',
    category: 'Converters',
    slug: 'pdf-to-jpg',
    icon: 'Image',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    tags: ['pdf', 'jpg', 'image', 'convert', 'extract images'],
    popular: true,
    isNew: true,
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    description: 'Convert PDF documents to editable Word files.',
    longDescription:
      'Transform your PDF documents into fully editable Microsoft Word (.docx) files while preserving the original formatting and layout.',
    category: 'Converters',
    slug: 'pdf-to-word',
    icon: 'FileText',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    tags: ['pdf', 'word', 'convert', 'docx'],
    popular: true,
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    description: 'Convert Word documents to PDF files.',
    longDescription:
      'Convert your Microsoft Word documents (.docx, .doc) to PDF format. Preserves formatting and creates professional PDF documents.',
    category: 'Converters',
    slug: 'word-to-pdf',
    icon: 'FileText',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    tags: ['word', 'pdf', 'convert', 'docx to pdf'],
    isNew: true,
  },
  {
    id: 'excel-to-pdf',
    name: 'Excel to PDF',
    description: 'Convert Excel spreadsheets to PDF files.',
    longDescription:
      'Convert your Excel spreadsheets (.xlsx, .xls, .csv) to PDF format. Tables and formatting are preserved in the output document.',
    category: 'Converters',
    slug: 'excel-to-pdf',
    icon: 'Table',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    tags: ['excel', 'pdf', 'convert', 'xlsx to pdf', 'spreadsheet'],
    isNew: true,
  },
  {
    id: 'html-to-pdf',
    name: 'HTML to PDF',
    description: 'Convert HTML files or web content to PDF.',
    longDescription:
      'Convert HTML files to PDF documents. Upload an HTML file or paste HTML content to create professional PDF documents.',
    category: 'Converters',
    slug: 'html-to-pdf',
    icon: 'Code',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    tags: ['html', 'pdf', 'convert', 'web to pdf'],
    isNew: true,
  },
  
  // OCR Tools
  {
    id: 'ocr-image',
    name: 'Image to Text (OCR)',
    description: 'Extract text from images using OCR technology.',
    longDescription:
      'Use optical character recognition (OCR) to extract text from images. Supports multiple languages and various image formats.',
    category: 'OCR Tools',
    slug: 'ocr-image',
    icon: 'ScanText',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    tags: ['ocr', 'image', 'text', 'extract', 'recognize'],
    popular: true,
    isNew: true,
  },

  
  // Image Tools
  {
    id: 'compress-image',
    name: 'Compress Image',
    description: 'Reduce image file size while maintaining quality.',
    longDescription:
      'Upload your images and compress them to reduce file size. Choose your desired quality level and format to get the best results.',
    category: 'Image Tools',
    slug: 'compress-image',
    icon: 'Minimize2',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    tags: ['image', 'compress', 'optimize', 'reduce size'],
    popular: true,
  },
  {
    id: 'resize-image',
    name: 'Resize Image',
    description: 'Resize images to exact dimensions or percentages.',
    longDescription:
      'Upload an image and resize it to any dimension you need. Maintain aspect ratio or set custom width and height values.',
    category: 'Image Tools',
    slug: 'resize-image',
    icon: 'Expand',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    tags: ['image', 'resize', 'dimensions', 'scale'],
  },
  {
    id: 'convert-image',
    name: 'Convert Image',
    description: 'Convert images between JPG, PNG, WebP, and GIF.',
    longDescription:
      'Easily convert your images between different formats including JPG, PNG, WebP, AVIF, and GIF with a single click.',
    category: 'Image Tools',
    slug: 'convert-image',
    icon: 'RefreshCw',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    tags: ['image', 'convert', 'format', 'jpg', 'png', 'webp'],
  },
  {
    id: 'crop-image',
    name: 'Crop Image',
    description: 'Crop images to any size with precision controls.',
    longDescription:
      'Upload an image and crop it to your desired dimensions. Set exact pixel coordinates for precise cropping or use the visual editor.',
    category: 'Image Tools',
    slug: 'crop-image',
    icon: 'Crop',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    tags: ['image', 'crop', 'resize', 'trim'],
  },
  
  // Text Tools
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, sentences, and paragraphs.',
    longDescription:
      'Paste or type your text to instantly count words, characters (with and without spaces), sentences, and paragraphs.',
    category: 'Text Tools',
    slug: 'word-counter',
    icon: 'Type',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    tags: ['text', 'words', 'count', 'characters'],
  },
  {
    id: 'text-case',
    name: 'Text Case Converter',
    description: 'Convert text to uppercase, lowercase, title case, and more.',
    longDescription:
      'Transform your text to any case format: UPPERCASE, lowercase, Title Case, Sentence case, camelCase, or snake_case.',
    category: 'Text Tools',
    slug: 'text-case',
    icon: 'CaseSensitive',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    tags: ['text', 'case', 'uppercase', 'lowercase'],
  },
  
  // Calculators
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    description: 'Calculate percentages, discounts, and percentage changes.',
    longDescription:
      'Calculate any percentage with our easy-to-use calculator. Find percentages, percentage increases/decreases, and discounts.',
    category: 'Calculators',
    slug: 'percentage-calculator',
    icon: 'Percent',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    tags: ['calculator', 'percentage', 'math'],
  },
  {
    id: 'age-calculator',
    name: 'Age Calculator',
    description: 'Calculate exact age from a date of birth.',
    longDescription:
      'Enter any date of birth and instantly calculate the exact age in years, months, and days up to today or any target date.',
    category: 'Calculators',
    slug: 'age-calculator',
    icon: 'Calendar',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    tags: ['calculator', 'age', 'date', 'birthday'],
  },
]

export const categories: ToolCategory[] = [
  'PDF Tools',
  'Security Tools',
  'Converters',
  'OCR Tools',
  'Image Tools',
  'Text Tools',
  'Calculators',
]

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug)
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category)
}

export function getPopularTools(): Tool[] {
  return tools.filter((t) => t.popular)
}

export function getNewTools(): Tool[] {
  return tools.filter((t) => t.isNew)
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase()
  return tools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some((tag) => tag.includes(q))
  )
}

export const categoryMeta: Record<ToolCategory, { icon: string; color: string; bgColor: string; description: string }> = {
  'PDF Tools': {
    icon: 'FileText',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    description: 'Merge, split, compress, and organize PDFs',
  },
  'Security Tools': {
    icon: 'Shield',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    description: 'Protect, unlock, and sign PDF documents',
  },
  'Converters': {
    icon: 'ArrowRightLeft',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    description: 'Convert files between different formats',
  },
  'OCR Tools': {
    icon: 'ScanText',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Extract text from images and scanned documents',
  },
  'Image Tools': {
    icon: 'Image',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Compress, resize, and convert images',
  },
  'Text Tools': {
    icon: 'AlignLeft',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Count words, convert case, and edit text',
  },
  'Calculators': {
    icon: 'Calculator',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    description: 'Useful calculators for everyday tasks',
  },
}
