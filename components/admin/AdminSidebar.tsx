'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  PackageCheck,
  Layers,
  Store,
  Users,
  CreditCard,
  Tag,
  Settings,
  ArrowUpRight,
  ShieldCheck,
  User,
  LogOut
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface AdminSidebarProps {
  adminEmail?: string
}

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/account')
    router.refresh()
  }

  const operationsNav = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { label: 'Products', href: '/admin/products', icon: PackageCheck },
    { label: 'Categories', href: '/admin/categories', icon: Layers },
    { label: 'Sellers', href: '/admin/sellers', icon: Store },
    { label: 'Customers', href: '/admin/customers', icon: Users },
  ]

  const marketingFinanceNav = [
    { label: 'Payments & Refunds', href: '/admin/payments', icon: CreditCard },
    { label: 'Offers & Promotions', href: '/admin/promotions', icon: Tag },
  ]

  const systemNav = [
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  return (
    <aside className="admin-sidebar" aria-label="Admin Navigation">
      <div className="admin-sidebar-scroll-container">
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand-row">
            <span className="admin-brand-logo">SENO</span>
            <span className="admin-brand-badge">ADMIN</span>
          </div>
          <p className="admin-sidebar-sublabel">
            Brand Operations & Governance
          </p>
        </div>

        {/* Group 1: Operations */}
        <div className="admin-nav-group">
          <span className="admin-nav-group-title">Operations</span>
          {operationsNav.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Group 2: Finance & Marketing */}
        <div className="admin-nav-group">
          <span className="admin-nav-group-title">Finance & Marketing</span>
          {marketingFinanceNav.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Group 3: System */}
        <div className="admin-nav-group">
          <span className="admin-nav-group-title">System</span>
          {systemNav.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Quick Portal Switcher */}
        <div className="admin-nav-group admin-nav-links-secondary">
          <span className="admin-nav-group-title">Portals</span>
          <Link href="/" className="admin-nav-item-secondary">
            <ArrowUpRight size={15} strokeWidth={1.5} />
            <span>Storefront</span>
          </Link>
          <Link href="/account" className="admin-nav-item-secondary">
            <User size={15} strokeWidth={1.5} />
            <span>My Account</span>
          </Link>
        </div>
      </div>

      {/* Admin Session Footer */}
      <div className="admin-sidebar-footer">
        <div className="admin-profile-pill">
          <div className="admin-profile-avatar">
            <ShieldCheck size={14} color="#fff" />
          </div>
          <div className="admin-profile-info">
            <span className="admin-profile-name">Administrator</span>
            <span className="admin-profile-email" title={adminEmail || 'admin@seno-luxury.com'}>
              {adminEmail || 'admin@seno-luxury.com'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="admin-logout-btn"
            title="Sign out of Admin session"
            aria-label="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}
