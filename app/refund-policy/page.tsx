import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Details on the refund process, timelines, and payment source reversals for SENO orders.',
  alternates: {
    canonical: `${SITE_URL}/refund-policy`,
  },
}

export default function RefundPolicyPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">LEGAL</span>
      <h1 className="static-page-title">Refund Policy</h1>

      <p className="static-intro-lead">
        Our refund policy applies to returned items inspected and verified by our studio team.
      </p>

      <section className="static-section-block">
        <h2>REFUND PROCESSING</h2>
        <p>
          Once your return is received and inspected, approved refunds are credited back to your original payment method within 5–7 business days.
        </p>
      </section>
    </main>
  )
}
