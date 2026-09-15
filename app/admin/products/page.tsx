import React from 'react'
import { getAdminCatalogProducts, getCatalogMetadata } from '@/lib/adminCatalog'
import { ProductListClient } from '@/components/admin/ProductListClient'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const [products, meta] = await Promise.all([
    getAdminCatalogProducts(),
    getCatalogMetadata()
  ])

  return (
    <ProductListClient 
      initialProducts={products} 
      categories={meta.categories} 
    />
  )
}
