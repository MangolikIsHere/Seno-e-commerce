'use client'

import React, { useState } from 'react'

export default function FAQPage() {
  const [openCategory, setOpenCategory] = useState<string>('Orders')

  const faqData = [
    {
      category: 'Orders',
      questions: [
        { q: 'Can I modify or cancel my order after placing it?', a: 'Orders can be modified within 2 hours of placement by contacting our studio team.' },
        { q: 'How will I know my order is confirmed?', a: 'An immediate order confirmation email will be sent along with your order summary.' }
      ]
    },
    {
      category: 'Shipping',
      questions: [
        { q: 'What is the shipping threshold for free delivery?', a: 'Free standard shipping is automatically applied across India on orders over ₹1,999.' },
        { q: 'What are standard delivery timelines?', a: 'Metro cities receive delivery within 2–3 business days. Rest of India takes 3–5 business days.' }
      ]
    },
    {
      category: 'Returns',
      questions: [
        { q: 'What is the SENO return window?', a: 'We accept returns and size exchanges within 7 days of order delivery.' },
        { q: 'What condition must returned items be in?', a: 'Items must be unworn, unwashed, and retain all original tags and packaging.' }
      ]
    },
    {
      category: 'Sizing',
      questions: [
        { q: 'How do SENO garments fit?', a: 'Our garments feature an intentional relaxed silhouette. Consult our size guide on any product page for exact measurements.' }
      ]
    },
    {
      category: 'Payments',
      questions: [
        { q: 'Which payment methods are accepted?', a: 'We accept UPI, major debit/credit cards, net banking, and select mobile wallets.' }
      ]
    },
    {
      category: 'Products',
      questions: [
        { q: 'Are sold-out pieces restocked?', a: 'Selected core staples are periodically restocked. Limited seasonal releases are not re-produced once sold out.' }
      ]
    },
    {
      category: 'Account',
      questions: [
        { q: 'Do I need an account to place an order?', a: 'Guest checkout is available. Creating an account allows you to track orders and save your wishlist.' }
      ]
    }
  ]

  return (
    <main className="static-page-container">
      <span className="section-kicker">FREQUENTLY ASKED QUESTIONS</span>
      <h1 className="static-page-title">FAQ</h1>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '36px' }}>
        {faqData.map(item => (
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
          .find(item => item.category === openCategory)
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
