'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, LayoutGrid, Search, Heart, User } from 'lucide-react'
import { useStore } from '@/context/StoreContext'

export function MobileBottomNav() {
  const pathname = usePathname()
  const { wishlistCount, setSearchOpen, searchOpen } = useStore()

  const isHomeActive = pathname === '/'
  const isCollectionsActive = pathname.startsWith('/collections') || pathname.startsWith('/categories')
  const isSearchActive = searchOpen
  const isWishlistActive = pathname === '/wishlist'
  const isAccountActive = pathname.startsWith('/account')

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
        href="/collections/all"
        className={`bottom-nav-item ${isCollectionsActive ? 'active' : ''}`}
        aria-label="Collections"
      >
        <LayoutGrid size={20} strokeWidth={isCollectionsActive ? 2 : 1.5} />
        <span>Collections</span>
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
        href="/wishlist"
        className={`bottom-nav-item ${isWishlistActive ? 'active' : ''}`}
        aria-label="Wishlist"
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Heart size={20} strokeWidth={isWishlistActive ? 2 : 1.5} />
          {wishlistCount > 0 && <span className="bottom-nav-badge">{wishlistCount}</span>}
        </div>
        <span>Wishlist</span>
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
