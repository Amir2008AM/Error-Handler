import { ALL_BLOG_ARTICLES, type BlogArticle } from './blog'

/**
 * Topical internal-linking map: tool slug -> blog article slugs.
 *
 * Rules for editing this map:
 *  - Only list articles that are genuinely about the same topic as the tool.
 *    Relevance matters more than quantity: one highly relevant article beats five loose matches.
 *  - Order the slugs most-relevant-first; the component renders them in this order.
 *  - A tool with no genuinely relevant article should simply be left out of this map
 *    (or given an empty array). The Related Articles section then renders nothing.
 *  - When a new blog article is published, add its slug to the tools it supports here.
 *    No component or page changes are needed.
 */
export const TOOL_RELATED_ARTICLES: Record<string, string[]> = {
  // ---- PDF tools ----
  'merge-pdf': ['merge-pdf-and-pdf-combine-files-for-free-online'],
  'split-pdf': ['how-to-split-pdf-online'],
  'compress-pdf': ['how-to-compress-pdf-online'],
  'page-numbers': ['how-to-add-page-numbers-to-pdf'],
  'pdf-editor': ['free-pdf-editor-online'],
  'organize-pdf': ['free-pdf-editor-online', 'how-to-split-pdf-online'],
  'repair-pdf': ['common-pdf-problems-and-solutions'],

  // ---- Watermark cluster ----
  'watermark-pdf': [
    'protect-your-work-with-pdf-watermark-tool',
    'add-watermark-on-pdf',
    'how-to-watermark-pdf-documents',
  ],

  // ---- PDF security ----
  'protect-pdf': ['how-to-protect-pdf-documents', 'how-to-lock-and-unlock-pdf'],
  'unlock-pdf': ['how-to-lock-and-unlock-pdf', 'how-to-protect-pdf-documents'],

  // ---- Converters ----
  'pdf-to-word': ['convert-pdf-to-word-fast-and-free-online-tool', 'pdf-vs-word-which-format-to-use'],
  'word-to-pdf': ['how-to-convert-word-to-pdf', 'pdf-vs-word-which-format-to-use'],
  'pdf-to-jpg': ['convert-pdf-to-jpg-easily-with-our-free-tool'],
  'image-to-pdf': ['how-to-convert-jpg-to-pdf'],
  'excel-to-pdf': ['how-to-convert-excel-to-pdf'],
  'pdf-to-excel': ['how-to-convert-excel-to-pdf'],
  'ppt-to-pdf': ['how-to-convert-powerpoint-to-pdf'],
  'pdf-to-ppt': ['how-to-convert-powerpoint-to-pdf'],

  // ---- Image tools ----
  'resize-image': ['resize-image-online', 'how-to-reduce-image-file-size'],
  'compress-image': ['how-to-reduce-image-file-size', 'resize-image-online'],
  'crop-image': ['how-to-reduce-image-file-size'],
  'convert-image': ['how-to-reduce-image-file-size'],
}

/** Resolve a tool slug to its genuinely relevant, published articles (unknown slugs are dropped). */
export function getRelatedArticlesForTool(toolSlug: string): BlogArticle[] {
  const slugs = TOOL_RELATED_ARTICLES[toolSlug]
  if (!slugs?.length) return []

  return slugs
    .map((slug) => ALL_BLOG_ARTICLES.find((article) => article.slug === slug))
    .filter((article): article is BlogArticle => Boolean(article))
}
