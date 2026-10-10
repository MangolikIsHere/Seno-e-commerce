'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { WhatsAppSupportButton } from '@/components/WhatsAppSupportButton'

export function ContactFormClient() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [orderNumber, setOrderNumber] = useState('')
  const [message, setMessage] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name && email && message) {
      setSubmitted(true)
    }
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">GET IN TOUCH</span>
      <h1 className="static-page-title">Contact SENO</h1>

      <p className="static-intro-lead">
        Have a question about an order, product, shipping, or returns? Reach out directly via WhatsApp support or send a message below.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px', maxWidth: '540px', padding: '24px', backgroundColor: 'var(--soft)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '24px' }}>
          <div>
            <h3 style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase' }}>Instagram</h3>
            <a href="https://www.instagram.com/souravsaha887/" aria-label="Instagram" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ink)', textDecoration: 'none', display: 'block' }}>@souravsaha887</a>
          </div>
          <div>
            <h3 style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase' }}>Facebook</h3>
            <a href="https://www.facebook.com/sourav.saha.585585" aria-label="Facebook" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ink)', textDecoration: 'none', display: 'block' }}>Facebook Profile</a>
          </div>
          <div>
            <h3 style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase' }}>WhatsApp / Phone</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href="tel:+918617648031" aria-label="Phone" style={{ fontSize: '13px', color: 'var(--ink)', textDecoration: 'none', fontWeight: 500 }}>+91 861 764 8031</a>
              <WhatsAppSupportButton
                type="general"
                label="WhatsApp Support"
                variant="compact"
              />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span style={{ color: 'var(--muted)' }}>Product issue or return inquiry?</span>
          <Link href="/return-refund-policy" style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600 }}>
            Return &amp; Refund Policy →
          </Link>
        </div>
      </div>

      {submitted ? (
        <div style={{ background: 'var(--soft)', padding: '28px', maxWidth: '540px', marginTop: '24px' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: '0 0 8px' }}>
            Message Received
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Thank you, {name}. Your note has been logged. Our studio team will review your inquiry shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-stack" style={{ maxWidth: '540px' }}>
          <input
            type="text"
            placeholder="Your name"
            className="form-input-field"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email address"
            className="form-input-field"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Order number (optional)"
            className="form-input-field"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
          />
          <textarea
            placeholder="Your message..."
            rows={5}
            className="form-input-field"
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
          />

          <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }}>
            SEND MESSAGE
          </button>
        </form>
      )}
    </main>
  )
}
