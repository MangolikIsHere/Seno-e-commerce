'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { X, Video, ArrowRight, ExternalLink } from 'lucide-react'

export interface CheckoutPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
}

export function CheckoutPolicyModal({ isOpen, onClose, onContinue }: CheckoutPolicyModalProps) {
  const [acknowledged, setAcknowledged] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const continueButtonRef = useRef<HTMLButtonElement>(null)

  // Manage Escape key and focus
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleContinue = () => {
    if (!acknowledged) return
    try {
      sessionStorage.setItem('seno_checkout_policy_acknowledged', 'true')
    } catch {
      // Ignore storage restrictions
    }
    onContinue()
  }

  return (
    <div
      className="modal-backdrop checkout-policy-backdrop"
      onClick={onClose}
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(17, 18, 18, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-policy-title"
        className="checkout-policy-modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg, #fbfbfa)',
          border: '1px solid var(--border, #e2e1dc)',
          borderRadius: '3px',
          width: '100%',
          maxWidth: '440px',
          padding: '24px clamp(18px, 4vw, 28px)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.18)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <span
              style={{
                fontSize: '10px',
                letterSpacing: '1.8px',
                textTransform: 'uppercase',
                color: 'var(--muted, #676767)',
                fontWeight: 600,
                display: 'block',
                marginBottom: '4px'
              }}
            >
              A QUICK NOTE BEFORE YOU CHECK OUT
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--soft, #f1f1ef)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--ink, #171717)',
                  flexShrink: 0
                }}
              >
                <Video size={14} />
              </div>
              <h2
                id="checkout-policy-title"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '19px',
                  fontWeight: 400,
                  margin: 0,
                  color: 'var(--ink, #171717)'
                }}
              >
                Record your unboxing
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close note"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted, #676767)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px',
              minWidth: '32px',
              minHeight: '32px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Policy Body */}
        <div style={{ fontSize: '13px', color: 'var(--ink, #171717)', lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 10px', color: 'var(--muted, #676767)' }}>
            Please record a continuous video while opening your parcel. This helps us verify damaged, defective, incorrect, or missing products if you need to request a return or refund.
          </p>

          <Link
            href="/return-refund-policy"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--ink, #171717)',
              textDecoration: 'underline',
              letterSpacing: '0.3px'
            }}
          >
            <span>Read Return & Refund Policy</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Compact Acknowledgement Checkbox */}
        <div
          style={{
            background: 'var(--soft, #f1f1ef)',
            border: '1px solid var(--border, #e2e1dc)',
            borderRadius: '2px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}
        >
          <input
            type="checkbox"
            id="seno-checkout-policy-ack"
            checked={acknowledged}
            onChange={e => setAcknowledged(e.target.checked)}
            style={{
              marginTop: '3px',
              width: '16px',
              height: '16px',
              cursor: 'pointer',
              accentColor: 'var(--ink, #171717)'
            }}
          />
          <label
            htmlFor="seno-checkout-policy-ack"
            style={{
              fontSize: '12.5px',
              lineHeight: 1.45,
              color: 'var(--ink, #171717)',
              cursor: 'pointer',
              fontWeight: 500,
              userSelect: 'none'
            }}
          >
            I have read the Return &amp; Refund Policy.
          </label>
        </div>

        {/* Action button */}
        <button
          ref={continueButtonRef}
          type="button"
          disabled={!acknowledged}
          onClick={handleContinue}
          className="dark-btn"
          style={{
            width: '100%',
            padding: '14px 20px',
            fontSize: '11px',
            letterSpacing: '1.8px',
            opacity: acknowledged ? 1 : 0.45,
            cursor: acknowledged ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '4px'
          }}
        >
          <span>CONTINUE TO CHECKOUT</span>
          <ArrowRight size={13} />
        </button>

        <p
          style={{
            margin: 0,
            fontSize: '10.5px',
            color: 'var(--muted, #676767)',
            textAlign: 'center',
            lineHeight: 1.4
          }}
        >
          Subject to applicable statutory consumer protection laws.
        </p>
      </div>
    </div>
  )
}
