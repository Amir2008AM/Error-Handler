'use client'

import { useEffect, useRef } from 'react'
import { useCookieConsent } from '@/lib/cookie-consent-context'

const ADSTERRA_KEY = 'c1f178cc582ca4669b9965cded62a846'
const AD_WIDTH  = 300
const AD_HEIGHT = 250

type AdsterraBannerProps = {
  className?: string
}

export function AdsterraBanner({ className = '' }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const loaded = useRef(false)
  const { consent } = useCookieConsent()

  const isProd = process.env.NODE_ENV === 'production'
  const canShowAds = isProd && !!consent?.advertising

  useEffect(() => {
    if (!canShowAds || loaded.current || !containerRef.current) return
    loaded.current = true

    const optionsScript = document.createElement('script')
    optionsScript.type = 'text/javascript'
    optionsScript.text = `atOptions = {'key':'${ADSTERRA_KEY}','format':'iframe','height':${AD_HEIGHT},'width':${AD_WIDTH},'params':{}};`
    containerRef.current.appendChild(optionsScript)

    const invokeScript = document.createElement('script')
    invokeScript.type = 'text/javascript'
    invokeScript.src = `https://www.highperformanceformat.com/${ADSTERRA_KEY}/invoke.js`
    containerRef.current.appendChild(invokeScript)
  }, [canShowAds])

  if (!canShowAds) return null

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden flex justify-center ${className}`}
      style={{ minHeight: AD_HEIGHT, width: '100%' }}
    />
  )
}
