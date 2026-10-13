'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Store,
  Package,
  Truck,
  CircleDollarSign,
  Bell,
  HelpCircle,
  Settings,
  Plus,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  LogOut
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'
import { useNotifications } from '@/context/NotificationContext'
import { createClient } from '@/utils/supabase/client'
import { SELLER_NAV_ITEMS, SellerNavProps } from './SellerNav'

export function SellerMobileNav({ seller }: SellerNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { unreadCount } = useNotifications()

  // Close drawer on path change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/account/login')
    router.refresh()
  }

  const isApproved = seller.seller_status === 'approved'

  const isActive = (itemHref: string, matchPrefix: boolean) => {
    if (!matchPrefix) return pathname === itemHref
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`)
  }

  return (
    <>
      {/* 1. Mobile Top Header Bar */}
      <header className="seller-mobile-topbar">
        <div className="seller-mobile-topbar-content">
          <div className="seller-mobile-store-info">
            <span className="seller-mobile-kicker">SELLER STUDIO</span>
            <div className="seller-mobile-title-row">
              <h1 className="seller-mobile-store-name">{seller.store_name}</h1>
              <span className={`seller-status-chip seller-status-chip-sm ${isApproved ? 'chip-approved' : 'chip-pending'}`}>
                {isApproved ? 'Verified' : seller.seller_status}
              </span>
            </div>
          </div>

          <div className="seller-mobile-topbar-actions">
            <NotificationBell isMobile />
            <button
              type="button"
              className="seller-mobile-menu-btn"
              onClick={() => setDrawerOpen(!drawerOpen)}
              aria-label={drawerOpen ? 'Close seller navigation' : 'Open seller navigation'}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Mobile Slide-Out Navigation Drawer */}
      {drawerOpen && (
        <div className="seller-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <nav
            className="seller-drawer-content"
            onClick={(e) => e.stopPropagation()}
            aria-label="Mobile seller menu"
          >
            <div className="seller-drawer-header">
              <div>
                <span className="seller-platform-kicker">SENO SELLER STUDIO</span>
                <strong className="seller-drawer-store-name">{seller.store_name}</strong>
                <span className="seller-drawer-store-slug">seno-luxury.com/{seller.slug}</span>
              </div>
              <button
                type="button"
                className="seller-drawer-close-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>

            <div className="seller-drawer-actions">
              <Link
                href="/seller/products/new"
                className="button button-primary seller-drawer-add-btn"
                onClick={() => setDrawerOpen(false)}
              >
                <Plus size={15} />
                <span>Add New Product</span>
              </Link>
            </div>

            <div className="seller-drawer-nav-list">
              <span className="seller-drawer-section-label">MAIN SECTIONS</span>
              {SELLER_NAV_ITEMS.map((item) => {
                const active = isActive(item.href, item.matchPrefix)
                const Icon = item.icon
                const isNotif = item.href === '/seller/notifications'
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`seller-drawer-item ${active ? 'active' : ''}`}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <div className="seller-drawer-item-left">
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </div>
                    <div className="seller-drawer-item-right">
                      {isNotif && unreadCount > 0 && (
                        <span className="seller-drawer-badge">{unreadCount}</span>
                      )}
                      <ChevronRight size={14} color="var(--muted)" />
                    </div>
                  </Link>
                )
              })}
            </div>

            <div className="seller-drawer-footer">
              <Link
                href="/categories"
                target="_blank"
                rel="noopener noreferrer"
                className="seller-drawer-sublink"
                onClick={() => setDrawerOpen(false)}
              >
                <ExternalLink size={14} />
                <span>Customer Storefront</span>
              </Link>

              <button
                type="button"
                className="seller-drawer-sublink seller-drawer-signout-btn"
                onClick={handleSignOut}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* 3. Mobile Pinned Bottom Navigation Bar */}
      <nav className="seller-mobile-bottom-bar" aria-label="Quick seller navigation">
        <Link
          href="/seller/dashboard"
          className={`seller-bottom-nav-item ${pathname === '/seller/dashboard' ? 'active' : ''}`}
        >
          <Store size={18} />
          <span>Home</span>
        </Link>

        <Link
          href="/seller/products"
          className={`seller-bottom-nav-item ${pathname.startsWith('/seller/products') ? 'active' : ''}`}
        >
          <Package size={18} />
          <span>Products</span>
        </Link>

        <Link
          href="/seller/orders"
          className={`seller-bottom-nav-item ${pathname.startsWith('/seller/orders') ? 'active' : ''}`}
        >
          <Truck size={18} />
          <span>Orders</span>
        </Link>

        <Link
          href="/seller/notifications"
          className={`seller-bottom-nav-item ${pathname.startsWith('/seller/notifications') ? 'active' : ''}`}
        >
          <div className="seller-bottom-icon-wrap">
            <Bell size={18} />
            {unreadCount > 0 && <span className="seller-bottom-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </div>
          <span>Alerts</span>
        </Link>

        <button
          type="button"
          className={`seller-bottom-nav-item ${drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen(true)}
          aria-label="More seller options"
        >
          <Menu size={18} />
          <span>More</span>
        </button>
      </nav>
    </>
  )
}
