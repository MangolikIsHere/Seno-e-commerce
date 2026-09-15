import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { checkIsAdmin } from '@/lib/admin'
import { createClient } from '@/utils/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata: Metadata = {
  title: 'Admin Dashboard — SENO',
  robots: {
    index: false,
    follow: false
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const isAdmin = await checkIsAdmin()

  if (!isAdmin) {
    redirect('/account')
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="admin-layout-container">
      <AdminSidebar adminEmail={user?.email} />
      <main className="admin-content-area">
        {children}
      </main>
    </div>
  )
}

