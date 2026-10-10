import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Video, CheckCircle, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react'
import { SITE_URL } from '@/lib/seo'
import { WhatsAppSupportButton } from '@/components/WhatsAppSupportButton'
import { SENO_WHATSAPP_NUMBER } from '@/lib/whatsapp'

export const metadata: Metadata = {
  title: 'Return & Refund Policy',
  description: 'Comprehensive guidelines on SENO return requests, refund timelines, unboxing video verification, and customer support.',
  alternates: {
    canonical: `${SITE_URL}/return-refund-policy`,
  },
}

export default function ReturnRefundPolicyPage() {
  return (
    <main className="static-page-container">
      <Link href="/collections/all" className="breadcrumb-back-link" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
        <ArrowLeft size={13} /> BACK TO STORE
      </Link>

      <span className="section-kicker">STUDIO POLICIES &amp; VERIFICATION</span>
      <h1 className="static-page-title">Return &amp; Refund Policy</h1>

      <p className="static-intro-lead">
        We want you to be completely satisfied with your SENO wardrobe pieces. This policy outlines our inspection standards, return eligibility, unboxing video verification, and resolution timelines.
      </p>

      {/* Primary Verification Callout Box */}
      <section
        className="static-section-block"
        style={{
          background: 'var(--soft, #f1f1ef)',
          border: '1px solid var(--border, #e2e1dc)',
          padding: 'clamp(20px, 4vw, 32px)',
          borderRadius: '3px',
          margin: '28px 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--ink, #171717)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Video size={16} />
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, color: 'var(--ink, #171717)' }}>
            PLEASE RECORD YOUR UNBOXING
          </h2>
        </div>

        <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--ink, #171717)', margin: '0 0 14px' }}>
          To help us verify damaged, defective, incorrect, or missing items, please record a continuous video while opening your parcel. Keep the packaging, shipping label, and product visible wherever possible.
        </p>

        <p style={{ fontSize: '13.5px', lineHeight: 1.6, color: 'var(--muted, #676767)', margin: '0 0 16px' }}>
          For claims covered by this verification policy, an unboxing video may be required to assess your return or refund request. Please contact SENO support if you experience an issue.
        </p>

        <div style={{ fontSize: '12px', color: 'var(--muted, #676767)', borderTop: '1px solid var(--border, #e2e1dc)', paddingTop: '12px', lineHeight: 1.5 }}>
          <em>Note:</em> Claims may be declined if the required evidence is missing or insufficient, <strong>subject to applicable consumer protection laws and statutory rights</strong>. All legitimate claims are evaluated individually by our concierge team.
        </div>
      </section>

      {/* 1. Why Unboxing Videos Are Requested */}
      <section className="static-section-block">
        <h2>1. WHY UNBOXING VIDEOS ARE REQUESTED</h2>
        <p>
          SENO garments are crafted and hand-inspected in limited studio runs before dispatch in tamper-evident sealed packaging. Third-party logistics transit involves multiple transit hubs. A continuous, unaltered unboxing video helps us:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.7, fontSize: '14px', color: 'var(--muted, #676767)' }}>
          <li>Quickly verify courier transit damage versus manufacturer defects.</li>
          <li>Corroborate claims of missing pieces or incorrect sizes/colours sent in error.</li>
          <li>Fast-track replacements, store credits, or reversals without prolonged courier dispute delays.</li>
        </ul>
      </section>

      {/* 2. How to Record a Useful Unboxing Video */}
      <section className="static-section-block">
        <h2>2. HOW TO RECORD A USEFUL UNBOXING VIDEO</h2>
        <p>
          When your package arrives, follow these simple best practices before cutting open the outer seals:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginTop: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border, #e2e1dc)', padding: '18px', borderRadius: '2px' }}>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: 'var(--ink, #171717)' }}>
              1. Begin Before Opening
            </strong>
            <span style={{ fontSize: '12.5px', color: 'var(--muted, #676767)', lineHeight: 1.5, display: 'block' }}>
              Start recording prior to breaking the outer tape or tamper-evident seal of the cardboard box or courier flyer.
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border, #e2e1dc)', padding: '18px', borderRadius: '2px' }}>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: 'var(--ink, #171717)' }}>
              2. Capture the Shipping Label
            </strong>
            <span style={{ fontSize: '12.5px', color: 'var(--muted, #676767)', lineHeight: 1.5, display: 'block' }}>
              Briefly focus the camera on the printed shipping label showing your name, tracking AWB, and SENO dispatch details.
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border, #e2e1dc)', padding: '18px', borderRadius: '2px' }}>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: 'var(--ink, #171717)' }}>
              3. Continuous, Uncut Recording
            </strong>
            <span style={{ fontSize: '12.5px', color: 'var(--muted, #676767)', lineHeight: 1.5, display: 'block' }}>
              Keep the recording continuous without pausing, splicing, or cutting away from the parcel during the opening process.
            </span>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border, #e2e1dc)', padding: '18px', borderRadius: '2px' }}>
            <strong style={{ fontSize: '13px', display: 'block', marginBottom: '6px', color: 'var(--ink, #171717)' }}>
              4. Highlight Any Damage or Discrepancy
            </strong>
            <span style={{ fontSize: '12.5px', color: 'var(--muted, #676767)', lineHeight: 1.5, display: 'block' }}>
              Clearly display the product tag, seams, fabric condition, or missing accessory directly in good lighting.
            </span>
          </div>
        </div>
      </section>

      {/* 3. Examples of Issues Covered */}
      <section className="static-section-block">
        <h2>3. ISSUES COVERED UNDER THIS POLICY</h2>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.7, fontSize: '14px', color: 'var(--muted, #676767)' }}>
          <li><strong>Transit Damage:</strong> Torn packaging resulting in stains, snags, or damaged fabrics.</li>
          <li><strong>Manufacturing Defects:</strong> Broken zippers, stitching irregularities, or material flaws not matching studio specifications.</li>
          <li><strong>Incorrect Item / Size:</strong> A piece or variant differing from what was confirmed on your order dossier.</li>
          <li><strong>Missing Items:</strong> Parcels received with items missing from a multi-item shipment.</li>
        </ul>
      </section>

      {/* 4. Return Window & Eligibility Conditions */}
      <section className="static-section-block">
        <h2>4. STANDARD RETURN CONDITIONS &amp; TIMELINES</h2>
        <p>
          In accordance with existing SENO studio policies:
        </p>
        <ul style={{ paddingLeft: '20px', lineHeight: 1.7, fontSize: '14px', color: 'var(--muted, #676767)' }}>
          <li><strong>Return Window:</strong> Returns and size exchanges are accepted within <strong>7 days</strong> of confirmed delivery.</li>
          <li><strong>Garment Condition:</strong> Garments must be unworn, unwashed, unaltered, and in original condition with all SENO Studio security tags and packaging intact.</li>
          <li><strong>Refund Processing:</strong> Once your return is received and inspected by our studio team, approved refunds are credited back to your original payment method within <strong>5–7 business days</strong>.</li>
        </ul>
      </section>

      {/* 5. How to Submit a Claim & Contact SENO */}
      <section className="static-section-block">
        <h2>5. HOW TO SUBMIT A CLAIM VIA WHATSAPP SUPPORT</h2>
        <p>
          To report a product issue or initiate an assessment, reach out directly to SENO WhatsApp Business Support. Please have your order number and unboxing video ready:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: '#ffffff', border: '1px solid var(--border, #e2e1dc)', padding: '24px', borderRadius: '3px', marginTop: '16px' }}>
          <div>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted, #676767)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              SENO WHATSAPP BUSINESS SUPPORT
            </span>
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink, #171717)', marginBottom: '8px' }}>
              {SENO_WHATSAPP_NUMBER}
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted, #676767)', lineHeight: 1.5 }}>
              Share your order number, a brief description of the issue, and your unboxing video footage directly in the chat. Our concierge team will review and guide you through reverse pickup or resolution.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <WhatsAppSupportButton
              type="return_refund"
              label="Contact WhatsApp Support"
              variant="primary"
            />
            <Link href="/contact" className="outline-btn" style={{ padding: '10px 20px', fontSize: '11px', letterSpacing: '1px', textDecoration: 'none' }}>
              CONTACT FORM ALTERNATIVE
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Statutory Rights Statement */}
      <section className="static-section-block" style={{ borderTop: '1px solid var(--border, #e2e1dc)', paddingTop: '24px' }}>
        <h2>6. STATUTORY CONSUMER RIGHTS</h2>
        <p style={{ fontSize: '13px', color: 'var(--muted, #676767)', lineHeight: 1.6 }}>
          This verification policy operates in addition to, and does not restrict, diminish, or waive any mandatory statutory rights available under applicable Indian consumer protection laws. Every inquiry is evaluated individually on its merits by the SENO management team.
        </p>
      </section>
    </main>
  )
}
