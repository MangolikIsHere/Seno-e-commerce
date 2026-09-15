import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Seller Portal — SENO',
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

  // We don't strictly block all of /seller, because /seller/register must be accessible
  // to regular customers who want to apply. We'll do strict checks in the individual pages
  // like /seller/dashboard, /seller/products, etc.

  return (
    <div className="seller-layout">
      {/* We can add a simple top nav or sidebar for sellers if needed, or rely on the main nav. */}
      {children}
    </div>
  )
}
