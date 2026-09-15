'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, PackageCheck, ShoppingBag, ArrowUpRight, ShieldCheck, User } from 'lucide-react'

interface AdminSidebarProps {
  adminEmail?: string
}

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname()

  const navItems = [
    {
      label: 'Overview',
      href: '/admin/dashboard',
      icon: LayoutDashboard
    },
    {
      label: 'Sellers',
      href: '/admin/sellers',
      icon: Store
    },
    {
      label: 'Catalog & Products',
      href: '/admin/products',
      icon: PackageCheck
    },
    {
      label: 'Platform Orders',
      href: '/admin/orders',
      icon: ShoppingBag
    }
  ]

  return (
    <aside className="admin-sidebar">
      <div>
        {/* Branding header */}
        <div className="admin-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              SENO
            </span>
            <span style={{
              fontSize: '9px',
              letterSpacing: '1px',
              padding: '2px 6px',
              background: 'var(--ink)',
              color: '#ffffff',
              borderRadius: '2px',
              fontWeight: 600
            }}>
              ADMIN
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.5px' }}>
            Marketplace Control Plane
          </p>
        </div>

        {/* Navigation items */}
        <nav className="admin-sidebar-nav" aria-label="Admin Navigation">
          <span className="admin-nav-section-title">Operations</span>
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link ${isActive ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                  <span>{item.label}</span>
                </div>
              </Link>
            )
          })}

          <div style={{ height: '1px', background: 'var(--border)', margin: '16px 12px' }} />

          <span className="admin-nav-section-title">Navigation</span>
          <Link
            href="/"
            className="admin-nav-link"
            style={{ color: 'var(--muted)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ArrowUpRight size={16} strokeWidth={1.6} />
              <span>Public Storefront</span>
            </div>
          </Link>
          <Link
            href="/account"
            className="admin-nav-link"
            style={{ color: 'var(--muted)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={16} strokeWidth={1.6} />
              <span>Personal Account</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* Footer / Session indicator */}
      <div className="admin-sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={14} color="var(--ink)" />
          <div style={{ fontSize: '11px', lineHeight: 1.3, overflow: 'hidden' }}>
            <span style={{ fontWeight: 600, display: 'block' }}>Verified Administrator</span>
            <span style={{ color: 'var(--muted)', fontSize: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
              {adminEmail || 'admin@seno-luxury.com'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}
