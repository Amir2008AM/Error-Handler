'use client'

import { useEffect, useRef } from 'react'

interface HomeAdBannerProps {
  width: number
  height: number
  label?: string
}

/**
 * Temporary ad banner for home-page testing.
 * Each instance gets its own isolated script pair so dimensions are respected.
 */
export function HomeAdBanner({ width, height, label }: HomeAdBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const config = document.createElement('script')
    config.text = `
      atOptions = {
        'key'    : 'c1f178cc582ca4669b9965cded62a846',
        'format' : 'iframe',
        'height' : ${height},
        'width'  : ${width},
        'params' : {}
      };
    `

    const invoke = document.createElement('script')
    invoke.src =
      'https://www.highperformanceformat.com/c1f178cc582ca4669b9965cded62a846/invoke.js'
    invoke.async = true

    container.appendChild(config)
    container.appendChild(invoke)

    return () => {
      try { container.removeChild(config) } catch {}
      try { container.removeChild(invoke) } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col items-center justify-center my-4 w-full">
      {label && (
        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">
          {label}
        </p>
      )}
      <div
        ref={containerRef}
        style={{ width, height, maxWidth: '100%' }}
        className="overflow-hidden flex items-center justify-center"
        aria-label="Advertisement"
      />
    </div>
  )
}
