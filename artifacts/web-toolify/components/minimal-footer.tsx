'use client'

import { usePathname } from 'next/navigation'

export function MinimalFooter() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return (
    <footer className="w-full border-t border-border py-4 text-center text-sm text-muted-foreground">
      © 2026 ToolifyPDF. All Rights Reserved.
    </footer>
  )
}
