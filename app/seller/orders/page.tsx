import { redirect } from 'next/navigation'
import { getSellerOrders, getMySellerRecord } from '@/lib/sellers'
import { SellerOrdersClient } from './SellerOrdersClient'

export const dynamic = 'force-dynamic'

export default async function SellerOrdersPage() {
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const orders = await getSellerOrders()

  return (
    <main className="static-page-container seller-orders-page" style={{ maxWidth: '1080px', paddingBottom: '96px' }}>
      <SellerOrdersClient orders={orders} />
    </main>
  )
}
