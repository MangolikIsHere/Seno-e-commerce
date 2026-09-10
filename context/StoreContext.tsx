'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Product, catalog } from '@/lib/catalog'

export interface CartItem {
  product: Product
  size: string
  qty: number
}

interface StoreContextType {
  cart: CartItem[]
  wishlist: string[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  addToCart: (product: Product, size?: string, qty?: number) => void
  removeFromCart: (slug: string, size: string) => void
  updateCartQty: (slug: string, size: string, delta: number) => void
  toggleWishlist: (slug: string) => void
  isWishlisted: (slug: string) => boolean
  cartCount: number
  wishlistCount: number
  subtotal: number
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('seno_cart')
      if (savedCart) {
        const parsed = JSON.parse(savedCart)
        if (Array.isArray(parsed)) setCart(parsed)
      }
      const savedWishlist = localStorage.getItem('seno_wishlist')
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist)
        if (Array.isArray(parsed)) setWishlist(parsed)
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('seno_cart', JSON.stringify(cart))
    } catch {
      // Ignore localStorage write errors
    }
  }, [cart])

  useEffect(() => {
    try {
      localStorage.setItem('seno_wishlist', JSON.stringify(wishlist))
    } catch {
      // Ignore localStorage write errors
    }
  }, [wishlist])

  const addToCart = (product: Product, size?: string, qty = 1) => {
    if (product.soldOut) return
    const chosenSize = size || product.sizes[0] || 'M'

    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.slug === product.slug && item.size === chosenSize
      )
      if (existingIndex > -1) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + qty
        }
        return updated
      }
      return [...prev, { product, size: chosenSize, qty }]
    })
    setCartOpen(true)
  }

  const removeFromCart = (slug: string, size: string) => {
    setCart(prev => prev.filter(item => !(item.product.slug === slug && item.size === size)))
  }

  const updateCartQty = (slug: string, size: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.product.slug === slug && item.size === size) {
            const newQty = item.qty + delta
            return newQty > 0 ? { ...item, qty: newQty } : null
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    )
  }

  const toggleWishlist = (slug: string) => {
    setWishlist(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    )
  }

  const isWishlisted = (slug: string) => wishlist.includes(slug)

  const cartCount = cart.reduce((total, item) => total + item.qty, 0)
  const wishlistCount = wishlist.length
  const subtotal = cart.reduce((total, item) => total + item.product.price * item.qty, 0)

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        cartOpen,
        setCartOpen,
        mobileMenuOpen,
        setMobileMenuOpen,
        searchOpen,
        setSearchOpen,
        addToCart,
        removeFromCart,
        updateCartQty,
        toggleWishlist,
        isWishlisted,
        cartCount,
        wishlistCount,
        subtotal
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}
