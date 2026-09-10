import React from 'react'
import Link from 'next/link'

export default function ShippingReturnsPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">STUDIO POLICIES</span>
      <h1 className="static-page-title">Shipping & Returns</h1>

      <p className="static-intro-lead">
        Detailed information on standard shipping across India, delivery timelines, and our 7-day returns policy.
      </p>

      <div style={{ display: 'flex', gap: '20px', marginTop: '32px' }}>
        <Link href="/shipping" className="dark-btn" style={{ padding: '14px 24px' }}>
          VIEW SHIPPING POLICY
        </Link>
        <Link href="/returns" className="outline-btn" style={{ padding: '14px 24px' }}>
          VIEW RETURNS POLICY
        </Link>
      </div>
    </main>
  )
}
