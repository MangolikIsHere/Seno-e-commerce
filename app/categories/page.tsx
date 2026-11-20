import React from 'react'
import type { Metadata } from 'next'
import { getActiveCategories } from '@/lib/categories'
import { getCollectionProducts } from '@/lib/catalog'
import { CategoriesClient } from './CategoriesClient'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE, buildBreadcrumbJsonLd } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Categories — Curated Luxury Wardrobe Collections',
  description: 'Explore the complete SENO curated collections: Ethnic & Traditional Wear, Western, Topwear, Bottomwear, Cosmetics, and Accessories.',
  alternates: {
    canonical: `${SITE_URL}/categories`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Categories — SENO',
    description: 'Explore the complete SENO curated collections: Ethnic & Traditional Wear, Western, Topwear, Bottomwear, Cosmetics, and Accessories.',
    url: `${SITE_URL}/categories`,
    siteName: SITE_NAME,
    type: 'website',
    images: [{ url: DEFAULT_OG_IMAGE, width: 512, height: 512, alt: 'SENO Categories' }],
  },
}

export const revalidate = 60

export default async function CategoriesPage() {
  const categories = await getActiveCategories()
  const allProducts = await getCollectionProducts('All')

  const breadcrumbsJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ])

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <main className="categories-page-container">
        <CategoriesClient initialCategories={categories} initialProducts={allProducts} />
      </main>
    </>
  )
}
