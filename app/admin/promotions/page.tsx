import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { checkIsAdmin } from '@/lib/admin'
import { getAllPromotions } from '@/lib/promotions'
import { getActiveCategories } from '@/lib/categories'
import { getCatalogProducts } from '@/lib/catalog'
import { AdminPromotionsClient } from './AdminPromotionsClient'

export const metadata: Metadata = {
  title: 'Offers & Promotions — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export default async function AdminPromotionsPage() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    redirect('/account')
  }

  const [promotions, categories, products] = await Promise.all([
    getAllPromotions(),
    getActiveCategories(),
    getCatalogProducts({ limit: 80 })
  ])

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      <AdminPromotionsClient
        initialPromotions={promotions}
        categories={categories}
        products={products}
      />
    </div>
  )
}
