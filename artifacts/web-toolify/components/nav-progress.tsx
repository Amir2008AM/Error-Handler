'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function NavProgress() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const prevPathname = useRef(pathname)
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (tickRef.current) clearTimeout(tickRef.current)
    if (doneRef.current) clearTimeout(doneRef.current)
  }

  const start = () => {
    clear()
    setVisible(true)
    setWidth(20)
    tickRef.current = setTimeout(() => setWidth(50), 250)
    tickRef.current = setTimeout(() => setWidth(70), 700)
    tickRef.current = setTimeout(() => setWidth(85), 1400)
  }

  const finish = () => {
    clear()
    setWidth(100)
    doneRef.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 350)
  }

  // Detect navigation completion
  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      finish()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Detect navigation start via click on any internal <a>
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') ?? ''
      // Internal links only, skip anchors and external
      if (!href.startsWith('/') && !href.startsWith(window.location.origin)) return
      if (href === pathname) return
      start()
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => () => clear(), [])

  if (!visible) return null

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      style={{ background: 'transparent' }}
    >
      <div
        className="h-full bg-primary transition-[width] ease-out"
        style={{
          width: `${width}%`,
          transitionDuration: width === 100 ? '200ms' : '600ms',
          boxShadow: '0 0 8px var(--color-primary)',
        }}
      />
    </div>
  )
}
