import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.toolifypdf.online'

const TODAY = new Date().toISOString().split('T')[0]

const SUB_SITEMAPS = [
  { name: 'tools-sitemap.xml',      lastmod: TODAY },
  { name: 'categories-sitemap.xml', lastmod: TODAY },
  { name: 'blog-sitemap.xml',       lastmod: TODAY },
  { name: 'pages-sitemap.xml',      lastmod: TODAY },
]

export async function GET() {
  const sitemaps = SUB_SITEMAPS.map(({ name, lastmod }) => `
  <sitemap>
    <loc>${BASE_URL}/${name}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
