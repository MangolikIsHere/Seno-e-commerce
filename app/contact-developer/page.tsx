import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Developer — Mangolik Debnath',
  description: 'Building and maintaining the digital experience behind SENO. Connect with developer Mangolik Debnath via LinkedIn, phone, or WhatsApp.',
  alternates: {
    canonical: `${SITE_URL}/contact-developer`,
  },
}

export default function ContactDeveloperPage() {
  return (
    <main className="static-page-container dev-contact-page">
      <Link href="/" className="breadcrumb-back-link" style={{ marginBottom: '32px', display: 'inline-flex' }}>
        ← Back to SENO
      </Link>

      <header className="dev-header">
        <span className="section-kicker">DEVELOPER</span>
        <h1 className="static-page-title" style={{ marginBottom: '16px' }}>Mangolik Debnath</h1>
        <p className="static-intro-lead" style={{ maxWidth: '640px', marginBottom: '36px' }}>
          Building and maintaining the digital experience behind SENO.
        </p>
      </header>

      <div className="dev-content-grid">
        {/* Developer Profile Card */}
        <section className="dev-card dev-profile-card" aria-labelledby="developer-profile-heading">
          <div>
            <div className="dev-avatar-wrapper">
              <div
                className="dev-avatar"
                role="img"
                aria-label="Mangolik Debnath profile photo placeholder"
              >
                <span className="dev-avatar-monogram" aria-hidden="true">MD</span>
              </div>
              <div>
                <span className="dev-card-kicker">DEVELOPER PROFILE</span>
                <h2 id="developer-profile-heading" className="dev-profile-name">
                  Mangolik Debnath
                </h2>
                <p className="dev-profile-role">
                  Full-Stack Developer · SENO
                </p>
              </div>
            </div>
          </div>

          <div className="dev-linkedin-box">
            <div className="dev-action-header">
              <span className="dev-action-label">LinkedIn</span>
              <span className="dev-action-sub">Professional Profile</span>
            </div>

            <a
              href="https://www.linkedin.com/in/mangolik-debnath-a348012b2/"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-link-block"
              aria-label="View Mangolik Debnath's profile on LinkedIn (opens in a new window)"
            >
              <span className="dev-link-name">Mangolik Debnath</span>
              <span className="dev-link-cta">
                View LinkedIn Profile <span className="dev-cta-arrow" aria-hidden="true">→</span>
              </span>
            </a>
          </div>
        </section>

        {/* Contact Actions Card */}
        <section className="dev-card dev-contact-card" aria-labelledby="developer-contact-heading">
          <div className="dev-card-header">
            <span className="dev-card-kicker">DIRECT CONTACT</span>
            <h2 id="developer-contact-heading" className="dev-section-title">
              Get in Touch
            </h2>
            <p className="dev-section-lead">
              For technical inquiries, website feedback, or direct communication with the developer.
            </p>
          </div>

          <div className="dev-contact-actions">
            {/* Phone Option */}
            <div className="dev-contact-item">
              <div className="dev-contact-meta">
                <span className="dev-contact-type">Call Developer</span>
                <span className="dev-contact-value">+91 9832834357</span>
              </div>
              <a
                href="tel:+919832834357"
                className="dark-btn dev-contact-btn"
                aria-label="Call developer Mangolik Debnath at +91 9832834357"
              >
                Call Developer <span className="dev-cta-arrow" aria-hidden="true">→</span>
              </a>
            </div>

            {/* WhatsApp Option */}
            <div className="dev-contact-item">
              <div className="dev-contact-meta">
                <span className="dev-contact-type">WhatsApp Developer</span>
                <span className="dev-contact-value">+91 9832834357</span>
              </div>
              <a
                href="https://wa.me/919832834357"
                target="_blank"
                rel="noopener noreferrer"
                className="outline-btn dev-contact-btn"
                aria-label="Message developer Mangolik Debnath on WhatsApp (opens in a new window)"
              >
                WhatsApp Developer <span className="dev-cta-arrow" aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
