'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LanguageSwitcher } from './language-switcher'
import { useI18n } from '@/lib/i18n/context'
import { useCookieConsent } from '@/lib/cookie-consent-context'

export function MinimalFooter() {
  const pathname = usePathname()
  const { t } = useI18n()
  const { openPreferences } = useCookieConsent()
  if (pathname === '/') return null
  return (
    <footer className="w-full border-t border-border py-5 text-sm text-muted-foreground">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-4">
        {/* Top row: copyright + X icon + legal links */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-y-2 gap-x-4">
          <div className="flex items-center gap-3 shrink-0">
            <span>{t('footer.copyright')}</span>
            <a
              href="https://x.com/Toolifypdf"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow ToolifyPDF on X (Twitter)"
              className="text-foreground hover:opacity-70 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
          <nav aria-label="Footer navigation" className="flex items-center flex-wrap justify-center gap-x-4 gap-y-2">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/contact-us" className="hover:text-foreground transition-colors">Contact</Link>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">{t('footer.privacy')}</Link>
            <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">{t('footer.terms')}</Link>
            <Link href="/cookies-policy" className="hover:text-foreground transition-colors">{t('footer.cookies')}</Link>
            <Link href="/disclaimer" className="hover:text-foreground transition-colors">{t('footer.disclaimer')}</Link>
            <Link href="/editorial-guidelines" className="hover:text-foreground transition-colors">Editorial Guidelines</Link>
            <button onClick={openPreferences} className="hover:text-foreground transition-colors">Cookie Preferences</button>
          </nav>
        </div>
        {/* Bottom row: language switcher */}
        <div className="flex justify-center">
          <LanguageSwitcher variant="footer" />
        </div>
      </div>
    </footer>
  )
}
