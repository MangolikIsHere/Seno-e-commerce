import React from 'react'
import type { Metadata } from 'next'
import { CollectionView } from '@/components/CollectionView'
import { getActiveCategories } from '@/lib/categories'
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '@/lib/seo'

interface PageProps {
  params: Promise<{ category: string }>
}

function getCategoryMeta(slug: string) {
  const metaMap: Record<string, { title: string; description: string }> = {
    all: {
      title: 'Complete Collection',
      description: 'Explore the complete SENO catalog of contemporary silhouettes and considered objects.'
    },
    topwear: {
      title: 'Topwear Collection',
      description: 'Shirts, overshirts, and tees crafted from structured organic cotton and linen.'
    },
    bottomwear: {
      title: 'Bottomwear Collection',
      description: 'Pleated trousers, denim, and relaxed trousers designed for effortless everyday motion.'
    },
    'ethnic-traditional-wear': {
      title: 'Ethnic & Traditional Wear',
      description: 'Heritage silhouettes and modern craft from the current SENO catalog.'
    },
    western: {
      title: 'Western Collection',
      description: 'Contemporary everyday forms from the current SENO catalog.'
    },
    cosmetics: {
      title: 'Cosmetics Collection',
      description: 'Beauty, care, and finishing touches from the current SENO catalog.'
    },
    'new-arrivals': {
      title: 'New Arrivals',
      description: 'Discover the latest additions to the SENO seasonal collection.'
    },
    bestsellers: {
      title: 'Bestselling Pieces',
      description: 'The most appreciated garments and objects in the SENO marketplace.'
    }
  }

  return metaMap[slug] || {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    description: 'Considered clothing and objects for a life in motion.'
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()
  const meta = getCategoryMeta(slug)
  const canonicalUrl = `${SITE_URL}/collections/${slug}`
  const ogTitle = `${meta.title} — SENO`

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: ogTitle,
      description: meta.description,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type: 'website',
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 512,
          height: 512,
          alt: ogTitle,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: meta.description,
      images: [DEFAULT_OG_IMAGE],
    },
  }
}

export const revalidate = 300

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()

  const categories = await getActiveCategories()
  let title = categories.find(category => category.slug === slug)?.name.toUpperCase() || 'ALL PRODUCTS'
  if (slug === 'new-arrivals') title = 'NEW ARRIVALS'
  else if (slug === 'bestsellers') title = 'BESTSELLERS'

  return <CollectionView categoryTitle={title} categorySlug={slug} categoryOptions={categories.map(category => category.name)} />
}
