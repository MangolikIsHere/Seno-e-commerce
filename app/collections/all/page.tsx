import React from 'react'
import type { Metadata } from 'next'
import { CollectionView } from '@/components/CollectionView'
import { getCollectionProducts, Product } from '@/lib/catalog'
import { getActiveCategories } from '@/lib/categories'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'Complete Collection',
  description: 'Explore the complete SENO catalog of contemporary silhouettes and considered objects.',
  alternates: {
    canonical: `${SITE_URL}/collections/all`,
  },
  openGraph: {
    title: 'Complete Collection — SENO',
    description: 'Explore the complete SENO catalog of contemporary silhouettes and considered objects.',
    url: `${SITE_URL}/collections/all`,
    siteName: SITE_NAME,
    type: 'website',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 512,
        height: 512,
        alt: 'Complete Collection — SENO',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Complete Collection — SENO',
    description: 'Explore the complete SENO catalog of contemporary silhouettes and considered objects.',
    images: [DEFAULT_OG_IMAGE],
  },
}

export default async function AllProductsPage() {
  const categories = await getActiveCategories()
  const initialProducts = await getCollectionProducts('All', { sort: 'Featured' })

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Complete Collection',
    itemListElement: initialProducts.map((p: Product, index: number) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: p.name,
      url: `${SITE_URL}/products/${p.slug}`,
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <CollectionView
        categoryTitle="ALL PRODUCTS"
        categorySlug="all"
        categoryOptions={categories.map((category) => category.name)}
        initialProducts={initialProducts}
      />
    </>
  )
}
