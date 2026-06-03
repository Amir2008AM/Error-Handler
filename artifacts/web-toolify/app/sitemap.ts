import { MetadataRoute } from 'next'
import { tools } from '@/lib/tools'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.toolifypdf.online'

const BLOG_ARTICLES = [
  { slug: 'how-to-compress-pdf-online',       lastModified: '2026-06-02' },
  { slug: 'how-to-merge-pdf-files-online',    lastModified: '2026-06-05' },
  { slug: 'how-to-convert-jpg-to-pdf',        lastModified: '2026-06-03' },
  { slug: 'how-to-lock-and-unlock-pdf',       lastModified: '2026-06-04' },
  { slug: 'how-to-convert-pdf-to-word',       lastModified: '2026-06-01' },
  { slug: 'how-to-convert-word-to-pdf',       lastModified: '2026-06-01' },
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
    ...toolRoutes,
    ...blogRoutes,
  ]
}
