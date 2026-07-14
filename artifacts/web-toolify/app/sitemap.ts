import { MetadataRoute } from 'next'
import { tools } from '@/lib/tools'
import { ALL_BLOG_ARTICLES } from '@/lib/blog'
import { ALL_STATIC_PAGES } from '@/lib/static-pages'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolifypdf.online'

// Pinned to the date we last audited + deployed all structured-data and
// canonical fixes. Update this whenever content is significantly changed.
const TODAY = new Date('2026-07-14')

const CATEGORY_SLUGS = [
  'pdf-tools', 'security-tools', 'converters',
  'image-tools', 'text-tools', 'calculators',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${BASE_URL}/${tool.slug}`,
    lastModified: TODAY,
    changeFrequency: 'monthly',
    priority: tool.popular ? 0.9 : 0.7,
  }))

  const categoryRoutes: MetadataRoute.Sitemap = CATEGORY_SLUGS.map((slug) => ({
    url: `${BASE_URL}/category/${slug}`,
    lastModified: new Date('2026-06-01'),
    changeFrequency: 'weekly',
    priority: 0.85,
  }))

  const blogRoutes: MetadataRoute.Sitemap = ALL_BLOG_ARTICLES.map((article) => ({
    url: `${BASE_URL}/blog/${article.slug}`,
    lastModified: new Date(article.lastModified),
    changeFrequency: 'monthly',
    priority: article.isPillar ? 0.9 : 0.7,
  }))

  const pageRoutes: MetadataRoute.Sitemap = ALL_STATIC_PAGES.map(({ path, lastModified, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(lastModified),
    changeFrequency,
    priority,
  }))

  return [
    ...pageRoutes,
    ...categoryRoutes,
    ...toolRoutes,
    ...blogRoutes,
  ]
}
