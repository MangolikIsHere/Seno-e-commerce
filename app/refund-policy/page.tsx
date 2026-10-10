import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/seo'
import { WhatsAppSupportButton } from '@/components/WhatsAppSupportButton'

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Details on the refund process, unboxing verification, timelines, and payment source reversals for SENO orders.',
  alternates: {
    canonical: `${SITE_URL}/refund-policy`,
  },
}

export default function RefundPolicyPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">LEGAL &amp; POLICIES</span>
      <h1 className="static-page-title">Refund Policy</h1>

      <p className="static-intro-lead">
        Our refund policy applies to returned items inspected and verified by our studio team.
      </p>

      <section className="static-section-block">
        <h2>REFUND PROCESSING &amp; TIMELINES</h2>
        <p>
          Once your return is received and inspected, approved refunds are credited back to your original payment method within 5–7 business days.
        </p>
      </section>

      <section className="static-section-block">
        <h2>UNBOXING VIDEO VERIFICATION</h2>
        <p>
          To help us verify damaged, defective, incorrect, or missing items, please record a continuous video while opening your parcel. Claims covered by this policy may require an unboxing video for assessment, subject to applicable consumer protection laws and statutory rights.
        </p>
        <div style={{ marginTop: '12px' }}>
          <Link href="/return-refund-policy" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>
            Read Full Return &amp; Refund Policy Details →
          </Link>
        </div>
      </section>

      <section className="static-section-block">
        <h2>CONTACT FOR REFUND ASSISTANCE</h2>
        <p>
          If you have questions regarding a processed order, reverse pickup, or settlement timeline, reach out to our team:
        </p>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <WhatsAppSupportButton type="return_refund" label="WhatsApp Support" variant="primary" />
          <Link href="/contact" className="outline-btn" style={{ padding: '10px 20px', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>
            CONTACT FORM
          </Link>
        </div>
      </section>
    </main>
  )
}
