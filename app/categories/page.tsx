import React from 'react'
import type { Metadata } from 'next'
import { getActiveCategories } from '@/lib/categories'
import { getCollectionProducts } from '@/lib/catalog'
import { CategoriesClient } from './CategoriesClient'

export const metadata: Metadata = {
  title: 'Categories — SENO',
  description: 'Explore the complete SENO curated collections: Ethnic & Traditional Wear, Western, Topwear, Bottomwear, and Cosmetics.',
}

export const revalidate = 60

export default async function CategoriesPage() {
  const categories = await getActiveCategories()
  const allProducts = await getCollectionProducts('All')

  return (
    <main className="categories-page-container">
      <CategoriesClient initialCategories={categories} initialProducts={allProducts} />
    </main>
  )
}
