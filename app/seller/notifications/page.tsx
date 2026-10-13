import { redirect } from 'next/navigation'
import { getMySellerRecord } from '@/lib/sellers'
import { getUserNotifications } from '@/lib/notifications/service'
import { SellerNotificationsClient } from './SellerNotificationsClient'

export const dynamic = 'force-dynamic'

export default async function SellerNotificationsPage() {
  const seller = await getMySellerRecord()
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const { notifications } = await getUserNotifications(50)

  return (
    <main className="static-page-container seller-notifications-page" style={{ maxWidth: '960px', paddingBottom: '96px' }}>
      <SellerNotificationsClient initialNotifications={notifications} />
    </main>
  )
}
