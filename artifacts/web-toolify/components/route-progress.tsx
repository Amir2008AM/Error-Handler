'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

export function RouteProgress() {
  const pathname = usePathname()
  const [width, setWidth]     = useState(0)
  const [visible, setVisible] = useState(false)
  const prevPathname = useRef(pathname)
  const timers = useRef<NodeJS.Timeout[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || href === pathname) return

      clearTimers()
      setVisible(true)
      setWidth(0)
      schedule(() => setWidth(25), 30)
      schedule(() => setWidth(55), 200)
      schedule(() => setWidth(75), 500)
      schedule(() => setWidth(85), 900)
    }

    document.addEventListener('click', handleClick)
    return () => {
      document.removeEventListener('click', handleClick)
      clearTimers()
    }
  }, [pathname])

  useEffect(() => {
    if (prevPathname.current === pathname) return
    prevPathname.current = pathname
    clearTimers()
    setWidth(100)
    schedule(() => {
      setVisible(false)
      setWidth(0)
    }, 350)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-primary shadow-[0_0_8px_theme(colors.primary/60%)] pointer-events-none"
      style={{
        width: `${width}%`,
        transition: width === 100 ? 'width 200ms ease-out' : 'width 400ms ease-out',
      }}
    />
  )
}
