import { MetadataRoute } from 'next'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://toolify.app'
    : 'http://localhost:5000')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    // Absolute URL required by the robots.txt spec
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
