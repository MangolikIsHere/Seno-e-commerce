import React from 'react'
import { CollectionView } from '@/components/CollectionView'

export const revalidate = 300

export default function AllProductsPage() {
  return <CollectionView categoryTitle="ALL PRODUCTS" categorySlug="all" />
}
