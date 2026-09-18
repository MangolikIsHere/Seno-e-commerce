'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, User, Heart, ShoppingBag, Menu, X, ArrowRight } from 'lucide-react'
import { useStore } from '@/context/StoreContext'

export function Header({ categories = [] }: { categories?: { name: string; slug: string }[] }) {
  const pathname = usePathname()
  const {
    cartCount,
    wishlistCount,
    setCartOpen,
    setSearchOpen,
    mobileMenuOpen,
    setMobileMenuOpen
  } = useStore()

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const categoryLinks = categories.map(category => ({
    label: category.name.toUpperCase(),
    href: `/collections/${category.slug}`
  }))
  const navLinks = [
    { label: 'ALL PRODUCTS', href: '/collections/all' },
    { label: 'NEW ARRIVALS', href: '/collections/new-arrivals' },
    ...categoryLinks,
    { label: 'COLLECTIONS', href: '/collections/all' },
  ]

  const shopLinks = [
    { label: 'All Products', href: '/collections/all' },
    { label: 'New Arrivals', href: '/collections/new-arrivals' },
    ...categoryLinks.map(category => ({ label: category.label, href: category.href })),
    { label: 'Collections', href: '/collections/all' },
  ]

  const accountLinks = [
    { label: 'Account Overview', href: '/account' },
    { label: 'Wishlist', href: '/wishlist' },
    { label: 'Shopping Cart', href: '/cart' },
  ]

  const helpLinks = [
    { label: 'Contact SENO', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Shipping Policy', href: '/shipping' },
    { label: 'Returns & Exchanges', href: '/returns' },
    { label: 'Track Order', href: '/track-order' },
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
              <span className="logo-subtext">EVERYDAY, ELEVATED.</span>
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

      {/* MOBILE HEADER (Left: Menu, Search | Center: SENO | Right: Account, Wishlist, Cart) */}
      <div className="mobile-header">
        <div className="mobile-header-left">
          <button
            className="mobile-icon-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <button
            className="mobile-icon-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <Search size={19} />
          </button>
        </div>

        <div className="mobile-header-center">
          <Link href="/" className="header-logo">
            <span className="logo-wordmark">SENO</span>
            <span className="logo-subtext">EVERYDAY, ELEVATED.</span>
          </Link>
        </div>

        <div className="mobile-header-right">
          <Link href="/account" className="mobile-icon-btn" aria-label="Account">
            <User size={19} />
          </Link>

          <Link href="/wishlist" className="mobile-icon-btn" aria-label="Wishlist">
            <Heart size={19} />
            {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
          </Link>

          <button
            className="mobile-icon-btn"
            onClick={() => setCartOpen(true)}
            aria-label="Cart"
          >
            <ShoppingBag size={19} />
            <span className="action-badge">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* MOBILE MENU DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <aside className="mobile-menu-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <Link href="/" onClick={() => setMobileMenuOpen(false)} className="header-logo">
                <span className="logo-wordmark">SENO</span>
                <span className="logo-subtext">EVERYDAY, ELEVATED.</span>
              </Link>
              <button
                className="mobile-drawer-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={22} />
              </button>
            </div>

            <div className="mobile-drawer-content">
              {/* SHOP SECTION */}
              <div className="mobile-drawer-section">
                <span className="mobile-section-kicker">SHOP</span>
                <div className="mobile-drawer-links">
                  {shopLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      className="mobile-drawer-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={14} className="mobile-arrow" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* ACCOUNT SECTION */}
              <div className="mobile-drawer-section">
                <span className="mobile-section-kicker">ACCOUNT</span>
                <div className="mobile-drawer-links">
                  {accountLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      className="mobile-drawer-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={14} className="mobile-arrow" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* HELP SECTION */}
              <div className="mobile-drawer-section">
                <span className="mobile-section-kicker">HELP & SUPPORT</span>
                <div className="mobile-drawer-links">
                  {helpLinks.map((item, idx) => (
                    <Link
                      key={idx}
                      href={item.href}
                      className="mobile-drawer-link"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span>{item.label}</span>
                      <ArrowRight size={14} className="mobile-arrow" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* ABOUT SECTION */}
              <div className="mobile-drawer-section" style={{ borderBottom: 0 }}>
                <span className="mobile-section-kicker">ABOUT</span>
                <div className="mobile-drawer-links">
                  <Link
                    href="/about"
                    className="mobile-drawer-link"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>About SENO Studio</span>
                    <ArrowRight size={14} className="mobile-arrow" />
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </header>
  )
}
