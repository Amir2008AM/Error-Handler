import { NextResponse } from 'next/server'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.toolifypdf.online'

const CATEGORY_SLUGS: Array<{ slug: string; lastModified: string }> = [
  { slug: 'pdf-tools',      lastModified: '2026-06-01' },
  { slug: 'security-tools', lastModified: '2026-06-01' },
  { slug: 'converters',     lastModified: '2026-06-01' },
  { slug: 'image-tools',    lastModified: '2026-06-01' },
  { slug: 'text-tools',     lastModified: '2026-06-01' },
  { slug: 'calculators',    lastModified: '2026-06-01' },
]

export async function GET() {
  const urls = CATEGORY_SLUGS.map(({ slug, lastModified }) => `
  <url>
    <loc>${BASE_URL}/category/${slug}</loc>
    <lastmod>${lastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
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
