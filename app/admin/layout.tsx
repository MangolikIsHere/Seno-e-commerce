import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { checkIsAdmin } from '@/lib/admin'
import { createClient } from '@/utils/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminMobileNav } from '@/components/admin/AdminMobileNav'

export const metadata: Metadata = {
  title: 'Admin Operations — SENO',
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
    <div className="admin-layout-root">
      {/* Mobile Header and Drawer Navigation (< 1024px) */}
      <AdminMobileNav adminEmail={user?.email} />

      <div className="admin-layout-container">
        {/* Desktop Sidebar (>= 1024px) */}
        <AdminSidebar adminEmail={user?.email} />

        {/* Core Content Viewport */}
        <main className="admin-content-area" id="admin-main-content">
          {children}
        </main>
      </div>
    </div>
  )
}
