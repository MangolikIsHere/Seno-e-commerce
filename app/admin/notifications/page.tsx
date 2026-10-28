import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { checkIsAdmin } from '@/lib/admin'
import { getUserNotifications } from '@/lib/notifications/service'
import { AdminNotificationsClient } from './AdminNotificationsClient'

export const metadata: Metadata = {
  title: 'Notifications & Alerts — SENO Admin',
  robots: {
    index: false,
    follow: false
  }
}

export const dynamic = 'force-dynamic'

export default async function AdminNotificationsPage() {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    redirect('/account')
  }

  const { notifications } = await getUserNotifications(50)

  return (
    <div className="admin-page-container">
      <AdminNotificationsClient initialNotifications={notifications} />
    </div>
  )
}

