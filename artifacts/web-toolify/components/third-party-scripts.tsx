'use client'

import Script from 'next/script'
import { useCookieConsent } from '@/lib/cookie-consent-context'

export default function ThirdPartyScripts() {
  const { consent } = useCookieConsent()

  return (
    <>
      {consent?.advertising && (
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4805747941246928"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />
      )}
      {consent?.analytics && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-SVNB9EP5YP"
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-SVNB9EP5YP');
            `}
          </Script>
        </>
      )}
    </>
  )
}
