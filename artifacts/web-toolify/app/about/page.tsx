import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About Us | Toolify',
  description:
    'Learn about ToolifyPDF — a free online platform for PDF, image, and text tools. No account required.',
  alternates: {
    canonical: 'https://www.toolifypdf.online/about',
  },
  robots: { index: true, follow: true },
}

const features = [
  {
    icon: '🆓',
    title: 'Free and Accessible',
    body: 'Our tools are available online and can be used without creating an account.',
  },
  {
    icon: '🌐',
    title: 'Browser-Based Processing',
    body: 'Most tasks can be completed directly through your web browser without installing additional software.',
  },
  {
    icon: '🧰',
    title: 'Multiple Tools in One Place',
    body: 'Instead of using several different websites, users can access a wide range of document and image tools from a single platform.',
  },
  {
    icon: '✨',
    title: 'Simple User Experience',
    body: 'We focus on providing a clean and straightforward interface that works across desktop and mobile devices.',
  },
]

const tools = [
  'PDF merging and splitting',
  'PDF compression',
  'PDF conversion to and from popular formats',
  'Image to PDF and PDF to image conversion',
  'OCR text extraction from images',
  'Image optimization and editing tools',
  'Text utilities and calculators',
]

const features_ar = [
  {
    icon: '🆓',
    title: 'مجاني ومتاح للجميع',
    body: 'أدواتنا متاحة عبر الإنترنت ويمكن استخدامها دون إنشاء حساب.',
  },
  {
    icon: '🌐',
    title: 'معالجة عبر المتصفح',
    body: 'يمكن إنجاز معظم المهام مباشرة عبر متصفح الويب دون الحاجة إلى تثبيت أي برامج إضافية.',
  },
  {
    icon: '🧰',
    title: 'أدوات متعددة في مكان واحد',
    body: 'بدلاً من استخدام عدة مواقع مختلفة، يمكنك الوصول إلى مجموعة واسعة من أدوات المستندات والصور من منصة واحدة.',
  },
  {
    icon: '✨',
    title: 'تجربة مستخدم بسيطة',
    body: 'نركز على تقديم واجهة نظيفة وسهلة تعمل على أجهزة سطح المكتب والهواتف المحمولة.',
  },
]

const tools_ar = [
  'دمج وتقسيم ملفات PDF',
  'ضغط ملفات PDF',
  'تحويل PDF إلى صيغ شائعة والعكس',
  'تحويل الصور إلى PDF وتحويل PDF إلى صور',
  'استخراج النصوص من الصور عبر OCR',
  'أدوات تحسين الصور وتعديلها',
  'أدوات النصوص والحاسبات',
]

