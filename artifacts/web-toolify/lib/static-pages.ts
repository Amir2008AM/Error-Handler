export interface StaticPage {
  path: string
  lastModified: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

export const MAIN_PAGES: StaticPage[] = [
  { path: '/',           lastModified: new Date().toISOString().split('T')[0], changeFrequency: 'weekly',  priority: 1.0 },
  { path: '/blog',       lastModified: new Date().toISOString().split('T')[0], changeFrequency: 'weekly',  priority: 0.8 },
  { path: '/faq',        lastModified: '2026-06-01',                           changeFrequency: 'monthly', priority: 0.8 },
  { path: '/about',      lastModified: '2026-06-01',                           changeFrequency: 'yearly',  priority: 0.5 },
  { path: '/contact-us', lastModified: '2026-06-01',                           changeFrequency: 'yearly',  priority: 0.5 },
]

export const UTILITY_PAGES: StaticPage[] = [
  { path: '/age-calculator',        lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/percentage-calculator', lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/text-case',             lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.6 },
  { path: '/word-counter',          lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.6 },
]

export const LEGAL_PAGES: StaticPage[] = [
  { path: '/privacy-policy',       lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms-and-conditions', lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies-policy',       lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/disclaimer',           lastModified: '2026-06-01', changeFrequency: 'yearly', priority: 0.3 },
]

// UTILITY_PAGES (age-calculator, percentage-calculator, text-case, word-counter)
// are registered in the tools registry and already appear in tools-sitemap.xml.
// Excluding them here prevents duplicate URLs across pages-sitemap.xml and tools-sitemap.xml.
export const ALL_STATIC_PAGES: StaticPage[] = [
  ...MAIN_PAGES,
  ...LEGAL_PAGES,
]
