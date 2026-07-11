import { NextResponse } from 'next/server'
import { ALL_STATIC_PAGES } from '@/lib/static-pages'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://toolifypdf.online'

export async function GET() {
  const urls = ALL_STATIC_PAGES.map(({ path, lastModified, changeFrequency, priority }) => `
  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
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
