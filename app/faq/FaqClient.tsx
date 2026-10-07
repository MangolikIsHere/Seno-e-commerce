'use client'

import React, { useState } from 'react'

export interface FaqCategory {
  category: string
  questions: { q: string; a: string }[]
}

export function FaqClient({ faqData }: { faqData: FaqCategory[] }) {
  const [openCategory, setOpenCategory] = useState<string>('Orders')

  return (
    <main className="static-page-container">
      <span className="section-kicker">FREQUENTLY ASKED QUESTIONS</span>
      <h1 className="static-page-title">FAQ</h1>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
        {faqData.map((item) => (
          <button
            key={item.category}
            className={`size-option-pill ${openCategory === item.category ? 'selected' : ''}`}
            onClick={() => setOpenCategory(item.category)}
            style={{ padding: '0 20px', textTransform: 'uppercase' }}
          >
            {item.category}
          </button>
        ))}
      </div>

      <div className="accordions-container" style={{ maxWidth: '100%' }}>
        {faqData
          .find((item) => item.category === openCategory)
          ?.questions.map((faq, idx) => (
            <div className="accordion-item" key={idx}>
              <div style={{ padding: '20px 0' }}>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, margin: '0 0 8px' }}>
                  {faq.q}
                </h3>
                <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.65, margin: 0 }}>
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
      </div>
    </main>
  )
}
