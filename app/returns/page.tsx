import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/seo'
import { WhatsAppSupportButton } from '@/components/WhatsAppSupportButton'

export const metadata: Metadata = {
  title: 'Returns & Exchanges',
  description: 'Understand the return, replacement, unboxing verification, and exchange guidelines for SENO orders.',
  alternates: {
    canonical: `${SITE_URL}/returns`,
  },
}

export default function ReturnsPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">STUDIO POLICIES</span>
      <h1 className="static-page-title">Returns &amp; Exchanges</h1>

      <p className="static-intro-lead">
        We want you to be completely satisfied with your SENO garments. Returns and size exchanges are accepted within 7 days of delivery.
      </p>

      <section className="static-section-block">
        <h2>RETURN CONDITIONS</h2>
        <p>
          Garments must be unworn, unwashed, and in original condition with all SENO Studio tags and packaging intact.
        </p>
      </section>

      <section className="static-section-block">
        <h2>UNBOXING VERIFICATION FOR ISSUES</h2>
        <p>
          To help us verify damaged, defective, incorrect, or missing items, please record a continuous video while opening your parcel. Keep packaging and shipping labels visible. For claims covered by this verification policy, an unboxing video may be required to assess your request.
        </p>
        <div style={{ marginTop: '12px' }}>
          <Link href="/return-refund-policy" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', textDecoration: 'underline' }}>
            Read Full Return &amp; Refund Policy →
          </Link>
        </div>
      </section>

      <section className="static-section-block">
        <h2>EXCHANGE &amp; SUPPORT PROCESS</h2>
        <p>
          To initiate a return or size exchange, contact SENO support with your order number. Reverse pick-up will be arranged upon assessment.
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
