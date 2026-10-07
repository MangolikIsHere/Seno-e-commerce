import React from 'react'
import type { Metadata } from 'next'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo'
import { ContactFormClient } from './ContactFormClient'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the SENO studio team for order assistance, customer support, and general inquiries.',
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
  openGraph: {
    title: 'Contact SENO',
    description: 'Get in touch with the SENO studio team for order assistance, customer support, and general inquiries.',
    url: `${SITE_URL}/contact`,
    siteName: SITE_NAME,
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 512,
        height: 512,
        alt: 'Contact SENO',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact SENO',
    description: 'Get in touch with the SENO studio team for order assistance, customer support, and general inquiries.',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default function ContactPage() {
  return <ContactFormClient />
}
