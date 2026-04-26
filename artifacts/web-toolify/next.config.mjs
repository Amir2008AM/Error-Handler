/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['pdf-parse', 'sharp', 'canvas', 'pdfjs-dist', 'tesseract.js'],
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', '*.kirk.replit.dev', '*.spock.replit.dev', '*.picard.replit.dev', '*.janeway.replit.dev', '*.riker.replit.dev', '*.worf.replit.dev', '*.sisko.replit.dev', '*.repl.co'],
  experimental: {
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
