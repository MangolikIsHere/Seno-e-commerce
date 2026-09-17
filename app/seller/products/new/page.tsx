import { redirect } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import { ProductForm } from '../ProductForm'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function NewProductPage() {
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const supabase = await createClient()
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
        <h1 className="static-page-title" style={{ margin: '4px 0 6px' }}>Add New Product</h1>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
          Create a new product listing. It will be submitted to SENO for review before becoming public.
        </p>
      </div>

      <ProductForm categories={categories || []} collections={collections || []} />
    </div>
  )
}
