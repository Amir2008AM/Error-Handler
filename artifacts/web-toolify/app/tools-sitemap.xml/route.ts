import { NextResponse } from 'next/server'
import { tools } from '@/lib/tools'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.toolifypdf.online'

const TODAY = new Date().toISOString().split('T')[0]

export async function GET() {
  const urls = tools.map((tool) => `
  <url>
    <loc>${BASE_URL}/${tool.slug}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${tool.popular ? '0.9' : '0.7'}</priority>
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
