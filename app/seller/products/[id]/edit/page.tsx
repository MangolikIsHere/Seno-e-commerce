import { redirect, notFound } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import { ProductForm } from '../../ProductForm'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface EditProductPageProps {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ step?: string; focus?: string }>
}

export default async function EditProductPage({ params, searchParams }: EditProductPageProps) {
  const { id } = await params
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const parsedStep = resolvedSearchParams.step ? parseInt(resolvedSearchParams.step, 10) : undefined
  const initialStep = (parsedStep && parsedStep >= 1 && parsedStep <= 5) ? parsedStep : undefined
  const initialFocus = resolvedSearchParams.focus

  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug, is_active), product_images(*), product_variants(*), collection_products(collection_id)')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .single()

  if (error || !product) {
    notFound()
  }

  // Get inventory for active variants only
  const activeVariants = (product.product_variants || []).filter((v: any) => v.is_active !== false)
  const variantsWithInventory = await Promise.all(activeVariants.map(async (v: any) => {
    const { data: inv } = await supabase.from('inventory').select('quantity').eq('variant_id', v.id).single()
    return { ...v, quantity: inv?.quantity || 0 }
  }))

  const initialData = {
    ...product,
    variants: variantsWithInventory,
    collection_ids: (product.collection_products || []).map((item: any) => item.collection_id)
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  const { data: collections } = await supabase
    .from('collections')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return (
    <div className="static-page-container" style={{ maxWidth: '860px', paddingBottom: '96px', paddingTop: '16px' }}>
      <ProductForm 
        categories={categories || []} 
        collections={collections || []} 
        initialData={initialData} 
        initialStep={initialStep}
        initialFocus={initialFocus}
      />
    </div>
  )
}
