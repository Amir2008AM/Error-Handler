import { NextRequest, NextResponse } from 'next/server'

/**
 * EU / EEA countries that require GDPR cookie consent.
 * Includes all 27 EU member states + EEA (NO, IS, LI) + UK (UK GDPR).
 */
const EU_COUNTRY_CODES = new Set([
  // EU-27
  'AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI',
  'FR','GR','HR','HU','IE','IT','LT','LU','LV','MT',
  'NL','PL','PT','RO','SE','SI','SK',
  // EEA non-EU
  'NO','IS','LI',
  // UK (UK GDPR)
  'GB',
])

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  // Cloudflare sets CF-IPCountry; Railway / other proxies may use X-Country or similar.
  const country =
    req.headers.get('cf-ipcountry') ??
    req.headers.get('x-vercel-ip-country') ??
    req.headers.get('x-country') ??
    ''

  const isEU = country !== '' && EU_COUNTRY_CODES.has(country.toUpperCase())

  return NextResponse.json(
    { isEU, country: country.toUpperCase() || null },
    {
      headers: {
        // Cache briefly — per-user, not shared
        'Cache-Control': 'private, max-age=300',
        'Content-Type': 'application/json',
      },
    }
  )
}
