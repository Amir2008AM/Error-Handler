import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: { absolute: 'Cookies Policy | Toolify' },
  description: 'Cookies Policy for Toolify — learn how we use cookies and similar technologies to improve your experience on our platform.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/cookies-policy',
  },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'Cookies Policy | Toolify',
    description: 'Cookies Policy for Toolify — learn how we use cookies and similar technologies to improve your experience on our platform.',
    url: 'https://www.toolifypdf.online/cookies-policy',
    type: 'website',
    images: [{ url: 'https://www.toolifypdf.online/og-image.jpg', width: 1200, height: 630, alt: 'Cookies Policy | Toolify' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cookies Policy | Toolify',
    description: 'Cookies Policy for Toolify — learn how we use cookies and similar technologies to improve your experience on our platform.',
    images: ['https://www.toolifypdf.online/og-image.jpg'],
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

        {/* ── English ─────────────────────────────────────────────────── */}
        <h1 className="text-3xl font-bold mb-8">Cookies Policy</h1>

        <div className="space-y-8 mb-16">
          <section>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies to improve user experience.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Types of Cookies</h2>
            <ul className="list-disc text-muted-foreground space-y-2 ml-5">
              <li>Essential cookies for website functionality</li>
              <li>Session cookies to maintain usage</li>
              <li>Preference cookies to save settings</li>
              <li>Analytics cookies for usage statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may use Google Analytics to collect anonymous data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Management</h2>
            <p className="text-muted-foreground leading-relaxed">
              Users can disable cookies through browser settings, but some features may not work properly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">Disclaimer</h2>
            <ul className="list-disc text-muted-foreground space-y-2 ml-5">
              <li>The service is provided for general informational purposes only.</li>
              <li>We do not guarantee that results will be error-free or suitable for any specific purpose.</li>
              <li>We are not responsible for any direct or indirect damages resulting from the use of the website.</li>
            </ul>
          </section>
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="border-t border-border my-12" />

        {/* ── Arabic ───────────────────────────────────────────────────── */}
        <div dir="rtl">
          <h2 className="text-3xl font-bold mb-8">سياسة ملفات تعريف الارتباط (Cookies Policy)</h2>

          <div className="space-y-8">
            <section>
              <p className="text-muted-foreground leading-relaxed">
                نستخدم ملفات تعريف الارتباط (Cookies) لتحسين تجربة المستخدم.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">أنواع ملفات تعريف الارتباط</h2>
              <ul className="list-disc text-muted-foreground space-y-2 mr-5">
                <li>ملفات تعريف الارتباط الأساسية لضمان عمل الموقع</li>
                <li>ملفات تعريف ارتباط الجلسة للحفاظ على الاستخدام أثناء التصفح</li>
                <li>ملفات تعريف الارتباط التفضيلية لحفظ الإعدادات</li>
                <li>ملفات تعريف الارتباط التحليلية لجمع إحصائيات الاستخدام</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">التحليلات</h2>
              <p className="text-muted-foreground leading-relaxed">
                قد نستخدم Google Analytics لجمع بيانات مجهولة المصدر حول الاستخدام.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">إدارة ملفات تعريف الارتباط</h2>
              <p className="text-muted-foreground leading-relaxed">
                يمكن للمستخدمين تعطيل ملفات تعريف الارتباط من خلال إعدادات المتصفح، ولكن قد لا تعمل بعض الخصائص بشكل صحيح عند القيام بذلك.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">إخلاء المسؤولية</h2>
              <ul className="list-disc text-muted-foreground space-y-2 mr-5">
                <li>يتم تقديم الخدمة لأغراض معلوماتية عامة فقط.</li>
                <li>نحن لا نضمن أن تكون النتائج خالية من الأخطاء أو مناسبة لأي استخدام معين.</li>
                <li>كما أننا غير مسؤولين عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام الموقع.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </main>
  )
}
