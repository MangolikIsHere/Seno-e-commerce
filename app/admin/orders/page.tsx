import React from 'react'
import type { Metadata } from 'next'
import { getPlatformOrders } from '@/lib/admin'
import { AdminOrdersClient } from './AdminOrdersClient'

export const metadata: Metadata = {
  title: 'Platform Orders — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const orders = await getPlatformOrders()

  return (
    <div className="admin-page-container">
      <AdminOrdersClient initialOrders={orders} />
    </div>
  )
}
