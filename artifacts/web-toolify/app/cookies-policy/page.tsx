import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Cookies Policy — How ToolifyPDF Uses Cookies' },
  description: 'Cookies Policy for ToolifyPDF — learn how we use cookies and similar technologies to improve your experience on our platform.',
  alternates: {
    canonical: 'https://toolifypdf.online/cookies-policy',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Cookies Policy — How ToolifyPDF Uses Cookies',
    description: 'Cookies Policy for ToolifyPDF — learn how we use cookies and similar technologies to improve your experience on our platform.',
    url: 'https://toolifypdf.online/cookies-policy',
    type: 'website',
    images: [{ url: 'https://toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Cookies Policy — ToolifyPDF' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookies Policy — How ToolifyPDF Uses Cookies',
    description: 'Cookies Policy for ToolifyPDF — learn how we use cookies and similar technologies to improve your experience on our platform.',
    images: ['https://toolifypdf.online/og-image.jpg'],
  },
}

const faqs = [
  {
    question: 'What are cookies?',
    answer:
      'A cookie is a small text file that a website stores on your device — such as your computer, phone, or tablet — while you browse. It typically holds a small piece of data, like a session identifier or a saved preference, that the site can read back on later visits.',
  },
  {
    question: 'Why does ToolifyPDF use cookies?',
    answer:
      'ToolifyPDF uses cookies to keep the website working correctly (for example, maintaining session state while a page loads), to remember basic preferences, to measure aggregated site traffic through analytics, and to support the advertising that keeps our tools free.',
  },
  {
    question: 'Does ToolifyPDF use cookies for advertising?',
    answer:
      'Yes. Ads on ToolifyPDF are served through Google AdSense, and Google and its advertising partners may use cookies — including the DoubleClick cookie — to show ads based on prior visits to this or other websites.',
  },
  {
    question: 'How can I manage or disable cookies?',
    answer:
      'You can allow, block, or delete cookies at any time through your browser settings. To limit personalized advertising specifically, visit Google\'s Ads Settings at adssettings.google.com or the opt-out page at aboutads.info.',
  },
  {
    question: 'Will disabling cookies affect how ToolifyPDF works?',
    answer:
      'Disabling non-essential cookies should not prevent you from using ToolifyPDF\'s tools. However, blocking essential cookies may affect basic functionality, such as how a page maintains state while it loads.',
  },
  {
    question: 'How will I know if this Cookies Policy changes?',
    answer:
      'Any update to this Cookies Policy will be reflected by revising the "Last updated" date shown at the top of this page.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
}

const cookieTypes = [
  {
    type: 'Essential cookies',
    purpose: 'Required for core functionality, such as loading pages correctly and maintaining basic session state.',
  },
  {
    type: 'Preference cookies',
    purpose: 'Remember basic settings so your experience stays consistent across visits.',
  },
  {
    type: 'Analytics cookies',
    purpose: 'Help measure aggregated, anonymized traffic patterns so we can improve performance and usability.',
  },
  {
    type: 'Advertising cookies',
    purpose: 'Used by Google AdSense and its partners to deliver and measure ads.',
  },
]

export default function CookiesPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      {/* eslint-disable-next-line react/no-danger */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-1">Cookies Policy</h1>
        <p className="text-muted-foreground text-sm mb-8">Last updated: July 2026</p>

        <p className="text-muted-foreground leading-relaxed mb-10">
          A cookie is a small text file that a website stores on your device to remember information
          between visits. This Cookies Policy is the document that explains which cookies ToolifyPDF
          places on your device, why we use them, and how you can control them. ToolifyPDF uses cookies
          to keep the site working properly, remember basic preferences, measure aggregated traffic, and
          support the advertising that keeps our tools free to use.
        </p>

        <div className="space-y-8 mb-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files stored on your device when you visit a website. They help websites function properly, remember preferences, and understand how visitors use the site. ToolifyPDF uses cookies and similar technologies as described below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">2. Why Does ToolifyPDF Use Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              We rely on a small number of cookie categories, each serving a specific purpose:
            </p>
            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 font-semibold text-foreground">Cookie type</th>
                    <th className="px-4 py-3 font-semibold text-foreground">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieTypes.map((row, i) => (
                    <tr key={row.type} className={i % 2 === 1 ? 'bg-muted/20' : undefined}>
                      <td className="px-4 py-3 align-top font-medium text-foreground whitespace-nowrap">{row.type}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">{row.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How Does ToolifyPDF Use Analytics Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use Google Analytics to collect aggregated, anonymized statistics about site usage, such as pages visited and general traffic patterns. Google Analytics may set its own cookies to perform this measurement, in accordance with Google&apos;s privacy practices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. How Does ToolifyPDF Use Advertising Cookies (Google AdSense)?</h2>
            <p className="text-muted-foreground leading-relaxed">
              We display ads through Google AdSense to keep our tools free to use. Google and its advertising partners may use cookies, including the DoubleClick cookie, to serve ads based on your prior visits to this website or other websites on the internet.
            </p>
            <h3 className="text-base font-semibold text-foreground mt-4 mb-2">Opting Out of Personalized Ads</h3>
            <p className="text-muted-foreground leading-relaxed">
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
            <h2 className="text-xl font-semibold mb-3">5. How Can I Manage or Disable Cookies?</h2>
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

        <section className="mb-10 rounded-xl border border-border p-6 bg-card">
          <h2 className="text-lg font-semibold mb-3">Key Takeaways</h2>
          <ul className="list-disc text-muted-foreground space-y-2 ml-5 text-sm leading-relaxed">
            <li>Cookies are small text files ToolifyPDF stores on your device to support core functionality, preferences, analytics, and advertising.</li>
            <li>Essential cookies keep the site working; preference, analytics, and advertising cookies are supporting, non-essential categories.</li>
            <li>Google Analytics collects aggregated, anonymized traffic statistics, and Google AdSense may use cookies (including the DoubleClick cookie) to serve ads.</li>
            <li>You can allow, block, or delete cookies through your browser settings, and opt out of personalized ads via adssettings.google.com or aboutads.info.</li>
            <li>Disabling essential cookies may affect how parts of the site function.</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-5">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="border border-border rounded-xl p-5 bg-card">
                <h3 className="font-semibold mb-2 text-foreground">{faq.question}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="border-t border-border pt-6 mt-2">
          <p className="text-sm font-medium text-foreground mb-3">Explore our free tools:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/merge-pdf" className="hover:text-foreground transition-colors">Merge PDF</Link>
            <Link href="/compress-pdf" className="hover:text-foreground transition-colors">Compress PDF</Link>
            <Link href="/pdf-to-word" className="hover:text-foreground transition-colors">PDF to Word</Link>
            <Link href="/image-to-pdf" className="hover:text-foreground transition-colors">Image to PDF</Link>
            <Link href="/split-pdf" className="hover:text-foreground transition-colors">Split PDF</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
