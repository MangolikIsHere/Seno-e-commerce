import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Understand how SENO collects, uses, and protects your personal information.',
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
}

export default function PrivacyPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">LEGAL</span>
      <h1 className="static-page-title">Privacy Policy</h1>

      <p className="static-intro-lead">
        This Privacy Policy outlines how SENO Studio collects, uses, and safeguards personal information provided when visiting or making a purchase from our website.
      </p>

      <section className="static-section-block">
        <h2>DATA COLLECTION & USAGE</h2>
        <p>
          We collect personal details essential for fulfilling orders, including name, shipping address, contact number, and email address. We do not store full payment card numbers.
        </p>
      </section>

      <section className="static-section-block">
        <h2>COOKIE PREFERENCES</h2>
        <p>
          Our website uses standard cookies to preserve active session details, cart selections, and analyze site navigation performance.
        </p>
      </section>
    </main>
  )
}
