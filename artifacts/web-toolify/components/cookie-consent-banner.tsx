'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCookieConsent } from '@/lib/cookie-consent-context'

export function CookieConsentBanner() {
  const { bannerVisible, consent, acceptAll, rejectNonEssential, savePreferences } = useCookieConsent()
  const [showCustomize, setShowCustomize] = useState(false)
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false)
  const [advertising, setAdvertising] = useState(consent?.advertising ?? false)

  if (!bannerVisible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="max-w-3xl mx-auto rounded-xl border border-border bg-background shadow-lg p-4 sm:p-5">
        {!showCustomize ? (
          <>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              We use cookies to run our site, understand usage, and show ads through Google AdSense. You can accept all cookies, reject non-essential ones, or customize your choices. See our{' '}
              <Link href="/cookies-policy" className="underline underline-offset-2 text-foreground">
                Cookies Policy
              </Link>{' '}
              for details.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={acceptAll}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Accept All
              </button>
              <button
                onClick={rejectNonEssential}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Reject Non-Essential
              </button>
              <button
                onClick={() => setShowCustomize(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Customize
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold mb-3">Manage Cookie Preferences</p>
            <div className="space-y-3 mb-4">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked disabled className="mt-1" />
                <span>
                  <span className="font-medium">Necessary</span>
                  <span className="block text-muted-foreground">Required for the site to function. Always on.</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Analytics</span>
                  <span className="block text-muted-foreground">Helps us understand how visitors use our tools (Google Analytics).</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={advertising}
                  onChange={(e) => setAdvertising(e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium">Advertising</span>
                  <span className="block text-muted-foreground">Used by Google AdSense to show and measure ads.</span>
                </span>
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => savePreferences({ analytics, advertising })}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Save Preferences
              </button>
              <button
                onClick={() => setShowCustomize(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
