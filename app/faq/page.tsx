import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo'
import { FaqClient, FaqCategory } from './FaqClient'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description: 'Find answers to common questions about orders, shipping, returns, garment care, and sizing at SENO.',
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
  openGraph: {
    title: 'FAQ — SENO',
    description: 'Find answers to common questions about orders, shipping, returns, garment care, and sizing at SENO.',
    url: `${SITE_URL}/faq`,
    siteName: SITE_NAME,
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 512,
        height: 512,
        alt: 'FAQ — SENO',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ — SENO',
    description: 'Find answers to common questions about orders, shipping, returns, garment care, and sizing at SENO.',
    images: [DEFAULT_OG_IMAGE],
  },
}

const faqData: FaqCategory[] = [
  {
    category: 'Orders',
    questions: [
      { q: 'Can I modify or cancel my order after placing it?', a: 'Orders can be modified within 2 hours of placement by contacting our studio team.' },
      { q: 'How will I know my order is confirmed?', a: 'An immediate order confirmation email will be sent along with your order summary.' },
    ],
  },
  {
    category: 'Shipping',
    questions: [
      { q: 'What is the shipping threshold for free delivery?', a: 'Free standard shipping is automatically applied across India on orders over ₹1,999.' },
      { q: 'What are standard delivery timelines?', a: 'Metro cities receive delivery within 2–3 business days. Rest of India takes 3–5 business days.' },
    ],
  },
  {
    category: 'Returns',
    questions: [
      { q: 'What is the SENO return window?', a: 'We accept returns and size exchanges within 7 days of order delivery.' },
      { q: 'What condition must returned items be in?', a: 'Items must be unworn, unwashed, and retain all original tags and packaging.' },
    ],
  },
  {
    category: 'Sizing',
    questions: [
      { q: 'How do SENO garments fit?', a: 'Our garments feature an intentional relaxed silhouette. Consult our size guide on any product page for exact measurements.' },
    ],
  },
  {
    category: 'Payments',
    questions: [
      { q: 'Which payment methods are accepted?', a: 'We accept UPI, major debit/credit cards, net banking, and select mobile wallets.' },
    ],
  },
  {
    category: 'Products',
    questions: [
      { q: 'Are sold-out pieces restocked?', a: 'Selected core staples are periodically restocked. Limited seasonal releases are not re-produced once sold out.' },
    ],
  },
  {
    category: 'Account',
    questions: [
      { q: 'Do I need an account to place an order?', a: 'Guest checkout is available. Creating an account allows you to track orders and save your wishlist.' },
    ],
  },
]

export default function FAQPage() {
  const allQuestions = faqData.flatMap((cat) => cat.questions)
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQuestions.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqClient faqData={faqData} />
    </>
  )
}
