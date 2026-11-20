import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Track Your Order — SENO',
  description: 'Track the delivery and fulfillment status of your SENO garment order.',
  alternates: {
    canonical: `${SITE_URL}/track-order`,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function TrackOrderLayout({ children }: { children: React.ReactNode }) {
  return children
}
