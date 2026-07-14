export interface BlogArticle {
  slug: string
  title: string
  description: string
  date: string
  lastModified: string
  readTime: string
  category: string
  color: string
  gradient: string
  isPillar?: boolean
}

export const PILLAR_ARTICLE_MERGE_PDF: BlogArticle = {
  slug: 'merge-pdf-and-pdf-combine-files-for-free-online',
  title: 'Merge PDF and PDF: Combine Files for Free Online',
  description:
    'Need to merge pdf and pdf files? Discover how to combine PDF files for free online with our easy-to-follow guide. Start merging now!',
  date: 'July 9, 2026',
  lastModified: '2026-07-09',
  readTime: '9 min read',
  category: 'Ultimate Guide',
  gradient: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 50%, #ef4444 100%)',
  color: '#7f1d1d',
  isPillar: true,
}

export const PILLAR_ARTICLE: BlogArticle = {
  slug: 'understanding-pdf-your-ultimate-guide-to-pdf-files',
  title: 'Understanding PDF: Your Complete Guide to PDF Files',
  description:
    'Dive into our ultimate guide on PDF files. Discover everything you need to know about the PDF format, its features, security, cross-platform compatibility, and how to use it effectively in 2026.',
  date: 'July 5, 2026',
  lastModified: '2026-07-05',
  readTime: '12 min read',
  category: 'Ultimate Guide',
  gradient: 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)',
  color: '#92400e',
  isPillar: true,
}

export const PILLAR_ARTICLE_3: BlogArticle = {
  slug: 'convert-pdf-to-jpg-easily-with-our-free-tool',
  title: 'Convert PDF to JPG Easily with Our Free Tool',
  description:
    'Convert your files easily with our free PDF to JPG converter. Learn how to transform your PDFs into high-quality JPG images on our blog today!',
  date: 'July 9, 2026',
  lastModified: '2026-07-09',
  readTime: '10 min read',
  category: 'Featured Guide',
  gradient: 'linear-gradient(135deg, #065f46 0%, #059669 50%, #10b981 100%)',
  color: '#065f46',
  isPillar: true,
}

export const PILLAR_ARTICLE_2: BlogArticle = {
  slug: 'convert-pdf-to-word-fast-and-free-online-tool',
  title: 'PDF to Word: Convert PDF to Word Online for Free',
  description:
    "Convert your documents easily with our free tool! Learn how to effortlessly transform your files from PDF to Word online in minutes — including OCR for scanned files.",
  date: 'July 8, 2026',
  lastModified: '2026-07-08',
  readTime: '9 min read',
  category: "Editor's Choice",
  gradient: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
  color: '#1e3a8a',
  isPillar: true,
}

