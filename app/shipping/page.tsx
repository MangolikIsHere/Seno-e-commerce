import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Shipping Policy',
  description: 'Information regarding SENO shipping rates, fulfillment timelines, and delivery coverage across India.',
  alternates: {
    canonical: `${SITE_URL}/shipping`,
  },
}

export default function ShippingPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">STUDIO POLICIES</span>
      <h1 className="static-page-title">Shipping Policy</h1>

      <p className="static-intro-lead">
        We deliver orders across India. Orders are processed from our central studio within 24 to 48 hours of confirmation.
      </p>

      <section className="static-section-block">
        <h2>SHIPPING RATES & THRESHOLDS</h2>
        <p>
          • <strong>Free Shipping:</strong> Applied automatically on all orders over ₹1,999.<br />
          • <strong>Standard Shipping:</strong> Flat rate of ₹150 for orders below ₹1,999.
        </p>
      </section>

      <section className="static-section-block">
        <h2>DELIVERY TIMELINES</h2>
        <p>
          • Metro Cities: 2–3 business days.<br />
          • Rest of India: 3–5 business days.<br />
          Dispatch notifications with tracking details are sent via email and SMS once shipped.
        </p>
      </section>
    </main>
  )
}
