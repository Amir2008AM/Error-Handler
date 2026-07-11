import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Cookies Policy | Toolify' },
  description: 'Cookies Policy for ToolifyPDF — learn how we use cookies and similar technologies to improve your experience on our platform.',
  alternates: {
    canonical: 'https://toolifypdf.online/cookies-policy',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Cookies Policy | Toolify',
    description: 'Cookies Policy for ToolifyPDF — learn how we use cookies and similar technologies to improve your experience on our platform.',
    url: 'https://toolifypdf.online/cookies-policy',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Cookies Policy | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookies Policy | Toolify',
    description: 'Cookies Policy for ToolifyPDF — learn how we use cookies and similar technologies to improve your experience on our platform.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

export default function CookiesPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Cookies Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 2026</p>

        <div className="space-y-8 mb-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. What Are Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help websites function properly, remember preferences, and understand how visitors use the site. ToolifyPDF uses cookies and similar technologies as described below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Types of Cookies We Use</h2>
            <ul className="list-disc text-muted-foreground space-y-2 ml-5">
              <li><span className="text-foreground font-medium">Essential cookies</span> — required for core website functionality, such as loading pages correctly and maintaining basic session state.</li>
              <li><span className="text-foreground font-medium">Preference cookies</span> — used to remember basic settings and improve your experience across visits.</li>
              <li><span className="text-foreground font-medium">Analytics cookies</span> — used to understand how visitors use our tools, so we can improve performance and usability.</li>
              <li><span className="text-foreground font-medium">Advertising cookies</span> — used by Google AdSense to deliver and measure advertising.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Google Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Google Analytics to collect aggregated, anonymized statistics about site usage, such as pages visited and general traffic patterns. Google Analytics may set its own cookies to perform this measurement, in accordance with Google&apos;s privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Advertising Cookies (Google AdSense)</h2>
            <p className="text-muted-foreground leading-relaxed">
              We display ads through Google AdSense to keep our tools free to use. Google and its advertising partners may use cookies, including the DoubleClick cookie, to serve ads based on your prior visits to this website or other websites on the internet.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-2">
              You can manage or opt out of personalized advertising by visiting Google&apos;s Ads Settings at{' '}
              <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
                adssettings.google.com
              </a>
              , or by visiting{' '}
              <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">
                aboutads.info
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              You can control or disable cookies at any time through your browser settings. Please note that disabling certain cookies, particularly essential cookies, may affect how parts of the website function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookies Policy from time to time to reflect changes in the cookies we use or for legal and regulatory reasons. Updates will be reflected by revising the &quot;Last updated&quot; date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about our use of cookies, please contact us at contact@toolifypdf.online or through our Contact page.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
