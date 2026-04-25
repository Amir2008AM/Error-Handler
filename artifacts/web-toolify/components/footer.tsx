import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-foreground text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Toolify
              </span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed">
              Free online tools for everyone. No registration, no limits. Process files instantly in your browser.
            </p>
          </div>

          {/* PDF Tools */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-white/90">PDF Tools</h3>
            <ul className="space-y-2">
              {[
                { label: 'Image to PDF', href: '/image-to-pdf' },
                { label: 'Merge PDF', href: '/merge-pdf' },
                { label: 'Split PDF', href: '/split-pdf' },
                { label: 'PDF to Word', href: '/pdf-to-word' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Image Tools */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-white/90">Image Tools</h3>
            <ul className="space-y-2">
              {[
                { label: 'Compress Image', href: '/compress-image' },
                { label: 'Resize Image', href: '/resize-image' },
                { label: 'Convert Image', href: '/convert-image' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Other Tools */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-white/90">Other Tools</h3>
            <ul className="space-y-2">
              {[
                { label: 'Word Counter', href: '/word-counter' },
                { label: 'Text Case Converter', href: '/text-case' },
                { label: 'Percentage Calculator', href: '/percentage-calculator' },
                { label: 'Age Calculator', href: '/age-calculator' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} Toolify. All rights reserved. Files are automatically deleted after processing.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-xs text-white/40 hover:text-white/80 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-xs text-white/40 hover:text-white/80 transition-colors">Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
