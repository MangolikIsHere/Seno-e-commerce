import React from 'react'
import { getCatalogMetadata } from '@/lib/adminCatalog'
import { ProductEditorForm } from '@/components/admin/ProductEditorForm'

export const dynamic = 'force-dynamic'

export default async function AdminNewProductPage() {
  const meta = await getCatalogMetadata()

  return (
    <ProductEditorForm
      mode="create"
      categories={meta.categories}
      collections={meta.collections}
    />
  )
}
