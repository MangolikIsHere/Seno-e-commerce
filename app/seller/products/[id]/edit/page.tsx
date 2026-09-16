import { redirect, notFound } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import { ProductForm } from '../../ProductForm'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select('*, product_images(*), product_variants(*)')
    .eq('id', params.id)
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
    variants: variantsWithInventory
  }

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  return (
    <div className="static-page-container" style={{ maxWidth: '800px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link 
          href="/seller/products" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.5px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Products</span>
        </Link>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <span className="section-kicker">SELLER DASHBOARD</span>
        <h1 className="static-page-title" style={{ margin: '4px 0 6px' }}>Edit Product</h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
          Update your product listing. Major changes may require re-approval from SENO admin.
        </p>
      </div>

      <ProductForm categories={categories || []} initialData={initialData} />
    </div>
  )
}
