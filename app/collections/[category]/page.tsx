import React from 'react'
import { CollectionView } from '@/components/CollectionView'

interface PageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.category.toLowerCase()

  let title = 'ALL PRODUCTS'
  if (slug === 'topwear') title = 'TOPWEAR'
  else if (slug === 'bottomwear') title = 'BOTTOMWEAR'
  else if (slug === 'outerwear') title = 'OUTERWEAR'
  else if (slug === 'accessories') title = 'ACCESSORIES'
  else if (slug === 'new-arrivals') title = 'NEW ARRIVALS'
  else if (slug === 'bestsellers') title = 'BESTSELLERS'

  return <CollectionView categoryTitle={title} categorySlug={slug} />
}
