import { NextResponse } from 'next/server'
import { ALL_BLOG_ARTICLES } from '@/lib/blog'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolifypdf.online'

export async function GET() {
  const urls = ALL_BLOG_ARTICLES.map((article) => `
  <url>
    <loc>${BASE_URL}/blog/${article.slug}</loc>
    <lastmod>${article.lastModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${article.isPillar ? '0.9' : '0.7'}</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
