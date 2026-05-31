import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclaimer | Toolify',
  description: 'Disclaimer for Toolify — important information about the use of our free online tools.',
}

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Disclaimer</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. General Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              The information and tools provided by Toolify are for general use only. While we make every effort to ensure the accuracy and reliability of our tools, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, or suitability of the service for any particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. No Warranty</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toolify is provided &quot;as is&quot; and &quot;as available&quot; without any warranty of any kind. We do not warrant that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2 mt-3">
              <li>The service will be uninterrupted, timely, secure, or error-free</li>
              <li>The results obtained from using the tools will be accurate or reliable</li>
              <li>Any errors in the service will be corrected</li>
              <li>The tools will meet your specific requirements or expectations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, Toolify and its operators shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising from:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2 mt-3">
              <li>Your use of, or inability to use, the service</li>
              <li>Any loss or corruption of files or data during processing</li>
              <li>Errors or inaccuracies in processed output</li>
              <li>Unauthorised access to or alteration of your transmissions or data</li>
              <li>Any other matter relating to the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. File Processing Accuracy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our tools process files using open-source and industry-standard libraries. While we aim for high accuracy, results may vary depending on the complexity, format, or content of the files you upload. We strongly recommend reviewing all processed output before use in any critical or professional context.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. External Links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Toolify may contain links to external websites. These links are provided for convenience only. We have no control over the content of those sites and accept no responsibility for them or for any loss or damage that may arise from your use of them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Professional Advice</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nothing on Toolify constitutes legal, financial, medical, or professional advice of any kind. Always seek qualified professional advice for important decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Changes to This Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify this Disclaimer at any time. Updated versions will be posted on this page. Continued use of Toolify after changes constitutes your acceptance of the updated Disclaimer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Related Policies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Please also review our{' '}
              <Link href="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>,{' '}
              <Link href="/terms-and-conditions" className="text-primary hover:underline">Terms of Use</Link>, and{' '}
              <Link href="/cookies-policy" className="text-primary hover:underline">Cookies Policy</Link> for full details on how we operate.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
