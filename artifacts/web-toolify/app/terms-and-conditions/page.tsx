import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Use | Toolify',
  description: 'Terms of Use for Toolify — the rules and guidelines for using our free online tools.',
}

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Terms of Use</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing and using Toolify (&quot;the Service&quot;), you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our tools.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toolify provides free, browser-based tools for processing PDF files, images, and documents. All tools are provided as-is, free of charge, without any guarantee of availability or suitability for a specific purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to use Toolify to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
              <li>Upload, process, or share any illegal, harmful, or offensive content</li>
              <li>Infringe upon the intellectual property rights of others</li>
              <li>Attempt to gain unauthorised access to our systems or infrastructure</li>
              <li>Use automated scripts or bots to abuse or overload our service</li>
              <li>Distribute malware, viruses, or any malicious code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. File Processing and Data</h2>
            <p className="text-muted-foreground leading-relaxed">
              Files uploaded to Toolify are processed solely for the purpose of providing the requested tool output. Uploaded files are automatically deleted from our servers within 20 minutes. You retain full ownership of any files you upload and any results you download.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Toolify name, logo, website design, and underlying software are the intellectual property of Toolify. You may not reproduce, distribute, or create derivative works without prior written permission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toolify is provided &quot;as is&quot; without any warranty. We are not liable for any loss of data, loss of profits, or any other damages arising from your use of the service. Please see our{' '}
              <Link href="/disclaimer" className="text-primary hover:underline">Disclaimer</Link> for full details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Service Availability</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to keep Toolify available at all times but cannot guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue any part of the service at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to update these Terms of Use at any time. Updated terms will be posted on this page with a revised date. Your continued use of Toolify after changes are posted constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Use shall be governed by and construed in accordance with applicable law. Any disputes shall be subject to the exclusive jurisdiction of the relevant courts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms of Use, please contact us via the details provided on our website.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
