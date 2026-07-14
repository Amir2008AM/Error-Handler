/**
 * POST /api/indexnow
 * Re-submits all sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver…).
 * Call this after publishing new content or updating existing pages.
 *
 * Protected by a simple bearer token passed as Authorization header
 * so it's not callable by the public.
 */

import { NextResponse } from 'next/server'

const INDEX_NOW_KEY   = '224981d733b4d1e651c624ced1929de7'
const KEY_LOCATION    = `https://toolifypdf.online/${INDEX_NOW_KEY}.txt`
const BASE_URL        = 'https://toolifypdf.online'
const INDEXNOW_API    = 'https://api.indexnow.org/indexnow'

const ALL_URLS = [
  '/',
  '/blog',
  '/faq',
  '/about',
  '/contact-us',
  '/category/pdf-tools',
  '/category/security-tools',
  '/category/converters',
  '/category/image-tools',
  '/category/text-tools',
  '/category/calculators',
  '/pdf-editor',
  '/merge-pdf',
  '/split-pdf',
  '/compress-pdf',
  '/rotate-pdf',
  '/organize-pdf',
  '/page-numbers',
  '/watermark-pdf',
  '/repair-pdf',
  '/protect-pdf',
  '/unlock-pdf',
  '/pdf-to-word',
  '/word-to-pdf',
  '/pdf-to-excel',
  '/excel-to-pdf',
  '/pdf-to-ppt',
  '/ppt-to-pdf',
  '/pdf-to-jpg',
  '/image-to-pdf',
  '/html-to-pdf',
  '/compress-image',
  '/resize-image',
  '/crop-image',
  '/convert-image',
  '/word-counter',
  '/text-case',
  '/percentage-calculator',
  '/age-calculator',
  '/blog/merge-pdf-and-pdf-combine-files-for-free-online',
  '/blog/convert-pdf-to-jpg-easily-with-our-free-tool',
  '/blog/understanding-pdf-your-ultimate-guide-to-pdf-files',
  '/blog/convert-pdf-to-word-fast-and-free-online-tool',
  '/blog/how-to-compress-pdf-online',
  '/blog/how-to-convert-jpg-to-pdf',
  '/blog/how-to-lock-and-unlock-pdf',
  '/blog/how-to-convert-pdf-to-word',
  '/blog/how-to-convert-word-to-pdf',
  '/blog/how-to-split-pdf-online',
  '/blog/how-to-reduce-image-file-size',
  '/blog/pdf-vs-word-which-format-to-use',
  '/blog/how-to-watermark-pdf-documents',
  '/blog/how-to-convert-excel-to-pdf',
  '/blog/how-to-convert-powerpoint-to-pdf',
  '/blog/how-to-add-page-numbers-to-pdf',
  '/blog/how-to-protect-pdf-documents',
  '/blog/common-pdf-problems-and-solutions',
].map((path) => `${BASE_URL}${path}`)

export async function POST(req: Request) {
  // Simple auth guard — pass ?secret=<SESSION_SECRET> or Authorization: Bearer <token>
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (!process.env.SESSION_SECRET || secret !== process.env.SESSION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = {
    host: 'toolifypdf.online',
    key: INDEX_NOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: ALL_URLS,
  }

  const [apiRes, bingRes] = await Promise.allSettled([
    fetch(INDEXNOW_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    }),
    fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    }),
  ])

  return NextResponse.json({
    submitted: ALL_URLS.length,
    indexnow_org: apiRes.status === 'fulfilled' ? apiRes.value.status : 'error',
    bing:         bingRes.status === 'fulfilled' ? bingRes.value.status : 'error',
    timestamp:    new Date().toISOString(),
  })
}
