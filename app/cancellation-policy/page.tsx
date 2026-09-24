import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Cancellation Policy',
  description: 'Understand order cancellation rules and procedures at SENO prior to fulfillment.',
  alternates: {
    canonical: `${SITE_URL}/cancellation-policy`,
  },
}

export default function CancellationPolicyPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">LEGAL</span>
      <h1 className="static-page-title">Cancellation Policy</h1>

      <p className="static-intro-lead">
        Orders may be cancelled prior to dispatch. Once an order has entered dispatch, standard return procedures apply.
      </p>

      <section className="static-section-block">
        <h2>CANCELLATION WINDOW</h2>
        <p>
          To cancel an order, please contact our support team within 2 hours of placing the order with your order reference number.
        </p>
      </section>
    </main>
  )
}
