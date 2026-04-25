import { MetadataRoute } from 'next'
import { tools } from '@/lib/tools'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolify.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const toolRoutes: MetadataRoute.Sitemap = tools.map((tool) => ({
    url: `${BASE_URL}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: tool.popular ? 0.9 : 0.7,
  }))

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    ...toolRoutes,
  ]
}
