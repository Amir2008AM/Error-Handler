/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },

  // Ensure heavy server-only packages are never bundled into the client
  serverExternalPackages: [
    'pdf-parse', 'sharp', 'canvas', 'pdfjs-dist',
    'tesseract.js', 'franc', 'nanoid',
    'child_process', 'fs', 'os', 'path',
  ],

  allowedDevOrigins: [
    '*.replit.dev', '*.replit.app',
    '*.kirk.replit.dev', '*.spock.replit.dev', '*.picard.replit.dev',
    '*.janeway.replit.dev', '*.riker.replit.dev', '*.worf.replit.dev',
    '*.sisko.replit.dev', '*.repl.co',
  ],

  experimental: {
    proxyClientMaxBodySize: '100mb',
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  async headers() {
    const isProd = process.env.NODE_ENV === 'production'

    return [
      // ── Long-lived cache for hashed Next.js static assets ────────────────
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // ── Long-lived cache for files in /public with content hashes ─────────
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // ── Short cache for icons / manifests ─────────────────────────────────
      {
        source: '/(favicon.ico|icon.svg|apple-icon.png|manifest.json)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // ── Security + performance headers for every route ────────────────────
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-XSS-Protection',        value: '1; mode=block' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // Clickjacking protection (XFO)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Prevent cross-origin leaks (COOP)
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          // HSTS — only meaningful in production where TLS is terminated
          ...(isProd
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]
            : []),
          // Permissive CSP that allows AdSense, GA, Google Fonts
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://partner.googleadservices.com https://tpc.googlesyndication.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://*.google.com https://*.googleapis.com https://*.gstatic.com https://pagead2.googlesyndication.com https://www.googletagmanager.com",
              "connect-src 'self' https://*.google-analytics.com https://pagead2.googlesyndication.com https://www.googletagmanager.com",
              "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

export default nextConfig