// All pinned/pillar articles, in display order (most important first).
export const PILLAR_ARTICLES: BlogArticle[] = [PILLAR_ARTICLE_MERGE_PDF, PILLAR_ARTICLE_3, PILLAR_ARTICLE, PILLAR_ARTICLE_2]

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'how-to-compress-pdf-online',
    title: 'How to Compress PDF Online for Free',
    description:
      'Learn how to compress PDF files online for free without losing quality. Reduce PDF file size quickly, securely, and easily — no software required.',
    date: 'June 2, 2026',
    lastModified: '2026-06-02',
    readTime: '4 min read',
    category: 'PDF Guide',
    color: '#e85d35',
    gradient: 'linear-gradient(135deg, #c0392b 0%, #e85d35 100%)',
  },
  {
    slug: 'how-to-convert-jpg-to-pdf',
    title: 'How to Convert JPG to PDF Online for Free',
    description:
      'Learn how to convert JPG images to PDF files for free online. Combine your JPGs into high-quality PDFs in seconds — no sign-up required.',
    date: 'June 3, 2026',
    lastModified: '2026-06-03',
    readTime: '3 min read',
    category: 'Image Guide',
    color: '#6d28d9',
    gradient: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  },
  {
    slug: 'how-to-lock-and-unlock-pdf',
    title: 'How to Lock and Unlock PDF Files Online for Free',
    description:
      'Protect sensitive documents with passwords or remove passwords from PDFs you own — fast, secure, and no sign-up required.',
    date: 'June 4, 2026',
    lastModified: '2026-06-04',
    readTime: '4 min read',
    category: 'PDF Security',
    color: '#9333ea',
    gradient: 'linear-gradient(135deg, #6b21a8 0%, #9333ea 100%)',
  },
  {
    slug: 'how-to-convert-pdf-to-word',
    title: 'How to Convert PDF to Word for Free',
    description:
      'Learn 3 easy ways to convert a PDF into an editable Word document at no cost — online tools, Google Docs, and Microsoft Word.',
    date: 'June 1, 2026',
    lastModified: '2026-06-01',
    readTime: '5 min read',
    category: 'PDF Guide',
    color: '#3b6ef5',
    gradient: 'linear-gradient(135deg, #1e40af 0%, #3b6ef5 100%)',
  },
  {
    slug: 'how-to-convert-word-to-pdf',
    title: 'How to Convert Word to PDF Online for Free',
    description:
      'Follow this simple guide to preserve formatting, improve security, and share your Word documents as PDF files easily.',
    date: 'June 1, 2026',
    lastModified: '2026-06-01',
    readTime: '3 min read',
    category: 'Word Guide',
    color: '#0d9488',
    gradient: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
  },
  {
    slug: 'how-to-split-pdf-online',
    title: 'How to Split a PDF File Online for Free',
    description:
      'Extract individual pages, separate sections, or divide a large PDF into smaller files online in seconds — no software or account needed.',
    date: 'June 6, 2026',
    lastModified: '2026-06-06',
    readTime: '4 min read',
    category: 'PDF Guide',
    color: '#16a34a',
    gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
  },
  {
    slug: 'how-to-reduce-image-file-size',
    title: 'How to Reduce Image File Size Without Losing Quality',
    description:
      'Compress, resize, crop, and convert images to reduce file size without visible quality loss — practical methods for web, email, and storage.',
    date: 'June 7, 2026',
    lastModified: '2026-06-07',
    readTime: '5 min read',
    category: 'Image Guide',
    color: '#db2777',
    gradient: 'linear-gradient(135deg, #be185d 0%, #db2777 100%)',
  },
  {
    slug: 'pdf-vs-word-which-format-to-use',
    title: 'PDF vs Word: Which Document Format Should You Use?',
    description:
      'A practical comparison of PDF and Word — their key differences, when each format is the right choice, and how to convert between them.',
    date: 'June 9, 2026',
    lastModified: '2026-06-09',
    readTime: '4 min read',
    category: 'Document Guide',
    color: '#4f46e5',
    gradient: 'linear-gradient(135deg, #3730a3 0%, #4f46e5 100%)',
  },
  {
    slug: 'how-to-watermark-pdf-documents',
    title: 'How to Add a Watermark to a PDF Document',
    description:
      'Mark PDFs as confidential, draft, or sample using a text watermark. Covers positioning, opacity, use cases, and step-by-step instructions.',
    date: 'June 10, 2026',
    lastModified: '2026-06-10',
    readTime: '3 min read',
    category: 'PDF Security',
    color: '#0891b2',
    gradient: 'linear-gradient(135deg, #0e7490 0%, #0891b2 100%)',
  },
  {
    slug: 'how-to-convert-excel-to-pdf',
    title: 'How to Convert Excel to PDF Online for Free',
    description:
      'Convert Excel spreadsheets to PDF for sharing, submission, and archiving. Covers formatting tips, common issues, and when PDF is better than XLS.',
    date: 'June 11, 2026',
    lastModified: '2026-06-11',
    readTime: '4 min read',
    category: 'Spreadsheet Guide',
    color: '#e11d48',
    gradient: 'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
  },
  {
    slug: 'how-to-convert-powerpoint-to-pdf',
    title: 'How to Convert PowerPoint to PDF Online for Free',
    description:
      'Share presentations in a universally readable format. Learn what gets preserved in conversion, what does not, and how to avoid common issues.',
    date: 'June 12, 2026',
    lastModified: '2026-06-12',
    readTime: '3 min read',
    category: 'Presentation Guide',
    color: '#65a30d',
    gradient: 'linear-gradient(135deg, #4d7c0f 0%, #65a30d 100%)',
  },
  {
    slug: 'how-to-add-page-numbers-to-pdf',
    title: 'How to Add Page Numbers to a PDF Online for Free',
    description:
      'Add page numbers to any PDF document in seconds. Covers positioning, alignment, starting number, and best practices by document type.',
    date: 'June 13, 2026',
    lastModified: '2026-06-13',
    readTime: '5 min read',
    category: 'PDF Guide',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
  },
  {
    slug: 'how-to-protect-pdf-documents',
    title: 'How to Protect PDF Documents with a Password',
    description:
      'Add password encryption to sensitive PDF files before sharing. Covers how PDF protection works, choosing strong passwords, and when to unlock files.',
    date: 'June 14, 2026',
    lastModified: '2026-06-14',
    readTime: '4 min read',
    category: 'PDF Security',
    color: '#0284c7',
    gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
  },
  {
    slug: 'common-pdf-problems-and-solutions',
    title: '8 Common PDF Problems and How to Fix Them',
    description:
      'Practical solutions to the most frequent PDF issues — files too large to send, forgotten passwords, unselectable text, corrupted files, and more.',
    date: 'June 15, 2026',
    lastModified: '2026-06-15',
    readTime: '5 min read',
    category: 'Troubleshooting',
    color: '#059669',
    gradient: 'linear-gradient(135deg, #047857 0%, #059669 100%)',
  },
]

export const ALL_BLOG_ARTICLES: BlogArticle[] = [...PILLAR_ARTICLES, ...BLOG_ARTICLES]
