import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Search Catalog — SENO',
  description: 'Search the SENO luxury catalog for contemporary clothing, essentials, and curated objects.',
  alternates: {
    canonical: `${SITE_URL}/search`,
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
