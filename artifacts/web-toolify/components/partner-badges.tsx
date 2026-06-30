/**
 * PartnerBadges — pure server component (no 'use client').
 * Renders badge links directly into the SSR HTML so every crawler,
 * badge verifier, and backlink validator sees them on first byte.
 *
 * HOW TO ADD A NEW BADGE:
 * Just add an object to the BADGES array below — no other changes needed.
 */

const BADGES = [
  {
    href: 'https://startuups.com//projects/toolifypdf-9169',
    src:  'https://startuups.com//images/badges/startuupscom.badge.svg',
    alt:  'Featured on startuups',
    rel:  'noopener',
  },
  {
    href: 'https://saasgrow.app?ref=toolifypdf.online',
    src:  'https://saasgrow.app/api/badge?type=featured&style=dark',
    alt:  'Toolifypdf on SaaSGrow',
    rel:  'noopener',
  },
  {
    href: 'https://submithunt.com',
    src:  'https://submithunt.com/badge-light.svg',
    alt:  'Featured on Submit Hunt',
    rel:  undefined, // intentionally no rel — keeps link do-follow
  },
] as const

export function PartnerBadges() {
  return (
    <div className="flex flex-row flex-wrap items-center gap-3">
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
            width={130}
            height={46}
            loading="lazy"
          />
        </a>
      ))}
    </div>
  )
}
