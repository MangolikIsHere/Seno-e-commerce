import { redirect } from 'next/navigation'
import { getMySellerRecord, getSellerProducts } from '@/lib/sellers'
import { getActiveCategories } from '@/lib/categories'
import { SellerProductsClient } from './SellerProductsClient'

export const dynamic = 'force-dynamic'

export default async function SellerProductsPage() {
  const seller = await getMySellerRecord()
  if (!seller || seller.seller_status !== 'approved') redirect('/seller/register')
  const [products, categories] = await Promise.all([getSellerProducts(), getActiveCategories()])
  return <main className="static-page-container" style={{ maxWidth: '1180px', paddingBottom: '96px' }}><SellerProductsClient products={products} categories={categories} /></main>
}
