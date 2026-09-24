import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions governing orders, customer service, and access to the SENO marketplace.',
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
}

export default function TermsPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">LEGAL</span>
      <h1 className="static-page-title">Terms of Service</h1>

      <p className="static-intro-lead">
        Welcome to SENO. By accessing our platform and placing orders, you agree to comply with the terms and conditions outlined below.
      </p>

      <section className="static-section-block">
        <h2>USE OF WEBSITE</h2>
        <p>
          All imagery, brand marks, and product copy are the property of SENO Studio. Reproduction without prior written consent is strictly prohibited.
        </p>
      </section>

      <section className="static-section-block">
        <h2>PRODUCT PRICING & AVAILABILITY</h2>
        <p>
          Prices and stock availability are subject to change without notice. SENO reserves the right to cancel orders in the event of pricing errors or inventory unavailability.
        </p>
      </section>
    </main>
  )
}
