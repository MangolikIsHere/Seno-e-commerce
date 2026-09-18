import React from 'react'
import type { Metadata } from 'next'
import { CollectionView } from '@/components/CollectionView'
import { getActiveCategories } from '@/lib/categories'

interface PageProps {
  params: Promise<{ category: string }>
}

function getCategoryMeta(slug: string) {
  const metaMap: Record<string, { title: string; description: string }> = {
    all: {
      title: 'Complete Collection — SENO',
      description: 'Explore the complete SENO catalog of contemporary silhouettes and considered objects.'
    },
    topwear: {
      title: 'Topwear Collection — SENO',
      description: 'Shirts, overshirts, and tees crafted from structured organic cotton and linen.'
    },
    bottomwear: {
      title: 'Bottomwear Collection — SENO',
      description: 'Pleated trousers, denim, and relaxed trousers designed for effortless everyday motion.'
    },
    'ethnic-traditional-wear': {
      title: 'Ethnic & Traditional Wear — SENO',
      description: 'Heritage silhouettes and modern craft from the current SENO catalog.'
    },
    western: {
      title: 'Western — SENO',
      description: 'Contemporary everyday forms from the current SENO catalog.'
    },
    cosmetics: {
      title: 'Cosmetics — SENO',
      description: 'Beauty, care, and finishing touches from the current SENO catalog.'
    },
    'new-arrivals': {
      title: 'New Arrivals — SENO',
      description: 'Discover the latest additions to the SENO seasonal collection.'
    },
    bestsellers: {
      title: 'Bestselling Pieces — SENO',
      description: 'The most appreciated garments and objects in the SENO marketplace.'
    }
  }

  return metaMap[slug] || {
    title: `${slug.toUpperCase()} — SENO`,
    description: 'Considered clothing and objects for a life in motion.'
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()
  const meta = getCategoryMeta(slug)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seno-luxury.com'

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${siteUrl}/collections/${slug}`
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${siteUrl}/collections/${slug}`,
      siteName: 'SENO Luxury Marketplace',
      type: 'website'
    }
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()

  const categories = await getActiveCategories()
  let title = categories.find(category => category.slug === slug)?.name.toUpperCase() || 'ALL PRODUCTS'
  if (slug === 'new-arrivals') title = 'NEW ARRIVALS'
  else if (slug === 'bestsellers') title = 'BESTSELLERS'

  return <CollectionView categoryTitle={title} categorySlug={slug} categoryOptions={categories.map(category => category.name)} />
}
