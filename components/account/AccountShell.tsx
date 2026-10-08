'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ShoppingBag,
  Heart,
  MapPin,
  User,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  LayoutDashboard,
  ShieldCheck,
  Store,
  ArrowUpRight
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useStore } from '@/context/StoreContext'
import { useNotifications } from '@/context/NotificationContext'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface AccountShellProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
}

export function AccountShell({ children, title, subtitle }: AccountShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useAuth()
  const { wishlist } = useStore()
  const { unreadCount } = useNotifications()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/account')
    router.refresh()
  }

  const accountNavItems = [
    { label: 'Overview', href: '/account', icon: LayoutDashboard },
    { label: 'Orders & Purchases', href: '/account/orders', icon: ShoppingBag },
    { label: 'Saved Wishlist', href: '/wishlist', icon: Heart, badge: wishlist.length > 0 ? wishlist.length : undefined },
    { label: 'Saved Addresses', href: '/account/addresses', icon: MapPin },
    { label: 'Notifications', href: '/account/notifications', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
    { label: 'Security & Sign-in', href: '/account/update-password', icon: Shield },
    { label: 'Concierge & Help', href: '/contact', icon: HelpCircle },
  ]

  return (
    <div className="account-shell-root">
      {/* Account Shell Hero Header */}
      <div className="account-shell-banner">
        <div className="account-shell-banner-inner">
          <div className="account-shell-greeting">
            <span className="account-shell-kicker">CLIENT SUITE</span>
            <h1 className="account-shell-title">
              {title || (profile?.full_name ? `Welcome back, ${profile.full_name}` : 'Welcome back')}
            </h1>
            <p className="account-shell-subtitle">
              {subtitle || profile?.email || 'Manage your SENO orders, personal preferences, and client privileges.'}
            </p>
          </div>

          {/* Quick Role Elevation Switcher */}
          <div className="account-shell-actions">
            {profile?.role === 'admin' && (
              <Link href="/admin/dashboard" className="button button-primary" style={{ fontSize: '12px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} />
                <span>Admin Console</span>
                <ArrowUpRight size={13} />
              </Link>
            )}

            {profile?.role === 'reseller' && (
              <Link href="/seller/dashboard" className="button button-primary" style={{ fontSize: '12px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Store size={14} />
                <span>Seller Portal</span>
                <ArrowUpRight size={13} />
              </Link>
            )}

            {profile?.role === 'customer' && (
              <Link href="/seller/register" className="button button-outline" style={{ fontSize: '12px', padding: '8px 14px' }}>
                Sell with SENO
              </Link>
            )}

            <button
              onClick={handleSignOut}
              className="button button-ghost"
              style={{ fontSize: '12px', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              title="Sign out of account"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout (Desktop) / Clean Flow (Mobile) */}
      <div className="account-shell-layout">
        {/* Left Navigation Bar (Desktop) */}
        <aside className="account-shell-sidebar" aria-label="Account Navigation">
          <div className="account-nav-list">
            {accountNavItems.map(item => {
              const Icon = item.icon
              const isExact = pathname === item.href
              const isParent = item.href !== '/account' && pathname.startsWith(item.href)
              const isActive = isExact || isParent

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`account-nav-item ${isActive ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="account-nav-badge">{item.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="account-sidebar-brand-card">
            <span className="account-sidebar-brand-tag">SENO CONCIERGE</span>
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
              For bespoke sizing assistance or courier inquiries, our client team is at your disposal.
            </p>
            <Link href="/contact" style={{ display: 'inline-block', marginTop: '10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--ink)' }}>
              Contact Concierge →
            </Link>
          </div>
        </aside>

        {/* Right Content Area */}
        <div className="account-shell-content">
          {children}
        </div>
      </div>
    </div>
  )
}
