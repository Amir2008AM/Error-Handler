'use client'

import type { Metadata } from 'next'
import Link from 'next/link'
import { useState, useRef } from 'react'

export default function ContactUsPage() {
  const [email, setEmail]       = useState('')
  const [message, setMessage]   = useState('')
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const honeypotRef             = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (honeypotRef.current?.value) return

    const trimmedEmail   = email.trim()
    const trimmedMessage = message.trim()

    if (!trimmedEmail || !trimmedMessage) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: trimmedEmail, message: trimmedMessage }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Submission failed')
      }

      setStatus('success')
      setEmail('')
      setMessage('')
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <main className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-xl mx-auto">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block"
        >
          ← Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Have a question or need help? Fill out the form below and we&apos;ll get back to you as soon as possible.
        </p>

        {status === 'success' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center space-y-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-800 font-medium">
              Your message has been sent successfully. We will get back to you as soon as possible.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="text-sm text-green-700 underline underline-offset-2 hover:text-green-900 transition-colors"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Honeypot anti-spam */}
            <input
              ref={honeypotRef}
              type="text"
              name="_hp"
              aria-hidden="true"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading'}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="message" className="text-sm font-medium text-foreground">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="message"
                required
                rows={7}
                placeholder="Describe your issue or question..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={status === 'loading'}
                className="w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition resize-none disabled:opacity-50"
              />
            </div>

            {status === 'error' && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMsg || 'Something went wrong. Please try again.'}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading' || !email.trim() || !message.trim()}
              className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                'Send Message'
              )}
            </button>
          </form>
        )}

        <div className="border-t border-border pt-6 mt-8">
          <p className="text-sm font-medium text-foreground mb-3">Explore our free tools:</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="/merge-pdf" className="hover:text-foreground transition-colors">Merge PDF</a>
            <a href="/compress-pdf" className="hover:text-foreground transition-colors">Compress PDF</a>
            <a href="/pdf-to-word" className="hover:text-foreground transition-colors">PDF to Word</a>
            <a href="/image-to-pdf" className="hover:text-foreground transition-colors">Image to PDF</a>
            <a href="/split-pdf" className="hover:text-foreground transition-colors">Split PDF</a>
          </div>
        </div>
      </div>
    </main>
  )
}
