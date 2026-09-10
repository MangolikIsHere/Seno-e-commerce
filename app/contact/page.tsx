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
        For general inquiries, order support, or styling advice, please send us a message below.
      </p>

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
