'use client'

import { usePathname } from 'next/navigation'
import { AdBanner } from './ad-banner'

/** Pages that display ZERO ad slots */
const NO_AD_EXACT = new Set([
  '/',
  '/privacy-policy',
  '/terms-and-conditions',
  '/cookies-policy',
  '/disclaimer',
  '/about',
  '/contact-us',
  '/faq',
  '/editorial-guidelines',
  '/blog',
  '/ops',
])

const NO_AD_PREFIXES = ['/ops/', '/internal/', '/author/', '/category/']

function isNoAd(pathname: string): boolean {
  if (NO_AD_EXACT.has(pathname)) return true
  return NO_AD_PREFIXES.some(p => pathname.startsWith(p))
}

/** Blog article pages — any /blog/* path that is not the index */
function isBlogArticle(pathname: string): boolean {
  return pathname.startsWith('/blog/') && pathname.length > '/blog/'.length
}

export default function AdPlacements({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // No ads on policy, about, faq, blog index, ops, homepage, etc.
  if (isNoAd(pathname)) return <>{children}</>

  // Blog articles: one AdSense slot at top, one at bottom (2 total)
  if (isBlogArticle(pathname)) {
    return (
      <>
        <div className="mx-auto my-6 flex w-full max-w-4xl items-center justify-center overflow-hidden px-4">
          <AdBanner slot="6978025975" format="horizontal" fullWidth />
        </div>
        {children}
        <div className="mx-auto my-8 flex w-full max-w-4xl items-center justify-center overflow-hidden px-4">
          <AdBanner slot="6978025975" format="horizontal" fullWidth />
        </div>
      </>
    )
  }

  // Tool pages: one AdSense slot below the tool content
  return (
    <>
      {children}
      <div className="mx-auto my-6 flex w-full max-w-5xl items-center justify-center overflow-hidden px-4">
        <AdBanner slot="6978025975" format="horizontal" fullWidth />
      </div>
    </>
  )
}
