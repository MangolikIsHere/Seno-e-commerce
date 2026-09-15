'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { Product, Variant } from '@/lib/catalog'
import { fetchUserWishlistIds, addProductToWishlist, removeProductFromWishlist } from '@/lib/wishlist'
import { useAuth } from './AuthContext'

export interface CartItem {
  product: Product
  variant_id: string
  seller_id: string
  sku: string
  unit_price: number
  unit_weight_grams: number
  size: string
  colour: string
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
  addToCart: (product: Product, variant: Variant, qty?: number) => void
  removeFromCart: (variant_id: string) => void
  updateCartQty: (variant_id: string, delta: number) => void
  clearCart: () => void
  clearOrderedItems: (variant_ids: string[]) => void
  toggleWishlist: (slug: string) => void
  isWishlisted: (slug: string) => boolean
  cartCount: number
  wishlistCount: number
  subtotal: number
  totalWeightGrams: number
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<string[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { user } = useAuth()

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('seno_cart')
      if (savedCart) {
        const parsed = JSON.parse(savedCart)
        if (Array.isArray(parsed)) setCart(parsed)
      }
      
      if (!user) {
        const savedWishlist = localStorage.getItem('seno_wishlist')
        if (savedWishlist) {
          const parsed = JSON.parse(savedWishlist)
          if (Array.isArray(parsed)) setWishlist(parsed)
        }
      }
    } catch {
      // Ignore localStorage read errors
    }
  }, [user])

  // Sync wishlist from DB if authenticated
  useEffect(() => {
    if (user) {
      fetchUserWishlistIds(user.id).then(ids => {
        setWishlist(ids)
      })
    }
  }, [user])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('seno_cart', JSON.stringify(cart))
    } catch {
      // Ignore localStorage write errors
    }
  }, [cart])

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('seno_wishlist', JSON.stringify(wishlist))
      } catch {
        // Ignore localStorage write errors
      }
    }
  }, [wishlist, user])

  const addToCart = (product: Product, variant: Variant, qty = 1) => {
    if (variant.inventoryQuantity < qty) return

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.variant_id === variant.id)
      
      if (existingIndex > -1) {
        const updated = [...prev]
        const newQty = updated[existingIndex].qty + qty
        if (newQty > variant.inventoryQuantity) return prev // block adding beyond stock
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: newQty
        }
        return updated
      }
      
      const price = variant.priceOverride ?? product.price
      const weight = variant.weightGramsOverride ?? product.defaultWeightGrams
      
      return [...prev, {
        product,
        variant_id: variant.id,
        seller_id: product.seller_id,
        sku: variant.sku,
        unit_price: price,
        unit_weight_grams: weight,
        size: variant.size,
        colour: variant.colour,
        qty
      }]
    })
    setCartOpen(true)
  }

  const removeFromCart = (variant_id: string) => {
    setCart(prev => prev.filter(item => item.variant_id !== variant_id))
  }

  const updateCartQty = (variant_id: string, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.variant_id === variant_id) {
            const newQty = item.qty + delta
            return newQty > 0 ? { ...item, qty: newQty } : null
          }
          return item
        })
        .filter((item): item is CartItem => item !== null)
    )
  }

  const clearCart = () => {
    setCart([])
  }

  const clearOrderedItems = (variant_ids: string[]) => {
    setCart(prev => prev.filter(item => !variant_ids.includes(item.variant_id)))
  }

  const toggleWishlist = async (slug: string) => {
    setWishlist(prev => {
      const isCurrentlyWishlisted = prev.includes(slug)
      
      if (user) {
        // Background DB sync
        if (isCurrentlyWishlisted) {
          removeProductFromWishlist(user.id, slug)
        } else {
          addProductToWishlist(user.id, slug)
        }
      }
      
      return isCurrentlyWishlisted ? prev.filter(s => s !== slug) : [...prev, slug]
    })
  }

  const isWishlisted = (slug: string) => wishlist.includes(slug)

  const cartCount = cart.reduce((total, item) => total + item.qty, 0)
  const wishlistCount = wishlist.length
  const subtotal = cart.reduce((total, item) => total + (item.unit_price * item.qty), 0)
  const totalWeightGrams = cart.reduce((total, item) => total + (item.unit_weight_grams * item.qty), 0)

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
        clearCart,
        clearOrderedItems,
        toggleWishlist,
        isWishlisted,
        cartCount,
        wishlistCount,
        subtotal,
        totalWeightGrams
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
