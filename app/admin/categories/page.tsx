import React from 'react'
import type { Metadata } from 'next'
import { getAdminCategories } from '@/lib/categories'
import { CategoriesClient } from './CategoriesClient'

export const metadata: Metadata = {
  title: 'Categories & Taxonomy — SENO Admin',
  robots: { index: false, follow: false }
}

export const dynamic = 'force-dynamic'

export default async function AdminCategoriesPage() {
  const categories = await getAdminCategories()
  return <CategoriesClient initialCategories={categories} />
}