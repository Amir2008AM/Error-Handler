'use client'

import { useEffect, useRef } from 'react'

type AdBannerProps = {
  slot: string
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical'
  className?: string
  fullWidth?: boolean
}

declare global {
  interface Window {
    adsbygoogle: unknown[]
  }
}

export function AdBanner({
  slot,
  format = 'auto',
  className = '',
  fullWidth = true,
}: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  // Only run AdSense in production — avoids 400 errors in dev/preview
  const isProd = process.env.NODE_ENV === 'production'

  useEffect(() => {
    if (!isProd || pushed.current) return
    try {
      const adsByGoogle = (window.adsbygoogle = window.adsbygoogle || [])
      adsByGoogle.push({})
      pushed.current = true
    } catch {}
  }, [isProd])

  if (!isProd) return null

  return (
    <div className={`overflow-hidden ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4805747941246928"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidth ? 'true' : 'false'}
      />
    </div>
  )
}
