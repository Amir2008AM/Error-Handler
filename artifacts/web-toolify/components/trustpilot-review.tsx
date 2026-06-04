'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const TRUSTPILOT_URL = 'https://www.trustpilot.com/evaluate/www.toolifypdf.online'
const TP_GREEN = '#00B67A'

function TrustpilotStar({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="white"
      aria-hidden="true"
    >
      <path d="M12 2l2.9 8.9H23l-7.5 5.5 2.9 8.9L12 19.8l-6.4 5.5 2.9-8.9L1 10.9h8.1z" />
    </svg>
  )
}

export function TrustpilotReview() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (dismissed) return null

  return (
    <div
      style={{
        marginTop: '12px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
      }}
      aria-label="Trustpilot review invitation"
    >
      <div
        style={{
          borderRadius: '14px',
          border: `1px solid ${TP_GREEN}28`,
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf8 100%)',
          padding: '16px 18px',
          position: 'relative',
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss review invitation"
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
            padding: '2px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
        >
          <X size={15} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
              <div
                style={{
                  borderRadius: '8px',
                  backgroundColor: TP_GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '5px 10px',
                }}
              >
                <img
                  src="/logo-white.svg"
                  alt="ToolifyPDF"
                  style={{ height: '18px', width: 'auto', display: 'block' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '2px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '3px',
                    backgroundColor: TP_GREEN,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TrustpilotStar size={12} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontWeight: 600,
                fontSize: '13px',
                color: '#111827',
                margin: 0,
                lineHeight: 1.3,
              }}
            >
              Enjoyed using ToolifyPDF?
            </p>
            <p
              style={{
                fontSize: '11.5px',
                color: '#6b7280',
                margin: '3px 0 0',
                lineHeight: 1.4,
              }}
            >
              Share your experience and help others.
            </p>
            <a
              href={TRUSTPILOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '10px',
                padding: '6px 14px',
                borderRadius: '20px',
                backgroundColor: TP_GREEN,
                color: 'white',
                fontSize: '11.5px',
                fontWeight: 600,
                textDecoration: 'none',
                transition: 'transform 0.15s ease, opacity 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.04)'
                e.currentTarget.style.opacity = '0.92'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.opacity = '1'
              }}
            >
              <TrustpilotStar size={11} />
              Write a review
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
