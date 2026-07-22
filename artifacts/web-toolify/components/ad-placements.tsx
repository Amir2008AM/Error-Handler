'use client'

import { usePathname } from 'next/navigation'

const EXCLUDED_PATHS = new Set([
  '/',
  '/privacy-policy',
  '/terms-and-conditions',
  '/cookies-policy',
  '/disclaimer',
])

function AdSlot({ slotId }: { slotId: string }) {
  return (
    <div
      id={slotId}
      className="mx-auto my-6 flex min-h-[90px] w-full max-w-5xl items-center justify-center overflow-hidden"
      aria-label="Advertisement"
    />
  )
}

export default function AdPlacements({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (EXCLUDED_PATHS.has(pathname)) return <>{children}</>

  return (
    <>
      <AdSlot slotId="ad-slot-top" />
      {children}
      <AdSlot slotId="ad-slot-bottom" />
    </>
  )
}