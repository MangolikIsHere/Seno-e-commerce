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
    <div className="static-page-container" style={{ maxWidth: '860px', paddingBottom: '96px', paddingTop: '16px' }}>
      <ProductForm categories={categories || []} collections={collections || []} />
    </div>
  )
}
