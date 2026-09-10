'use client'

import React, { useState } from 'react'

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('')
  const [contact, setContact] = useState('')
  const [searched, setSearched] = useState(false)

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault()
    if (orderNumber && contact) {
      setSearched(true)
    }
  }

  return (
    <main className="static-page-container">
      <span className="section-kicker">ORDER FULFILLMENT</span>
      <h1 className="static-page-title">Track Order</h1>

      <p className="static-intro-lead">
        Enter your order reference number and email or phone number to check current dispatch status.
      </p>

      {searched ? (
        <div style={{ background: 'var(--soft)', padding: '28px', maxWidth: '520px', marginTop: '24px' }}>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: '0 0 8px' }}>
            Tracking Order #{orderNumber}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
            Order tracking integration will connect to the logistics partner backend in a future phase.
          </p>
        </div>
      ) : (
        <form onSubmit={handleTrack} className="form-stack" style={{ maxWidth: '440px' }}>
          <input
            type="text"
            placeholder="ORDER NUMBER (e.g. SENO-10842)"
            className="form-input-field"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="EMAIL ADDRESS OR PHONE"
            className="form-input-field"
            value={contact}
            onChange={e => setContact(e.target.value)}
            required
          />

          <button type="submit" className="dark-btn" style={{ padding: '16px', fontSize: '10px', letterSpacing: '2px' }}>
            TRACK ORDER
          </button>
        </form>
      )}
    </main>
  )
}
