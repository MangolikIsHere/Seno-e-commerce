'use client'

import React from 'react'
import { Sparkles, Truck, ShieldCheck, RefreshCw } from 'lucide-react'

export function AtelierTrustBar() {
  const pillars = [
    {
      icon: Sparkles,
      color: 'var(--sage-green)',
      bgColor: 'var(--sage-green-soft)',
      borderColor: '#D4DED1',
      title: 'CONSIDERED CRAFT',
      description: 'Artisanal natural textiles & architectural drape',
    },
    {
      icon: Truck,
      color: 'var(--champagne-gold)',
      bgColor: 'var(--champagne-soft)',
      borderColor: 'var(--champagne-border)',
      title: 'EXPRESS DISPATCH',
      description: 'Complimentary insured delivery across all PIN codes',
    },
    {
      icon: ShieldCheck,
      color: 'var(--terracotta)',
      bgColor: 'var(--terracotta-soft)',
      borderColor: 'var(--terracotta-border)',
      title: 'DIRECT CHECKOUT',
      description: 'Instant 1-tap checkout powered by Razorpay & UPI',
    },
    {
      icon: RefreshCw,
      color: 'var(--dusty-rose)',
      bgColor: 'var(--dusty-rose-soft)',
      borderColor: '#EED7DC',
      title: 'DOORSTEP EXCHANGES',
      description: '14-day seamless size exchanges & style support',
    },
  ]

  return (
    <section className="atelier-trust-strip" aria-label="SENO Atelier Guarantees">
      <div className="atelier-trust-container">
        <div className="atelier-trust-grid">
          {pillars.map((p, idx) => {
            const Icon = p.icon
            return (
              <div key={idx} className="atelier-trust-card">
                <div
                  className="atelier-trust-icon-box"
                  style={{
                    backgroundColor: p.bgColor,
                    color: p.color,
                    borderColor: p.borderColor,
                  }}
                >
                  <Icon size={19} strokeWidth={2} />
                </div>
                <div className="atelier-trust-text">
                  <h3 className="atelier-trust-title">{p.title}</h3>
                  <p className="atelier-trust-desc">{p.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

