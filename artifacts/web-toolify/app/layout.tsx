import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { LoadingBarProvider } from '@/components/global-loading-bar'
import { I18nProvider } from '@/lib/i18n/context'
import DisconnectBeacon from '@/components/disconnect-beacon'
import HeartbeatBeacon from '@/components/heartbeat-beacon'
import { MinimalFooter } from '@/components/minimal-footer'
import { Navbar } from '@/components/navbar'
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
  preload: true,
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
  metadataBase: new URL('https://www.toolifypdf.online'),
  openGraph: {
    title: 'Toolify — All Tools in One Place',
    description: 'Free online tools for PDF, images, text, and more. No registration needed.',
    type: 'website',
    url: 'https://www.toolifypdf.online',
    images: [
      {
        url: 'https://www.toolifypdf.online/og-image.jpg',
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
    images: ['https://www.toolifypdf.online/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
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
        {/* JSON-LD — Website structured data for Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Toolify',
              url: 'https://www.toolifypdf.online',
              description: 'Free online tools for PDF, images, text, and conversions. No sign-up required.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://www.toolifypdf.online/?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {/* Critical CSS — applied immediately before any external stylesheet loads.
            Prevents the white flash that occurs while render-blocking CSS chunks download. */}
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box}
          html,body{margin:0;padding:0;background:#fefefe;min-height:100vh}
          body{font-family:system-ui,sans-serif;-webkit-font-smoothing:antialiased}
          /* Reserve navbar height so content doesn't jump on paint */
          body>div:first-of-type{display:flex;flex-direction:column;min-height:100vh}
        ` }} />
      </head>
      <body className="font-sans antialiased">
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4805747941246928"
              strategy="lazyOnload"
              crossOrigin="anonymous"
            />
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-SVNB9EP5YP"
              strategy="lazyOnload"
            />
            <Script id="ga" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-SVNB9EP5YP');
              `}
            </Script>
          </>
        )}
        <DisconnectBeacon />
        <HeartbeatBeacon />
        <I18nProvider>
          <LoadingBarProvider>
            <Navbar />
            {children}
            <MinimalFooter />
          </LoadingBarProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