export default function AboutPage() {
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
        <h1 className="text-3xl font-bold mb-4">About ToolifyPDF</h1>
        <p className="text-muted-foreground leading-relaxed mb-10">
          Welcome to ToolifyPDF, a free online platform designed to make working with PDF
          documents, images, and text files simple and accessible for everyone.
          Our goal is to provide a collection of practical tools that help users complete
          everyday document tasks directly from their browser — without installing software
          or creating an account.
        </p>

        {/* Mission */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Our Mission</h2>
          <p className="text-muted-foreground leading-relaxed">
            We believe that document tools should be easy to access and simple to use.
            Our mission is to help students, professionals, businesses, and everyday users
            save time by providing reliable online tools that work across devices and platforms.
          </p>
        </section>

        {/* What We Offer */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">What We Offer</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            ToolifyPDF provides a growing collection of tools, including:
          </p>
          <ul className="list-disc text-muted-foreground space-y-1 ml-5">
            {tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            All tools are designed to be easy to use, allowing users to complete tasks in just a few steps.
          </p>
        </section>

        {/* Why Choose */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-5">Why Choose ToolifyPDF</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border p-5 bg-card">
                <div className="text-2xl mb-2">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Privacy and Security</h2>
          <p className="text-muted-foreground leading-relaxed">
            We understand the importance of privacy when working with personal or business
            documents. Uploaded files are processed only for the requested task and are
            automatically removed after a limited period. We do not require account
            registration to use our tools, and we strive to handle user data responsibly
            and securely. For more information, please review our{' '}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        {/* Commitment */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-3">Our Commitment</h2>
          <p className="text-muted-foreground leading-relaxed">
            We are committed to improving ToolifyPDF by expanding our collection of tools,
            enhancing performance, and providing a better experience for our users.
            User feedback helps us continue improving the platform and developing features
            that make document processing easier and more efficient.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-16 rounded-xl border border-border p-6 bg-card">
          <h2 className="text-xl font-semibold mb-2">Contact Us</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have questions, suggestions, or need assistance, please visit our{' '}
            <Link href="/contact-us" className="text-primary hover:underline">
              Contact Us
            </Link>{' '}
            page. We appreciate your feedback and thank you for using ToolifyPDF.
          </p>
        </section>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="border-t border-border my-12" />

        {/* ── Arabic ───────────────────────────────────────────────────── */}
        <div dir="rtl">
          <h2 className="text-3xl font-bold mb-4">عن ToolifyPDF</h2>
          <p className="text-muted-foreground leading-relaxed mb-10">
            مرحباً بك في ToolifyPDF، منصة مجانية عبر الإنترنت مصممة لجعل العمل مع
            مستندات PDF والصور وملفات النصوص أمراً سهلاً وفي متناول الجميع. هدفنا
            تقديم مجموعة من الأدوات العملية التي تساعد المستخدمين على إنجاز مهام
            المستندات اليومية مباشرة من متصفحاتهم — دون تثبيت برامج أو إنشاء حساب.
          </p>

          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-3">مهمتنا</h3>
            <p className="text-muted-foreground leading-relaxed">
              نؤمن بأن أدوات المستندات يجب أن تكون سهلة الوصول وبسيطة الاستخدام.
              مهمتنا مساعدة الطلاب والمهنيين والشركات والمستخدمين العاديين على
              توفير الوقت من خلال تقديم أدوات موثوقة عبر الإنترنت تعمل على مختلف
              الأجهزة والمنصات.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-3">ما نقدمه</h3>
            <p className="text-muted-foreground leading-relaxed mb-4">
              يوفر ToolifyPDF مجموعة متنامية من الأدوات، تشمل:
            </p>
            <ul className="list-disc text-muted-foreground space-y-1 mr-5">
              {tools_ar.map((tool) => (
                <li key={tool}>{tool}</li>
              ))}
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              صُمِّمت جميع الأدوات لتكون سهلة الاستخدام، مما يتيح للمستخدمين إنجاز
              المهام في بضع خطوات فقط.
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-5">لماذا تختار ToolifyPDF</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {features_ar.map((f) => (
                <div key={f.title} className="rounded-xl border border-border p-5 bg-card">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <h4 className="font-semibold mb-1">{f.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-3">الخصوصية والأمان</h3>
            <p className="text-muted-foreground leading-relaxed">
              ندرك أهمية الخصوصية عند التعامل مع المستندات الشخصية أو التجارية.
              تُعالَج الملفات المرفوعة فقط للمهمة المطلوبة وتُحذف تلقائياً بعد
              فترة محدودة. لا نطلب إنشاء حساب لاستخدام أدواتنا، ونسعى جاهدين
              للتعامل مع بيانات المستخدمين بمسؤولية وأمان. لمزيد من المعلومات،
              يرجى مراجعة{' '}
              <Link href="/privacy-policy" className="text-primary hover:underline">
                سياسة الخصوصية
              </Link>
              .
            </p>
          </section>

          <section className="mb-10">
            <h3 className="text-xl font-semibold mb-3">التزامنا</h3>
            <p className="text-muted-foreground leading-relaxed">
              نلتزم بتطوير ToolifyPDF من خلال توسيع مجموعة الأدوات وتحسين الأداء
              وتقديم تجربة أفضل لمستخدمينا. تساعدنا ملاحظات المستخدمين على
              الاستمرار في تحسين المنصة وتطوير ميزات تجعل معالجة المستندات
              أسهل وأكثر كفاءة.
            </p>
          </section>

          <section className="mb-10 rounded-xl border border-border p-6 bg-card">
            <h3 className="text-xl font-semibold mb-2">تواصل معنا</h3>
            <p className="text-muted-foreground leading-relaxed">
              إذا كان لديك أسئلة أو اقتراحات أو تحتاج إلى مساعدة، يرجى زيارة
              صفحة{' '}
              <Link href="/contact-us" className="text-primary hover:underline">
                تواصل معنا
              </Link>
              . نقدّر ملاحظاتك ونشكرك على استخدام ToolifyPDF.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
