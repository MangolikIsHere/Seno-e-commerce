import { redirect, notFound } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import { ProductForm } from '../../ProductForm'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*), collection_products(collection_id)')
    .eq('id', id)
    .eq('seller_id', seller.id)
    .single()

  if (error || !product) {
    notFound()
  }

  // Get inventory for variants
  const variantsWithInventory = await Promise.all(product.product_variants.map(async (v: any) => {
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
      <ProductForm categories={categories || []} collections={collections || []} initialData={initialData} />
    </div>
  )
}
