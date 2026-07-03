'use client'

import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react'
import { usePathname } from 'next/navigation'

// ── helpers ───────────────────────────────────────────────────────────────────

function getDeviceInfo() {
  if (typeof navigator === 'undefined') return { browser: '', os: '', deviceType: 'Desktop' }

  const ua = navigator.userAgent

  let browser = 'Unknown'
  if (ua.includes('Edg/'))     browser = 'Edge'
  else if (ua.includes('OPR/')) browser = 'Opera'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/'))  browser = 'Safari'

  let os = 'Unknown'
  if (ua.includes('Windows NT'))    os = 'Windows'
  else if (ua.includes('Mac OS X')) os = 'macOS'
  else if (ua.includes('Android'))  os = 'Android'
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS'
  else if (ua.includes('Linux'))    os = 'Linux'

  const deviceType =
    /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      ? 'Mobile'
      : 'Desktop'

  return { browser, os, deviceType }
}

type FeedbackType = 'suggestion' | 'bug' | 'feature' | 'general'

const FEEDBACK_TYPES: { value: FeedbackType; label: string; emoji: string }[] = [
  { value: 'suggestion', label: 'Suggestion',      emoji: '💡' },
  { value: 'bug',        label: 'Bug Report',       emoji: '🐛' },
  { value: 'feature',    label: 'Feature Request',  emoji: '✨' },
  { value: 'general',    label: 'General Feedback', emoji: '💬' },
]

// ── component ─────────────────────────────────────────────────────────────────

