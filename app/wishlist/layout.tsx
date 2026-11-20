import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Your Saved Wishlist — SENO',
  description: 'View your saved pieces and curated silhouettes from SENO.',
  alternates: {
    canonical: `${SITE_URL}/wishlist`,
  },
  robots: {
    index: false,
    follow: false,
  },
}

export default function WishlistLayout({ children }: { children: React.ReactNode }) {
  return children
}
