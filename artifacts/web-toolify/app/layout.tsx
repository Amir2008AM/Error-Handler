import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { LoadingBarProvider } from '@/components/global-loading-bar'
import { I18nProvider } from '@/lib/i18n/context'
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
  metadataBase: new URL('https://toolify.app'),
  openGraph: {
    title: 'Toolify — All Tools in One Place',
    description: 'Free online tools for PDF, images, text, and more. No registration needed.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Toolify — All Tools in One Place',
    description: 'Free online tools for PDF, images, text, and more.',
  },
  robots: {
    index: true,
    follow: true,
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
    <html lang="en" className={`${inter.variable} ${plusJakarta.variable} bg-background`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans antialiased">
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4805747941246928"
              strategy="afterInteractive"
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
        <I18nProvider>
          <LoadingBarProvider>
            {children}
          </LoadingBarProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
