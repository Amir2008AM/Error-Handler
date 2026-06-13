import { MetadataRoute } from 'next'
import { tools } from '@/lib/tools'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.toolifypdf.online'

const BLOG_ARTICLES = [
  { slug: 'how-to-compress-pdf-online',          lastModified: '2026-06-02' },
  { slug: 'how-to-merge-pdf-files-online',       lastModified: '2026-06-05' },
  { slug: 'how-to-convert-jpg-to-pdf',           lastModified: '2026-06-03' },
  { slug: 'how-to-lock-and-unlock-pdf',          lastModified: '2026-06-04' },
  { slug: 'how-to-convert-pdf-to-word',          lastModified: '2026-06-01' },
  { slug: 'how-to-convert-word-to-pdf',          lastModified: '2026-06-01' },
  { slug: 'how-to-split-pdf-online',             lastModified: '2026-06-06' },
  { slug: 'how-to-reduce-image-file-size',       lastModified: '2026-06-07' },
  { slug: 'pdf-vs-word-which-format-to-use',     lastModified: '2026-06-09' },
  { slug: 'how-to-watermark-pdf-documents',      lastModified: '2026-06-10' },
  { slug: 'how-to-convert-excel-to-pdf',         lastModified: '2026-06-11' },
  { slug: 'how-to-convert-powerpoint-to-pdf',    lastModified: '2026-06-12' },
  { slug: 'how-to-add-page-numbers-to-pdf',      lastModified: '2026-06-13' },
  { slug: 'how-to-protect-pdf-documents',        lastModified: '2026-06-14' },
  { slug: 'common-pdf-problems-and-solutions',   lastModified: '2026-06-15' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${BASE_URL}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: tool.popular ? 0.9 : 0.7,
  }))

  const blogRoutes: MetadataRoute.Sitemap = BLOG_ARTICLES.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.lastModified),
    changeFrequency: 'monthly',
    priority: 0.7,
  }))

  const legalRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/privacy-policy`,       lastModified: new Date('2026-06-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms-and-conditions`, lastModified: new Date('2026-06-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/cookies-policy`,       lastModified: new Date('2026-06-01'), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/disclaimer`,           lastModified: new Date('2026-06-01'), changeFrequency: 'yearly', priority: 0.3 },
  ]

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date('2026-06-01'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/contact-us`,
      lastModified: new Date('2026-06-01'),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    ...toolRoutes,
    ...blogRoutes,
    ...legalRoutes,
  ]
}
