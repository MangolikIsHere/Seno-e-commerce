import React, { Suspense } from 'react'
import { getAdminCatalogProducts, getCatalogMetadata } from '@/lib/adminCatalog'
import { ProductListClient } from '@/components/admin/ProductListClient'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const [products, meta] = await Promise.all([
    getAdminCatalogProducts(),
    getCatalogMetadata()
  ])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductListClient 
        initialProducts={products} 
        categories={meta.categories} 
      />
    </Suspense>
  )
}
