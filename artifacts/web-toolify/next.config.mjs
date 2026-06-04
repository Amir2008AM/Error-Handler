/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  images: {
    unoptimized: true,
  },

  serverExternalPackages: [
    'pdf-parse', 'sharp', 'canvas',
    'pdfjs-dist', 'tesseract.js', 'franc', 'nanoid',
    'bullmq', 'ioredis',
  ],

  allowedDevOrigins: [
    '*.replit.dev', '*.replit.app',
    '*.kirk.replit.dev', '*.spock.replit.dev', '*.picard.replit.dev',
    '*.janeway.replit.dev', '*.riker.replit.dev', '*.worf.replit.dev',
    '*.sisko.replit.dev', '*.repl.co',
  ],

  experimental: {
    proxyClientMaxBodySize: '50mb',
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production'

    return [
      // In production Next.js chunk filenames include a content hash, so
      // immutable caching is safe.  In development Turbopack reuses the same
      // filenames across hot reloads, so immutable caching breaks HMR.
      ...(isProd
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
            {
              source: '/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
          ]
        : []),
      {
        source: '/(favicon.ico|icon.svg|apple-icon.png|manifest.json)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',         value: 'nosniff' },
          { key: 'X-XSS-Protection',               value: '1; mode=block' },
          { key: 'Referrer-Policy',                 value: 'strict-origin-when-cross-origin' },
          { key: 'Cross-Origin-Resource-Policy',    value: 'cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          ...(isProd
            ? [
                { key: 'X-Frame-Options',               value: 'SAMEORIGIN' },
                { key: 'Cross-Origin-Opener-Policy',     value: 'same-origin-allow-popups' },
                // credentialless allows cross-origin resources (AdSense, Google fonts)
                // without requiring them to set CORP headers
                { key: 'Cross-Origin-Embedder-Policy',  value: 'credentialless' },
              ]
            : []),
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig
