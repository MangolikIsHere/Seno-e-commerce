import React from 'react'
import { notFound } from 'next/navigation'
import { getAdminProductById, getCatalogMetadata } from '@/lib/adminCatalog'
import { ProductEditorForm } from '@/components/admin/ProductEditorForm'

export const dynamic = 'force-dynamic'

interface AdminEditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditProductPage({ params }: AdminEditProductPageProps) {
  const { id } = await params
  const [product, meta] = await Promise.all([
    getAdminProductById(id),
    getCatalogMetadata()
  ])

  if (!product) {
    notFound()
  }

  return (
    <ProductEditorForm
      mode="edit"
      initialData={product}
      categories={meta.categories}
      collections={meta.collections}
    />
  )
}
