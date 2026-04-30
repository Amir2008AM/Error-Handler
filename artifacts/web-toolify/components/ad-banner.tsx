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

  useEffect(() => {
    if (pushed.current) return
    try {
      const adsByGoogle = (window.adsbygoogle = window.adsbygoogle || [])
      adsByGoogle.push({})
      pushed.current = true
    } catch {}
  }, [])

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
