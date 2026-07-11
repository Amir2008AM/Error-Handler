import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { LoadingBarProvider } from '@/components/global-loading-bar'
import { I18nProvider } from '@/lib/i18n/context'
import { CookieConsentProvider } from '@/lib/cookie-consent-context'
import DisconnectBeacon from '@/components/disconnect-beacon'
import HeartbeatBeacon from '@/components/heartbeat-beacon'
import { MinimalFooter } from '@/components/minimal-footer'
import { Navbar } from '@/components/navbar'
import ThirdPartyScripts from '@/components/third-party-scripts'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import FeedbackWidget from '@/components/feedback-widget'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  preload: false,
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: {
    default: 'Toolify — All Tools in One Place',
    template: '%s | Toolify',
  },
  description:
    'Toolify is a free, fast multi-tools platform for PDF, images, text, and conversions. No sign-up required. Process files instantly online.',
  keywords: [
    'online tools',
    'pdf tools',
    'image tools',
    'compress image',
    'image to pdf',
    'merge pdf',
    'split pdf',
    'pdf to word',
    'free online tools',
    'ocr',
    'image to text',
  ],
  metadataBase: new URL('https://toolifypdf.online'),
  openGraph: {
    title: 'Toolify — Free Online PDF, Image & Document Tools',
    description: 'Free, fast online tools for PDF processing, image conversion, and document editing. No sign-up required.',
    type: 'website',
    images: [
      {
        url: 'https://toolifypdf.online/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Toolify — Free Online PDF & Image Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toolify — All Tools in One Place',
    description: 'Free online tools for PDF, images, text, and more.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  other: {
    'google-adsense-account': 'ca-pub-4805747941246928',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.png', type: 'image/png', sizes: '256x256' },
    ],
    apple: { url: '/apple-icon.png', type: 'image/png', sizes: '256x256' },
    shortcut: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b6ef5',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${plusJakarta.variable} bg-background`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://analytics.ahrefs.com/analytics.js" data-key="QJVgLKTTo6yseBMo0aT08w" async></script>
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Toolify',
              url: 'https://toolifypdf.online',
              description: 'Free online tools for PDF, images, text, and conversions. No sign-up required.',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://toolifypdf.online/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <CookieConsentProvider>
          {process.env.NODE_ENV === 'production' && <ThirdPartyScripts />}
          <DisconnectBeacon />
          <HeartbeatBeacon />
          <I18nProvider>
            <LoadingBarProvider>
              <Navbar />
              {children}
              <MinimalFooter />
              <FeedbackWidget />
            </LoadingBarProvider>
          </I18nProvider>
          <CookieConsentBanner />
        </CookieConsentProvider>
      </body>
    </html>
  )
}
