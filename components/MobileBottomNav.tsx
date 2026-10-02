'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Search, ShoppingBag, User } from 'lucide-react'
import { useStore } from '@/context/StoreContext'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { cartCount, setSearchOpen, searchOpen } = useStore()

  const isHomeActive = pathname === '/'
  const isCategoriesActive =
    pathname === '/categories' ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/collections') ||
    pathname.startsWith('/catalog')
  const isSearchActive = searchOpen
  const isCartActive = pathname === '/cart' || pathname.startsWith('/cart') || pathname.startsWith('/checkout')
  const isAccountActive = pathname.startsWith('/account') || pathname.startsWith('/orders')

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Bottom Navigation">
      <Link
        href="/"
        className={`bottom-nav-item ${isHomeActive ? 'active' : ''}`}
        aria-label="Home"
      >
        <Home size={20} strokeWidth={isHomeActive ? 2 : 1.5} />
        <span>Home</span>
      </Link>

      <Link
        href="/categories"
        className={`bottom-nav-item ${isCategoriesActive ? 'active' : ''}`}
        aria-label="Categories"
      >
        <LayoutGrid size={20} strokeWidth={isCategoriesActive ? 2 : 1.5} />
        <span>Categories</span>
      </Link>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className={`bottom-nav-item ${isSearchActive ? 'active' : ''}`}
        aria-label="Search"
      >
        <Search size={20} strokeWidth={isSearchActive ? 2 : 1.5} />
        <span>Search</span>
      </button>

      <Link
        href="/cart"
        className={`bottom-nav-item ${isCartActive ? 'active' : ''}`}
        aria-label="Cart"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ShoppingBag size={20} strokeWidth={isCartActive ? 2 : 1.5} />
          {cartCount > 0 && <span className="bottom-nav-badge">{cartCount}</span>}
        </div>
        <span>Cart</span>
      </Link>

      <Link
        href="/account"
        className={`bottom-nav-item ${isAccountActive ? 'active' : ''}`}
        aria-label="Account"
      >
        <User size={20} strokeWidth={isAccountActive ? 2 : 1.5} />
        <span>Account</span>
      </Link>
    </nav>
  )
}
