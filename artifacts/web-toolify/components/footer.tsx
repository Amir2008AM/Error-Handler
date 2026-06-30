import Link from 'next/link'
import { Zap } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-foreground text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">

        {/* Top grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-x-6 gap-y-10">

          {/* Brand — full width on mobile/tablet, 1 col on desktop */}
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-white" fill="currentColor" />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                Toolify
              </span>
            </Link>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-3">
              Free online tools for everyone. No registration, no limits.
              Process files instantly in your browser.
            </p>
            <a href="https://startuups.com//projects/toolifypdf-9169" target="_blank" rel="noopener">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://startuups.com//images/badges/startuupscom.badge.svg" alt="Featured on startuups" width={150} height={54} />
            </a>
          </div>

          {/* PDF Tools */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-white/90 tracking-wide uppercase">
              PDF Tools
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Image to PDF', href: '/image-to-pdf' },
                { label: 'Merge PDF',    href: '/merge-pdf' },
                { label: 'Split PDF',    href: '/split-pdf' },
                { label: 'PDF to Word',  href: '/pdf-to-word' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Image Tools */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-white/90 tracking-wide uppercase">
              Image Tools
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Compress Image', href: '/compress-image' },
                { label: 'Resize Image',   href: '/resize-image' },
                { label: 'Convert Image',  href: '/convert-image' },
                { label: 'Crop Image',     href: '/crop-image' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-white/90 tracking-wide uppercase">
              Company
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us',   href: '/about' },
                { label: 'Contact Us', href: '/contact-us' },
                { label: 'Blog',       href: '/blog' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold mb-4 text-white/90 tracking-wide uppercase">
              Legal
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Privacy Policy',     href: '/privacy-policy' },
                { label: 'Terms & Conditions', href: '/terms-and-conditions' },
                { label: 'Cookies Policy',     href: '/cookies-policy' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 text-center">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} ToolifyPDF. All rights reserved.
          </p>
        </div>

      </div>
    </footer>
  )
}
