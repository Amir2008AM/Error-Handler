/**
 * PartnerBadges — intentionally no 'use client'.
 * Renders badge links directly into the SSR HTML so every crawler,
 * badge verifier, and backlink validator sees them on first byte.
 *
 * HOW TO ADD A NEW BADGE:
 * Just add an object to the BADGES array below — no other changes needed.
 *
 * RULES:
 * - Never add rel="nofollow", rel="ugc", or rel="sponsored" to badge links.
 * - rel="noopener" is security-only and does NOT affect dofollow status.
 * - loading="eager" ensures verification bots always load the images.
 */

export const BADGES = [
  {
    href: 'https://startuups.com//projects/toolifypdf-9169',
    src:  'https://startuups.com//images/badges/startuupscom.badge.svg',
    alt:  'Featured on Startuups',
    rel:  'noopener' as const,
  },
  {
    href: 'https://saasgrow.app?ref=toolifypdf.online',
    src:  'https://saasgrow.app/api/badge?type=featured&style=dark',
    alt:  'Toolifypdf on SaaSGrow',
    rel:  'noopener' as const,
  },
  {
    href: 'https://submithunt.com',
    src:  'https://submithunt.com/badge-light.svg',
    alt:  'Featured on Submit Hunt',
    rel:  undefined, // no rel = dofollow ✓
  },
]

interface PartnerBadgesProps {
  width?: number
  height?: number
  className?: string
}

export function PartnerBadges({ width = 130, height = 46, className }: PartnerBadgesProps) {
  return (
    <div className={`flex flex-row flex-wrap items-center gap-3 ${className ?? ''}`}>
      {BADGES.map((badge) => (
        <a
          key={badge.href}
          href={badge.href}
          target="_blank"
          {...(badge.rel ? { rel: badge.rel } : {})}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={badge.src}
            alt={badge.alt}
            width={width}
            height={height}
            loading="eager"
            decoding="async"
          />
        </a>
      ))}
    </div>
  )
}
