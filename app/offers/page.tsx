import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Tag, ArrowRight, Sparkles, Clock, Check } from 'lucide-react'
import { getActivePromotions } from '@/lib/promotions'
import { OfferCard } from '@/components/OfferCard'
import { SITE_URL, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Offers & Seasonal Promotions',
  description: 'Explore active seasonal offers, capsule promotions, and elevated styling edits from SENO Studio.',
  alternates: {
    canonical: `${SITE_URL}/offers`
  },
  openGraph: {
    title: 'Offers & Promotions | SENO',
    description: 'Explore active seasonal offers and styling edits from SENO Studio.',
    url: `${SITE_URL}/offers`,
    images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: 'SENO Promotions' }]
  }
}

export default async function OffersPage() {
  const promotions = await getActivePromotions()
  const featuredOffer = promotions.find(p => p.show_on_homepage_hero) || promotions[0]
  const otherOffers = featuredOffer ? promotions.filter(p => p.id !== featuredOffer.id) : promotions

  return (
    <main className="static-page-container offers-page-container" style={{ paddingBottom: '90px' }}>
      {/* Editorial Header */}
      <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px' }}>
        <span className="section-kicker">CURATED PROMOTIONS</span>
        <h1 className="static-page-title" style={{ margin: '8px 0 12px' }}>
          Offers & Edits
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: 1.7, margin: 0 }}>
          Considered styling capsules, seasonal promotions, and curated duos designed for your everyday wardrobe.
        </p>
      </div>

      {promotions.length === 0 ? (
        /* Tasteful SENO Empty State */
        <div
          style={{
            borderTop: '1px solid var(--line)',
            borderBottom: '1px solid var(--line)',
            padding: '70px 24px',
            textAlign: 'center',
            maxWidth: '540px',
            margin: '0 auto'
          }}
        >
          <span
            style={{
              fontSize: '10px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              display: 'block',
              marginBottom: '8px',
              fontWeight: 600
            }}
          >
            CURRENTLY
          </span>
          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '22px',
              color: 'var(--ink)',
              margin: '0 0 10px',
              fontWeight: 400
            }}
          >
            No Special Offers
          </h2>
          <p
            style={{
              color: 'var(--muted)',
              fontSize: '13px',
              marginBottom: '26px',
              lineHeight: 1.6
            }}
          >
            Explore the latest SENO collection with complimentary express delivery across India.
          </p>
          <Link
            href="/collections/new-arrivals"
            className="dark-btn"
            style={{ padding: '13px 28px', fontSize: '11px', letterSpacing: '1.6px' }}
          >
            SHOP NEW ARRIVALS
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Top Featured Hero Card */}
          {featuredOffer && (
            <section aria-label="Featured Offer">
              <span
                style={{
                  fontSize: '9.5px',
                  letterSpacing: '1.8px',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  display: 'block',
                  marginBottom: '12px',
                  fontWeight: 600
                }}
              >
                FEATURED PROMOTION
              </span>
              <OfferCard promotion={featuredOffer} isFeaturedHero />
            </section>
          )}

          {/* All Other Active Offers */}
          {otherOffers.length > 0 && (
            <section aria-label="All Active Offers">
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: '28px',
                  marginBottom: '20px'
                }}
              >
                <span
                  style={{
                    fontSize: '9.5px',
                    letterSpacing: '1.8px',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                    display: 'block',
                    fontWeight: 600
                  }}
                >
                  ALL ACTIVE OFFERS ({otherOffers.length})
                </span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '24px'
                }}
              >
                {otherOffers.map(promo => (
                  <OfferCard key={promo.id} promotion={promo} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
