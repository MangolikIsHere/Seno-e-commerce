'use client'

import React, { useState } from 'react'

export default function ContactPage() {
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
        Have a question about an order, product, shipping, or anything else? Please contact us directly or send a message below.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', maxWidth: '520px', padding: '24px', backgroundColor: 'var(--soft)' }}>
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
            <h3 style={{ fontSize: '10px', letterSpacing: '1px', marginBottom: '6px', color: 'var(--muted)', textTransform: 'uppercase' }}>WhatsApp / Contact</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <a href="https://wa.me/918617648031" aria-label="WhatsApp" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: 'var(--ink)', textDecoration: 'none' }}>Message on WhatsApp</a>
              <a href="tel:+918617648031" aria-label="Phone" style={{ fontSize: '13px', color: 'var(--ink)', textDecoration: 'none' }}>+91 861 764 8031</a>
            </div>
          </div>
        </div>
      </div>

      {submitted ? (
        <div style={{ background: 'var(--soft)', padding: '28px', maxWidth: '520px', marginTop: '24px' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: '0 0 8px' }}>
            Message Received
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Thank you, {name}. Your note has been logged. Our studio team will review your inquiry shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="form-stack" style={{ maxWidth: '520px' }}>
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
