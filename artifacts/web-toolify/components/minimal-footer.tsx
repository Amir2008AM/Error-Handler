'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MinimalFooter() {
  const pathname = usePathname()
  if (pathname === '/') return null
  return (
    <footer className="w-full border-t border-border py-5 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-y-2 gap-x-4">
        <span className="shrink-0">© 2026 ToolifyPDF. All Rights Reserved.</span>
        <nav aria-label="Footer navigation" className="flex items-center flex-wrap justify-center gap-x-4 gap-y-2">
          <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">Terms of Use</Link>
          <Link href="/cookies-policy" className="hover:text-foreground transition-colors">Cookies Policy</Link>
          <Link href="/disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link>
        </nav>
      </div>
    </footer>
  )
}
