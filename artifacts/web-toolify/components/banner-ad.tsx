'use client'

import { useEffect, useRef } from 'react'

/**
 * Renders the highperformanceformat.com 300×250 banner ad.
 * The ad is loaded once per mount; unmounting cleans up the injected scripts.
 */
export function BannerAd() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Inject atOptions config
    const config = document.createElement('script')
    config.text = `
      atOptions = {
        'key'    : 'c1f178cc582ca4669b9965cded62a846',
        'format' : 'iframe',
        'height' : 250,
        'width'  : 300,
        'params' : {}
      };
    `
    container.appendChild(config)

    // Inject invoke script
    const invoke = document.createElement('script')
    invoke.src = 'https://www.highperformanceformat.com/c1f178cc582ca4669b9965cded62a846/invoke.js'
    invoke.async = true
    container.appendChild(invoke)

    return () => {
      // Clean up on unmount
      if (container.contains(config))  container.removeChild(config)
      if (container.contains(invoke)) container.removeChild(invoke)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center"
      style={{ width: 300, height: 250 }}
      aria-label="Advertisement"
    />
  )
}
