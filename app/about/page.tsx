import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'About',
  description: 'Considered clothing and objects for a life in perpetual movement. Learn about the philosophy and craftsmanship behind SENO.',
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
}
 
export default function AboutPage() {
  return (
    <main className="static-page-container">
      <span className="section-kicker">ABOUT SENO</span>
      <h1 className="static-page-title">
        Made for the
        <br />
        <em>in-between.</em>
      </h1>

      <p className="static-intro-lead">
        SENO designs considered clothing and objects for a life in perpetual movement. Based in Mumbai, our studio focuses on tactile natural textiles, precise architectural drape, and garments engineered to age gracefully.
      </p>

      <section className="static-section-block">
        <h2>DESIGN APPROACH</h2>
        <p>
          We build silhouettes designed to bridge formal tailoring and practical ease. Each pattern is constructed with attention to weight, fall, and comfort, avoiding seasonal trends in favor of enduring form and function.
        </p>
      </section>

      <section className="static-section-block">
        <h2>OUR PHILOSOPHY</h2>
        <p>
          Every SENO piece is produced in small, measured batches. We focus on unwashed selvedge denim, high-density organic ribs, and structured wool blends that develop character through daily wear.
        </p>
      </section>
    </main>
  )
}
