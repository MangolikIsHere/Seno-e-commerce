import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getMySellerRecord } from '@/lib/sellers'
import { SellerNav } from '@/components/seller/SellerNav'
import { SellerMobileNav } from '@/components/seller/SellerMobileNav'
import './seller.css'

export const metadata: Metadata = {
  title: 'Seller Studio — SENO Luxury Portal',
  description: 'Manage your SENO storefront, product listings, consignments, and store earnings with ease.',
  robots: {
    index: false,
    follow: false
  }
}

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/account/login')
  }

  const seller = await getMySellerRecord()
  const hasActiveStudio = seller && seller.seller_status !== 'pending' && seller.seller_status !== 'rejected'

  return (
    <div className="seller-portal-shell">
      {hasActiveStudio && (
        <>
          <SellerMobileNav seller={seller} />
          <SellerNav seller={seller} />
        </>
      )}
      <div className={`seller-portal-content ${hasActiveStudio ? 'has-seller-nav' : ''}`}>
        {children}
      </div>
    </div>
  )
}
