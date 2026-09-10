'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, User, Heart, ShoppingBag, Menu, X } from 'lucide-react'
import { useStore } from '@/context/StoreContext'

export function Header() {
  const pathname = usePathname()
  const {
    cartCount,
    wishlistCount,
    setCartOpen,
    searchOpen,
    setSearchOpen,
    mobileMenuOpen,
    setMobileMenuOpen
  } = useStore()

  const navLinks = [
    { label: 'ALL PRODUCTS', href: '/collections/all' },
    { label: 'NEW ARRIVALS', href: '/collections/new-arrivals' },
    { label: 'TOPWEAR', href: '/collections/topwear' },
    { label: 'BOTTOMWEAR', href: '/collections/bottomwear' },
    { label: 'OUTERWEAR', href: '/collections/outerwear' },
    { label: 'ACCESSORIES', href: '/collections/accessories' },
    { label: 'COLLECTIONS', href: '/collections/all' },
  ]

  return (
    <header className="site-header">
      {/* DESKTOP HEADER */}
      <div className="desktop-header">
        <div className="header-top-row">
          <div className="top-left">
            <button
              className="search-trigger-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Open search"
            >
              <Search size={17} />
              <span>SEARCH</span>
            </button>
          </div>

          <div className="top-center">
            <Link href="/" className="header-logo">
              <span className="logo-wordmark">SENO</span>
              <span className="logo-subtext">STUDIO / 01</span>
            </Link>
          </div>

          <div className="top-right">
            <Link href="/account" className="header-action-btn">
              <User size={17} />
              <span>ACCOUNT</span>
            </Link>

            <Link href="/wishlist" className="header-action-btn">
              <Heart size={17} />
              <span>WISHLIST</span>
              {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
            </Link>

            <button
              className="header-action-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
            >
              <ShoppingBag size={17} />
              <span>CART</span>
              <span className="action-badge">{cartCount}</span>
            </button>
          </div>
        </div>

        <nav className="header-nav-row" aria-label="Main Navigation">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className={`nav-item-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <button
          className="mobile-header-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link href="/" className="header-logo">
          <span className="logo-wordmark">SENO</span>
          <span className="logo-subtext">STUDIO / 01</span>
        </Link>

        <div className="mobile-actions">
          <button
            className="mobile-action-icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search size={19} />
          </button>

          <Link href="/wishlist" className="mobile-action-icon" aria-label="Wishlist">
            <Heart size={19} />
            {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
          </Link>

          <button
            className="mobile-action-icon"
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
          >
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="action-badge">{cartCount}</span>}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DRAWER */}
      {mobileMenuOpen && (
        <div className="mobile-menu-drawer">
          <div className="mobile-menu-inner">
            <div className="mobile-nav-list">
              {navLinks.map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="mobile-nav-item"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mobile-menu-footer">
              <Link href="/account" onClick={() => setMobileMenuOpen(false)}>
                <User size={16} /> Account
              </Link>
              <Link href="/track-order" onClick={() => setMobileMenuOpen(false)}>
                Track Order
              </Link>
              <Link href="/faq" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
