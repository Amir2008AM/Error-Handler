import { NextRequest, NextResponse } from 'next/server'
import { screenshotUrl } from '@/lib/processing/puppeteer-pdf'

export const runtime = 'nodejs'
export const maxDuration = 45

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'Only http/https URLs supported' }, { status: 400 })
  }

  try {
    const screenshot = await screenshotUrl(url)
    return new NextResponse(screenshot, {
      headers: {
        'Content-Type':  'image/jpeg',
        'Cache-Control': 'public, max-age=120',
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Screenshot failed'
    console.error('[html-to-pdf/screenshot]', error)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
