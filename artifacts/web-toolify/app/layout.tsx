import Script from 'next/script'
import type { Metadata, Viewport } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LoadingBarProvider } from '@/components/global-loading-bar'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
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
      <body className="font-sans antialiased">
        <Script
  src="https://www.googletagmanager.com/gtag/js?id=G-SVNB9EP5YP"
  strategy="afterInteractive"
/>

<Script id="ga" strategy="afterInteractive">
  {`
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-SVNB9EP5YP');
  `}
</Script>
        <LoadingBarProvider>
          {children}
        </LoadingBarProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
