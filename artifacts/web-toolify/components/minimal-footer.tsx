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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://pinterest.com/toolifypdf"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow ToolifyPDF on Pinterest"
              className="text-foreground hover:opacity-70 transition-opacity"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/toolifypdf"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow ToolifyPDF on Instagram"
              className="hover:opacity-70 transition-opacity"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                <defs>
                  <radialGradient id="ig-grad-minimal" cx="30%" cy="107%" r="150%">
                    <stop offset="0%" stopColor="#fdf497"/>
                    <stop offset="5%" stopColor="#fdf497"/>
                    <stop offset="45%" stopColor="#fd5949"/>
                    <stop offset="60%" stopColor="#d6249f"/>
                    <stop offset="90%" stopColor="#285AEB"/>
                  </radialGradient>
                </defs>
                <path fill="url(#ig-grad-minimal)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
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
