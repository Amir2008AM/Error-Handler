import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Disclaimer | Toolify',
  description: 'Disclaimer for Toolify — important information about the use of our free online tools.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/disclaimer',
  },
  robots: { index: true, follow: true },
}

export default function DisclaimerPage() {
  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        {/* ── English ─────────────────────────────────────────────────── */}
        <h1 className="text-3xl font-bold mb-8">Disclaimer</h1>

        <div className="space-y-4 mb-16">
          <ul className="list-disc text-muted-foreground space-y-3 ml-5">
            <li className="leading-relaxed">The service is provided for general informational purposes only.</li>
            <li className="leading-relaxed">We do not guarantee that results will be error-free or suitable for any specific purpose.</li>
            <li className="leading-relaxed">We are not responsible for any direct or indirect damages resulting from the use of the website.</li>
          </ul>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="border-t border-border my-12" />

        {/* ── Arabic ───────────────────────────────────────────────────── */}
        <div dir="rtl">
          <h2 className="text-3xl font-bold mb-8">إخلاء المسؤولية</h2>

          <ul className="list-disc text-muted-foreground space-y-3 mr-5">
            <li className="leading-relaxed">يتم تقديم الخدمة لأغراض معلوماتية عامة فقط.</li>
            <li className="leading-relaxed">نحن لا نضمن أن تكون النتائج خالية من الأخطاء أو مناسبة لأي استخدام معين.</li>
            <li className="leading-relaxed">كما أننا غير مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الموقع.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
