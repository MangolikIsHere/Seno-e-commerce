import type { Metadata } from 'next'
import { InstallClient } from './InstallClient'

export const metadata: Metadata = {
  title: 'Install SENO App — Elevated Luxury Shopping Experience',
  description:
    'Add the official SENO App directly to your iPhone, Android, or computer. Faster access, private capsule drops, zero storage bloat, and seamless one-tap checkout.',
  openGraph: {
    title: 'Install SENO App — Considered Luxury Fashion',
    description:
      'Add the official SENO App directly to your home screen. Experience private capsule drops, instant direct checkout, and elevated luxury shopping.',
    url: '/install',
    siteName: 'SENO',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'SENO Official App Emblem',
      },
      {
        url: '/images/seno_beauty_edit.jpg',
        width: 1200,
        height: 630,
        alt: 'SENO Editorial Fashion Atelier',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Install SENO App — Considered Luxury Fashion',
    description:
      'Add the official SENO App to your home screen. Faster shopping, exclusive drops, and zero storage bloat.',
    images: ['/images/seno_beauty_edit.jpg'],
  },
  alternates: {
    canonical: '/install',
  },
}

export default function InstallPage() {
  return <InstallClient />
}

