'use client'

import { usePathname } from 'next/navigation'
import { BannerAd } from './banner-ad'

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

function AdSlot({ slotId }: { slotId: string }) {
  return (
    <div
      id={slotId}
      className="mx-auto my-6 flex w-full max-w-5xl items-center justify-center overflow-hidden"
      aria-label="Advertisement"
    >
      <BannerAd />
    </div>
  )
}

export default function AdPlacements({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // No ads on policy, about, faq, blog index, ops, etc.
  if (isNoAd(pathname)) return <>{children}</>

  // Blog articles: top + bottom (2 slots)
  if (isBlogArticle(pathname)) {
    return (
      <>
        <AdSlot slotId="ad-slot-top" />
        {children}
        <AdSlot slotId="ad-slot-bottom" />
      </>
    )
  }

  // Tool pages: bottom only (1 slot)
  return (
    <>
      {children}
      <AdSlot slotId="ad-slot-bottom" />
    </>
  )
}
