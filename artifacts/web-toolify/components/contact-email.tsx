'use client'

import { useEffect, useState } from 'react'

/**
 * Renders the support email address without ever printing a literal
 * "user@domain" string into the server-rendered HTML.
 *
 * Why: Cloudflare's "Email Address Obfuscation" rewrites any email found in the
 * HTML into a link pointing at /cdn-cgi/l/email-protection. That URL returns 404
 * for crawlers, which SEO audits report as a broken internal link on every page
 * that shows our address. Assembling the address on the client keeps it visible
 * and clickable for humans while leaving nothing for the rewriter to touch.
 */

const LOCAL_PART = 'contact'
const DOMAIN = 'toolifypdf.online'

export function ContactEmail({ className }: { className?: string }) {
  const [address, setAddress] = useState<string | null>(null)

  useEffect(() => {
    setAddress(`${LOCAL_PART}@${DOMAIN}`)
  }, [])

  // Pre-hydration / no-JS fallback: readable, but contains no email pattern.
  if (!address) {
    return (
      <span className={className}>
        {LOCAL_PART} [at] {DOMAIN}
      </span>
    )
  }

  return (
    <a href={`mailto:${address}`} className={className}>
      {address}
    </a>
  )
}