export default function FeedbackWidget() {
  const pathname = usePathname()

  const [open,       setOpen]    = useState(false)
  const [type,       setType]    = useState<FeedbackType>('general')
  const [message,    setMessage] = useState('')
  const [email,      setEmail]   = useState('')
  const [status,     setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg,   setErrorMsg]= useState('')
  const [mounted,    setMounted] = useState(false)

  const modalRef    = useRef<HTMLDivElement>(null)
  const triggerRef  = useRef<HTMLButtonElement>(null)
  const firstInputRef = useRef<HTMLSelectElement>(null)

  // Lazy mount: widget appears 2 s after page load to avoid LCP impact
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 2000)
    return () => clearTimeout(t)
  }, [])

  // Focus trap + ESC close
  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab') return
      const modal = modalRef.current
      if (!modal) return
      const focusable = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button,select,textarea,input,[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute('disabled'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    // Auto-focus first field
    setTimeout(() => firstInputRef.current?.focus(), 50)
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const close = useCallback(() => {
    setOpen(false)
    setTimeout(() => triggerRef.current?.focus(), 50)
    // Reset form after close animation
    setTimeout(() => {
      setStatus('idle')
      setMessage('')
      setEmail('')
      setType('general')
      setErrorMsg('')
    }, 300)
  }, [])

  const submit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!message.trim()) { setErrorMsg('Please enter a message.'); return }
    if (message.trim().length < 5) { setErrorMsg('Message is too short.'); return }

    setStatus('loading')
    setErrorMsg('')

    const { browser, os, deviceType } = getDeviceInfo()

    const pageName = document.title?.replace(/ \|.*/, '').trim() ?? ''

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          email:   email.trim(),
          pageUrl: window.location.href,
          pageName,
          browser,
          os,
          deviceType,
          country:  '',          // server-side geo would override; omit for privacy
          language: navigator.language ?? '',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMsg(data?.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please check your connection and try again.')
    }
  }, [type, message, email, pathname])

  if (!mounted) return null

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────────────── */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(true)}
        aria-label="Open feedback form"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="feedback-widget-btn"
      >
        {/* Chat-bubble icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="feedback-widget-icon"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span className="feedback-widget-label">Feedback</span>
      </button>

      {/* ── Backdrop ────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="feedback-backdrop"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      <div
        ref={modalRef}
        role={open ? 'dialog' : undefined}
        aria-modal={open ? 'true' : undefined}
        aria-labelledby={open ? 'fb-dialog-title' : undefined}
        aria-describedby={open ? 'fb-dialog-desc' : undefined}
        aria-hidden={open ? undefined : 'true'}
        className={`feedback-modal ${open ? 'feedback-modal--open' : ''}`}
      >
        {/* Header */}
        <div className="feedback-modal-header">
          <div>
            <h2 id="fb-dialog-title" className="feedback-modal-title">
              Help us improve ToolifyPDF
            </h2>
            <p id="fb-dialog-desc" className="feedback-modal-desc">
              Your feedback helps us improve our tools and create a better experience for everyone.
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close feedback form"
            className="feedback-close-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="feedback-modal-body">
          {status === 'success' ? (
            /* ── Success state ─────────────────────────────────────── */
            <div className="feedback-success">
              <div className="feedback-success-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  width="40" height="40">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <h3 className="feedback-success-title">Thank you! 🎉</h3>
              <p className="feedback-success-msg">
                Thank you for helping improve ToolifyPDF!<br/>
                Your feedback has been received.
              </p>
              <button onClick={close} className="feedback-btn-primary">
                Done
              </button>
            </div>
          ) : (
            /* ── Form ──────────────────────────────────────────────── */
            <form onSubmit={submit} noValidate>
              {/* Feedback type */}
              <div className="feedback-field">
                <label htmlFor="fb-type" className="feedback-label">
                  Feedback Type
                </label>
                <select
                  id="fb-type"
                  ref={firstInputRef}
                  value={type}
                  onChange={(e) => setType(e.target.value as FeedbackType)}
                  className="feedback-select"
                  disabled={status === 'loading'}
                >
                  {FEEDBACK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.emoji}  {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="feedback-field">
                <label htmlFor="fb-message" className="feedback-label">
                  Message <span className="feedback-required" aria-label="required">*</span>
                </label>
                <textarea
                  id="fb-message"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setErrorMsg('') }}
                  placeholder="Describe your feedback, idea, or issue..."
                  rows={4}
                  maxLength={5000}
                  required
                  className={`feedback-textarea ${errorMsg ? 'feedback-textarea--error' : ''}`}
                  disabled={status === 'loading'}
                  aria-describedby={errorMsg ? 'fb-error' : undefined}
                />
                <div className="feedback-char-count">
                  {message.length} / 5000
                </div>
                {errorMsg && (
                  <p id="fb-error" role="alert" className="feedback-error-msg">
                    {errorMsg}
                  </p>
                )}
              </div>

              {/* Email (optional) */}
              <div className="feedback-field">
                <label htmlFor="fb-email" className="feedback-label">
                  Email <span className="feedback-optional">(optional)</span>
                </label>
                <input
                  id="fb-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="feedback-input"
                  disabled={status === 'loading'}
                  autoComplete="email"
                />
                <p className="feedback-hint">
                  Only if you want us to follow up with you.
                </p>
              </div>

              {/* Buttons */}
              <div className="feedback-actions">
                <button
                  type="button"
                  onClick={close}
                  className="feedback-btn-secondary"
                  disabled={status === 'loading'}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="feedback-btn-primary"
                  disabled={status === 'loading' || !message.trim()}
                  aria-busy={status === 'loading'}
                >
                  {status === 'loading' ? (
                    <>
                      <span className="feedback-spinner" aria-hidden="true" />
                      Sending…
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Scoped styles ───────────────────────────────────────────────── */}
      <style>{`
        /* Floating button */
        .feedback-widget-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9000;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px 10px 14px;
          background: linear-gradient(135deg, #3b6ef5 0%, #6366f1 100%);
          color: #fff;
          border: none;
          border-radius: 999px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(59,110,245,.35), 0 1px 4px rgba(0,0,0,.12);
          transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
          outline-offset: 3px;
        }
        .feedback-widget-btn:hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow: 0 8px 24px rgba(59,110,245,.45), 0 2px 8px rgba(0,0,0,.14);
        }
        .feedback-widget-btn:active {
          transform: translateY(0) scale(0.98);
        }
        .feedback-widget-icon { width: 17px; height: 17px; flex-shrink: 0; }
        @media (max-width: 480px) {
          .feedback-widget-btn { bottom: 16px; right: 16px; padding: 10px 14px; }
          .feedback-widget-label { display: none; }
          .feedback-widget-icon { width: 20px; height: 20px; }
        }

        /* Backdrop */
        .feedback-backdrop {
          position: fixed; inset: 0; z-index: 9001;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(3px);
          animation: fb-fade-in 200ms ease forwards;
        }
        @keyframes fb-fade-in { from { opacity: 0 } to { opacity: 1 } }

        /* Modal */
        .feedback-modal {
          position: fixed;
          bottom: 80px;
          right: 24px;
          z-index: 9002;
          width: 420px;
          max-width: calc(100vw - 32px);
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 20px 60px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08);
          opacity: 0;
          transform: translateY(16px) scale(.97);
          pointer-events: none;
          transition: opacity 220ms ease, transform 220ms ease;
        }
        .feedback-modal--open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        @media (max-width: 480px) {
          .feedback-modal { right: 0; left: 0; bottom: 0; width: 100%; max-width: 100%; border-radius: 18px 18px 0 0; max-height: 90vh; }
        }

        /* Header */
        .feedback-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 20px 0;
        }
        .feedback-modal-title {
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .feedback-modal-desc {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }
        .feedback-close-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px; height: 32px;
          border: none;
          background: #f3f4f6;
          border-radius: 8px;
          color: #6b7280;
          cursor: pointer;
          transition: background 150ms, color 150ms;
        }
        .feedback-close-btn:hover { background: #e5e7eb; color: #111827; }

        /* Body */
        .feedback-modal-body { padding: 16px 20px 20px; }

        /* Fields */
        .feedback-field { margin-bottom: 14px; }
        .feedback-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 5px;
        }
        .feedback-required { color: #ef4444; margin-left: 2px; }
        .feedback-optional { font-weight: 400; color: #9ca3af; margin-left: 4px; }
        .feedback-hint { font-size: 12px; color: #9ca3af; margin: 4px 0 0; }
        .feedback-char-count { font-size: 12px; color: #9ca3af; text-align: right; margin-top: 3px; }

        .feedback-select,
        .feedback-input,
        .feedback-textarea {
          width: 100%;
          padding: 9px 12px;
          font-size: 14px;
          font-family: inherit;
          color: #111827;
          background: #f9fafb;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
          box-sizing: border-box;
        }
        .feedback-select:focus,
        .feedback-input:focus,
        .feedback-textarea:focus {
          border-color: #3b6ef5;
          box-shadow: 0 0 0 3px rgba(59,110,245,.12);
          background: #fff;
        }
        .feedback-textarea { resize: vertical; min-height: 100px; }
        .feedback-textarea--error { border-color: #ef4444; }
        .feedback-textarea--error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,.12); }

        .feedback-error-msg {
          font-size: 13px;
          color: #ef4444;
          margin: 5px 0 0;
        }

        /* Buttons */
        .feedback-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }
        .feedback-btn-primary {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #3b6ef5 0%, #6366f1 100%);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: opacity 150ms, transform 150ms, box-shadow 150ms;
          box-shadow: 0 2px 8px rgba(59,110,245,.28);
        }
        .feedback-btn-primary:hover:not(:disabled) {
          opacity: .92;
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(59,110,245,.36);
        }
        .feedback-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .feedback-btn-primary:disabled { opacity: .6; cursor: not-allowed; }

        .feedback-btn-secondary {
          padding: 10px 18px;
          background: transparent;
          color: #6b7280;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          transition: border-color 150ms, color 150ms, background 150ms;
          white-space: nowrap;
        }
        .feedback-btn-secondary:hover:not(:disabled) {
          border-color: #d1d5db;
          background: #f9fafb;
          color: #374151;
        }
        .feedback-btn-secondary:disabled { opacity: .5; cursor: not-allowed; }

        /* Spinner */
        .feedback-spinner {
          width: 15px; height: 15px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: #fff;
          border-radius: 50%;
          animation: fb-spin .65s linear infinite;
          display: inline-block;
        }
        @keyframes fb-spin { to { transform: rotate(360deg) } }

        /* Success */
        .feedback-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 16px 0 4px;
          gap: 10px;
        }
        .feedback-success-icon {
          width: 72px; height: 72px;
          display: flex; align-items: center; justify-content: center;
          background: #f0fdf4;
          color: #22c55e;
          border-radius: 50%;
        }
        .feedback-success-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0; }
        .feedback-success-msg { font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6; }
        .feedback-success .feedback-btn-primary { width: 100%; margin-top: 8px; }

        /* Dark mode */
        @media (prefers-color-scheme: dark) {
          .feedback-modal {
            background: #1f2937;
            border-color: #374151;
            color: #f9fafb;
          }
          .feedback-modal-title { color: #f9fafb; }
          .feedback-modal-desc  { color: #9ca3af; }
          .feedback-close-btn { background: #374151; color: #9ca3af; }
          .feedback-close-btn:hover { background: #4b5563; color: #f9fafb; }
          .feedback-label { color: #d1d5db; }
          .feedback-select, .feedback-input, .feedback-textarea {
            background: #111827;
            border-color: #374151;
            color: #f9fafb;
          }
          .feedback-select:focus, .feedback-input:focus, .feedback-textarea:focus {
            border-color: #3b6ef5;
            background: #1f2937;
          }
          .feedback-btn-secondary { border-color: #374151; color: #9ca3af; }
          .feedback-btn-secondary:hover:not(:disabled) { border-color: #4b5563; background: #374151; color: #d1d5db; }
          .feedback-success-icon { background: #052e16; }
          .feedback-success-title { color: #f9fafb; }
        }
      `}</style>
    </>
  )
}
