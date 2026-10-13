'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Store,
  Package,
  Truck,
  CircleDollarSign,
  Bell,
  HelpCircle,
  Settings,
  Plus,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { NotificationBell } from '@/components/NotificationBell'

export interface SellerNavProps {
  seller: {
    id: string
    store_name: string
    slug: string
    seller_status: string
    commission_rate: number
    contact_email?: string
  }
}

export const SELLER_NAV_ITEMS = [
  { label: 'Home', href: '/seller/dashboard', icon: Store, matchPrefix: false },
  { label: 'My Products', href: '/seller/products', icon: Package, matchPrefix: true },
  { label: 'Orders', href: '/seller/orders', icon: Truck, matchPrefix: true },
  { label: 'Earnings', href: '/seller/earnings', icon: CircleDollarSign, matchPrefix: true },
  { label: 'Notifications', href: '/seller/notifications', icon: Bell, matchPrefix: true },
  { label: 'Help & Support', href: '/seller/help', icon: HelpCircle, matchPrefix: true },
  { label: 'Store Settings', href: '/seller/settings', icon: Settings, matchPrefix: true },
] as const

export function SellerNav({ seller }: SellerNavProps) {
  const pathname = usePathname()

  const isActive = (itemHref: string, matchPrefix: boolean) => {
    if (!matchPrefix) {
      return pathname === itemHref
    }
    return pathname === itemHref || pathname.startsWith(`${itemHref}/`)
  }

  const isApproved = seller.seller_status === 'approved'

  return (
    <header className="seller-desktop-header">
      {/* Top Banner & Quick Controls */}
      <div className="seller-desktop-topbar">
        <div className="seller-desktop-topbar-left">
          <div className="seller-brand-lockup">
            <span className="seller-platform-kicker">SENO SELLER STUDIO</span>
            <div className="seller-store-identity">
              <h1 className="seller-store-heading">{seller.store_name}</h1>
              <span className={`seller-status-chip ${isApproved ? 'chip-approved' : 'chip-pending'}`}>
                {isApproved ? (
                  <>
                    <ShieldCheck size={12} />
                    <span>Verified Partner</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} />
                    <span style={{ textTransform: 'capitalize' }}>{seller.seller_status.replace(/_/g, ' ')}</span>
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="seller-desktop-topbar-right">
          <Link
            href={`/categories`}
            target="_blank"
            rel="noopener noreferrer"
            className="seller-view-store-link"
            title="Browse SENO customer storefront"
          >
            <span>Storefront</span>
            <ExternalLink size={12} />
          </Link>

          <div className="seller-notif-container">
            <NotificationBell />
          </div>

          <Link
            href="/seller/products/new"
            className="button button-primary seller-add-product-btn"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Primary 7-Item Navigation Bar */}
      <nav className="seller-desktop-nav" aria-label="Seller portal navigation">
        <div className="seller-nav-links">
          {SELLER_NAV_ITEMS.map((item) => {
            const active = isActive(item.href, item.matchPrefix)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`seller-nav-tab ${active ? 'active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
