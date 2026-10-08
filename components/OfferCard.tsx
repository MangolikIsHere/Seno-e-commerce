'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Tag } from 'lucide-react'
import { Promotion } from '@/lib/promotions-shared'
import { getPromotionBadgeText } from '@/lib/promotions-shared'

interface OfferCardProps {
  promotion: Promotion
  isFeaturedHero?: boolean
}

export function OfferCard({ promotion, isFeaturedHero = false }: OfferCardProps) {
  const badge = getPromotionBadgeText(promotion)

  const formattedExpiry = promotion.ends_at
    ? new Date(promotion.ends_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : null

  // Scope description
  const scopeLabel =
    promotion.applies_to === 'all'
      ? 'Storewide Selection'
      : promotion.applies_to === 'category'
      ? `Selected ${promotion.target_ids.join(', ')}`
      : promotion.applies_to === 'collection'
      ? `Curated Collection`
      : 'Selected Styles'

  return (
    <article
      className={`seno-offer-card ${isFeaturedHero ? 'seno-offer-card-featured' : ''}`}
      style={{
        background: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: '2px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease'
      }}
    >
      {/* Cover / Hero image */}
      {promotion.hero_image_url ? (
        <div
          style={{
            width: '100%',
            height: isFeaturedHero ? '280px' : '220px',
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--surface-subtle)'
          }}
        >
          <img
            src={promotion.hero_image_url}
            alt={promotion.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease'
            }}
            loading="lazy"
          />
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              background: 'var(--ink)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1.2px',
              padding: '4px 9px',
              borderRadius: '2px',
              textTransform: 'uppercase'
            }}
          >
            {badge}
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '20px 24px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span
            style={{
              background: 'var(--ink)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '1.2px',
              padding: '4px 9px',
              borderRadius: '2px',
              textTransform: 'uppercase'
            }}
          >
            {badge}
          </span>
          <span style={{ fontSize: '10.5px', color: 'var(--muted)', letterSpacing: '0.8px' }}>
            {scopeLabel}
          </span>
        </div>
      )}

      {/* Content Area */}
      <div
        style={{
          padding: '24px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '9.5px',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                fontWeight: 600
              }}
            >
              {scopeLabel}
            </span>
            {promotion.coupon_code && (
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  background: '#f5f5f5',
                  border: '1px dashed #aaa',
                  borderRadius: '2px',
                  color: 'var(--ink)'
                }}
              >
                CODE: {promotion.coupon_code}
              </span>
            )}
          </div>

          <h2
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: isFeaturedHero ? '24px' : '20px',
              fontWeight: 400,
              color: 'var(--ink)',
              margin: '0 0 8px',
              lineHeight: 1.25
            }}
          >
            {promotion.hero_headline || promotion.name}
          </h2>

          <p
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              lineHeight: 1.6,
              margin: '0 0 16px'
            }}
          >
            {promotion.hero_subheading || promotion.description || 'Exclusive promotional curation on selected SENO pieces.'}
          </p>

          {/* Conditions & Details */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '20px',
              fontSize: '11px',
              color: 'var(--ink)'
            }}
          >
            {promotion.min_cart_value ? (
              <span style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '2px' }}>
                Min Order: ₹{promotion.min_cart_value.toLocaleString('en-IN')}
              </span>
            ) : null}

            {promotion.max_discount_amount ? (
              <span style={{ background: '#f5f5f5', padding: '4px 8px', borderRadius: '2px' }}>
                Max Cap: ₹{promotion.max_discount_amount.toLocaleString('en-IN')}
              </span>
            ) : null}

            {formattedExpiry && (
              <span
                style={{
                  background: '#fcf8e3',
                  color: '#8a6d3b',
                  padding: '4px 8px',
                  borderRadius: '2px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Clock size={11} /> Valid until {formattedExpiry}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/offers/${promotion.slug}`}
          className="dark-btn"
          style={{
            width: '100%',
            padding: '13px 20px',
            fontSize: '11px',
            letterSpacing: '1.4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            textDecoration: 'none'
          }}
        >
          <span>{promotion.hero_cta_text || 'SHOP THE OFFER'}</span>
          <ArrowRight size={13} />
        </Link>
      </div>
    </article>
  )
}
