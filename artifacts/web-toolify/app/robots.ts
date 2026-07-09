import { MetadataRoute } from 'next'

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://www.toolifypdf.online'
    : 'http://localhost:5000')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // ── General crawlers ──────────────────────────────────────────────────
      {
        userAgent: '*',
        allow: [
          '/',
          '/category/',
        ],
        disallow: [
          '/api/',
          '/_next/',
          '/ops',
          '/dev-ops',
          '/internal/',
        ],
      },
      // ── Google ────────────────────────────────────────────────────────────
      { userAgent: 'AdsBot-Google',       allow: '/' },
      { userAgent: 'Mediapartners-Google', allow: '/' },
      // ── OpenAI ────────────────────────────────────────────────────────────
      { userAgent: 'GPTBot',              allow: '/' },
      { userAgent: 'ChatGPT-User',        allow: '/' },
      { userAgent: 'OAI-SearchBot',       allow: '/' },
      // ── Anthropic / Claude ────────────────────────────────────────────────
      { userAgent: 'ClaudeBot',           allow: '/' },
      { userAgent: 'Claude-Web',          allow: '/' },
      { userAgent: 'anthropic-ai',        allow: '/' },
      // ── Google AI ────────────────────────────────────────────────────────
      { userAgent: 'Google-Extended',     allow: '/' },
      { userAgent: 'GoogleOther',         allow: '/' },
      // ── Apple ─────────────────────────────────────────────────────────────
      { userAgent: 'Applebot',            allow: '/' },
      { userAgent: 'Applebot-Extended',   allow: '/' },
      // ── Perplexity ────────────────────────────────────────────────────────
      { userAgent: 'PerplexityBot',       allow: '/' },
      // ── Meta ──────────────────────────────────────────────────────────────
      { userAgent: 'Meta-ExternalAgent',  allow: '/' },
      { userAgent: 'Meta-ExternalFetcher', allow: '/' },
      // ── Amazon ────────────────────────────────────────────────────────────
      { userAgent: 'Amazonbot',           allow: '/' },
      // ── Cohere ───────────────────────────────────────────────────────────
      { userAgent: 'cohere-ai',           allow: '/' },
      // ── Mistral ───────────────────────────────────────────────────────────
      { userAgent: 'MistralAI-User',      allow: '/' },
      // ── You.com ───────────────────────────────────────────────────────────
      { userAgent: 'YouBot',              allow: '/' },
      // ── DuckDuckGo ────────────────────────────────────────────────────────
      { userAgent: 'DuckAssistBot',       allow: '/' },
      // ── Diffbot ───────────────────────────────────────────────────────────
      { userAgent: 'Diffbot',             allow: '/' },
      // ── ByteDance ────────────────────────────────────────────────────────
      { userAgent: 'Bytespider',          allow: '/' },
      // ── Common Crawl ──────────────────────────────────────────────────────
      { userAgent: 'CCBot',               allow: '/' },
    ],
    // Both sitemaps declared so crawlers discover all 62 URLs regardless of
    // which path they follow: the flat combined file or the indexed sub-sitemaps.
    sitemap: [
      `${BASE_URL}/sitemap_index.xml`,
      `${BASE_URL}/sitemap.xml`,
    ],
    host: BASE_URL,
  }
}
