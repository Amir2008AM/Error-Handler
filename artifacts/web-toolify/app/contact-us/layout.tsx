import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { absolute: 'Contact Us | Toolify' },
  description: 'Get in touch with the Toolify team. Send us a message for support, feedback, or partnership inquiries about our free online tools.',
  alternates: { canonical: 'https://toolifypdf.online/contact-us' },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Contact Us | Toolify',
    description: 'Get in touch with the Toolify team. Send us a message for support, feedback, or partnership inquiries about our free online tools.',
    url: 'https://toolifypdf.online/contact-us',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Contact Us | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact Us | Toolify',
    description: 'Get in touch with the Toolify team. Send us a message for support, feedback, or partnership inquiries about our free online tools.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
