'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
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
  User,
  ShieldCheck,
  LogOut
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

interface AdminMobileNavProps {
  adminEmail?: string
}

export function AdminMobileNav({ adminEmail }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/account')
    router.refresh()
  }

  const navGroups = [
    {
      title: 'Operations',
      items: [
        { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
        { label: 'Products', href: '/admin/products', icon: PackageCheck },
        { label: 'Categories', href: '/admin/categories', icon: Layers },
        { label: 'Sellers', href: '/admin/sellers', icon: Store },
        { label: 'Customers', href: '/admin/customers', icon: Users },
      ]
    },
    {
      title: 'Finance & Marketing',
      items: [
        { label: 'Payments & Refunds', href: '/admin/payments', icon: CreditCard },
        { label: 'Offers & Promotions', href: '/admin/promotions', icon: Tag },
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'Settings', href: '/admin/settings', icon: Settings },
      ]
    }
  ]

  // Get active section name for top bar
  const getActiveSectionLabel = () => {
    if (pathname.includes('/admin/orders')) return 'Orders'
    if (pathname.includes('/admin/products')) return 'Products'
    if (pathname.includes('/admin/categories')) return 'Categories'
    if (pathname.includes('/admin/sellers')) return 'Sellers'
    if (pathname.includes('/admin/customers')) return 'Customers'
    if (pathname.includes('/admin/payments')) return 'Payments'
    if (pathname.includes('/admin/promotions')) return 'Offers'
    if (pathname.includes('/admin/settings')) return 'Settings'
    return 'Overview'
  }

  return (
    <div className="admin-mobile-header-wrapper">
      <header className="admin-mobile-header">
        <div className="admin-mobile-header-brand">
          <Link href="/admin/dashboard" className="admin-mobile-brand-link">
            <span className="admin-brand-logo">SENO</span>
            <span className="admin-brand-badge">ADMIN</span>
          </Link>
          <span className="admin-mobile-header-separator">/</span>
          <span className="admin-mobile-header-title">{getActiveSectionLabel()}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="admin-mobile-menu-trigger"
          aria-label={isOpen ? 'Close menu' : 'Open admin navigation'}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="admin-mobile-menu-label">{isOpen ? 'CLOSE' : 'MENU'}</span>
        </button>
      </header>

      {/* Slide-out Sheet Drawer */}
      <div
        className={`admin-mobile-drawer-backdrop ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      />

      <aside className={`admin-mobile-drawer ${isOpen ? 'open' : ''}`} aria-label="Admin Navigation Drawer">
        <div className="admin-mobile-drawer-header">
          <div className="admin-sidebar-brand-row">
            <span className="admin-brand-logo">SENO</span>
            <span className="admin-brand-badge">ADMIN</span>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="admin-mobile-drawer-close"
            aria-label="Close admin menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="admin-mobile-drawer-content">
          {navGroups.map(group => (
            <div key={group.title} className="admin-mobile-drawer-group">
              <span className="admin-mobile-group-title">{group.title}</span>
              <div className="admin-mobile-group-list">
                {group.items.map(item => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`admin-mobile-nav-link ${isActive ? 'active' : ''}`}
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Quick Portals */}
          <div className="admin-mobile-drawer-group">
            <span className="admin-mobile-group-title">Portals</span>
            <div className="admin-mobile-group-list">
              <Link
                href="/"
                className="admin-mobile-nav-link"
                onClick={() => setIsOpen(false)}
              >
                <ArrowUpRight size={18} />
                <span>Storefront</span>
              </Link>
              <Link
                href="/account"
                className="admin-mobile-nav-link"
                onClick={() => setIsOpen(false)}
              >
                <User size={18} />
                <span>My Account</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Drawer Footer with Admin details & Logout */}
        <div className="admin-mobile-drawer-footer">
          <div className="admin-profile-pill">
            <div className="admin-profile-avatar">
              <ShieldCheck size={14} color="#fff" />
            </div>
            <div className="admin-profile-info">
              <span className="admin-profile-name">Administrator</span>
              <span className="admin-profile-email">{adminEmail || 'admin@seno-luxury.com'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="admin-mobile-logout-button"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </div>
  )
}
