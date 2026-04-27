/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pdf-parse', 'sharp', 'canvas', 'pdfjs-dist', 'tesseract.js'],
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', '*.kirk.replit.dev', '*.spock.replit.dev', '*.picard.replit.dev', '*.janeway.replit.dev', '*.riker.replit.dev', '*.worf.replit.dev', '*.sisko.replit.dev', '*.repl.co'],
  experimental: {
    // Allow large file uploads through the proxy layer (default is 10MB).
    // Per-route validation (lib/validation.ts) still enforces tool-specific caps.
    proxyClientMaxBodySize: '100mb',
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
