import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookies Policy | Toolify',
  description: 'Cookies Policy for Toolify — learn how we use cookies and similar technologies.',
}

export default function CookiesPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Cookies Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. What Are Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies are small text files placed on your device when you visit a website. They help websites remember your preferences and understand how you interact with the site. Cookies are widely used to make websites work efficiently.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How Toolify Uses Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toolify uses a minimal number of cookies to ensure the service functions correctly and to understand how our tools are used. We do not use cookies for advertising or to track you across other websites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Types of Cookies We Use</h2>
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-1">Essential Cookies</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  These cookies are required for the website to function. They enable core features such as file upload sessions, security, and basic page navigation. You cannot opt out of these cookies.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-1">Analytics Cookies</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  We use anonymous analytics cookies to understand which tools are most popular and how visitors navigate the site. All data is aggregated and cannot be used to identify you personally.
                </p>
              </div>
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold mb-1">Preference Cookies</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  These cookies remember your preferences, such as your selected language, so you do not have to reconfigure settings each visit.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Third-Party Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some of our pages may include content or analytics from third-party providers. These providers may set their own cookies in accordance with their privacy policies. Toolify does not control third-party cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Managing Cookies</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You can control and delete cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
              <li>View what cookies are stored and delete them individually</li>
              <li>Block third-party cookies</li>
              <li>Block cookies from specific websites</li>
              <li>Block all cookies from being set</li>
              <li>Delete all cookies when you close your browser</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Please note that disabling essential cookies may prevent some features of Toolify from working correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Updates to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Cookies Policy to reflect changes in our practices or for operational, legal, or regulatory reasons. Please revisit this page periodically to stay informed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. More Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              For more information about how we handle your data, please read our{' '}
              <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>.
              If you have questions about our use of cookies, please contact us via our website.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
