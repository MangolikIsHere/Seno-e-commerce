'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight, X, Sparkles } from 'lucide-react'
import { Promotion, getPromotionBadgeText } from '@/lib/promotions-shared'

interface MobileOfferStripProps {
  promotion?: Promotion | null
}

export function MobileOfferStrip({ promotion }: MobileOfferStripProps) {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (!promotion) return
    const isDismissed = sessionStorage.getItem(`seno_offer_strip_${promotion.id}`)
    if (!isDismissed) {
      setDismissed(false)
    }
  }, [promotion])

  if (!promotion || dismissed) return null

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissed(true)
    sessionStorage.setItem(`seno_offer_strip_${promotion.id}`, 'true')
  }

  const badge = getPromotionBadgeText(promotion)
  const headline = promotion.hero_headline || promotion.name

  return (
    <div
      className="mobile-offer-strip"
      style={{
        background: 'linear-gradient(90deg, #713B49 0%, #8C4456 50%, #B87858 100%)',
        color: '#ffffff',
        borderBottom: '1px solid rgba(215, 174, 112, 0.35)',
        fontSize: '11px',
        padding: '7px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 50,
        letterSpacing: '0.6px',
        boxShadow: '0 2px 8px rgba(113, 59, 73, 0.25)'
      }}
    >
      <Link
        href={`/offers/${promotion.slug}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ffffff',
          textDecoration: 'none',
          maxWidth: 'calc(100% - 32px)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        <span
          style={{
            fontSize: '9.5px',
            fontWeight: 700,
            background: 'rgba(215, 174, 112, 0.25)',
            border: '1px solid rgba(215, 174, 112, 0.5)',
            color: '#FFE8C2',
            padding: '2px 7px',
            borderRadius: '2px',
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            flexShrink: 0
          }}
        >
          {badge}
        </span>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {headline}
          </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700, fontSize: '10px', color: '#FFE8C2', flexShrink: 0 }}>
              EXPLORE <ArrowRight size={11} />
            </span>
          </Link>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss offer strip"
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={13} />
          </button>
        </div>
        )
}
