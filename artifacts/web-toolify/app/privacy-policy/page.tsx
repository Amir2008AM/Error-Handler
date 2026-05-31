import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Toolify',
  description: 'Privacy Policy for Toolify — learn how we collect, use, and protect your information.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Toolify. We respect your privacy and are committed to protecting any information you share while using our free online tools. This Privacy Policy explains what data we collect, how we use it, and your rights regarding that data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Toolify is designed to process files entirely within your browser session or on our servers temporarily. We do not require account registration.
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
              <li><strong className="text-foreground">Uploaded files:</strong> Files you upload are processed on our servers and automatically deleted after your session ends (within 20 minutes). We do not store, read, or share your files.</li>
              <li><strong className="text-foreground">Usage data:</strong> We collect anonymous usage statistics (tool used, general location, browser type) to improve our services.</li>
              <li><strong className="text-foreground">Log data:</strong> Standard server logs including IP address, access times, and referring URLs may be retained for up to 30 days for security purposes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-2">
              <li>To provide and improve our file-processing tools</li>
              <li>To monitor performance, security, and reliability</li>
              <li>To understand how our tools are used (aggregated, anonymous data only)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. File Data and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              All files uploaded to Toolify are transmitted over HTTPS. Files are stored in temporary, isolated storage and are permanently deleted within 20 minutes of processing. We do not access, analyse, or share the contents of your files with any third party.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies to keep the service running and anonymous analytics cookies to understand how the site is used. You can learn more in our{' '}
              <Link href="/cookies-policy" className="text-primary hover:underline">Cookies Policy</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use third-party analytics services for aggregated traffic analysis. These services do not receive your uploaded files. Any third-party service we use is bound by their own privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Since we do not maintain user accounts or store personal files beyond your session, most data rights (access, deletion, portability) are satisfied automatically. If you have a concern about data we may hold, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date. Continued use of Toolify after changes constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please reach out via the contact information on our website.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
