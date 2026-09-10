'use client'

import React from 'react'
import Link from 'next/link'
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateCartQty, removeFromCart, subtotal, cartCount } = useStore()

  if (!cartOpen) return null

  const freeShippingThreshold = 1999
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100)

  return (
    <div className="modal-backdrop cart-modal-backdrop" onClick={() => setCartOpen(false)}>
      <aside className="cart-drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div>
            <span className="section-kicker">YOUR CART</span>
            <h2>{cartCount} {cartCount === 1 ? 'item' : 'items'}</h2>
          </div>
          <button className="close-btn" onClick={() => setCartOpen(false)} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty-state">
            <ShoppingBag size={32} strokeWidth={1.5} />
            <p>Your bag is currently empty.</p>
            <button className="dark-btn" onClick={() => setCartOpen(false)}>
              CONTINUE SHOPPING
            </button>
          </div>
        ) : (
          <>
            {/* Free shipping progress */}
            <div className="free-shipping-bar-container">
              <div className="shipping-progress-track">
                <div className="shipping-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="shipping-notice-text">
                {subtotal >= freeShippingThreshold
                  ? '✨ You have unlocked free shipping across India.'
                  : `Add ${money(freeShippingThreshold - subtotal)} more to unlock free shipping.`}
              </p>
            </div>

            {/* Cart Items List */}
            <div className="cart-drawer-items">
              {cart.map(item => (
                <div className="cart-item-row" key={`${item.product.slug}-${item.size}`}>
                  <img src={item.product.image} alt={item.product.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="cart-item-title"
                      onClick={() => setCartOpen(false)}
                    >
                      {item.product.name}
                    </Link>
                    <span className="cart-item-size">Size: {item.size}</span>
                    <span className="cart-item-price">{money(item.product.price)}</span>

                    <div className="cart-item-controls">
                      <div className="quantity-stepper">
                        <button
                          onClick={() => updateCartQty(item.product.slug, item.size, -1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span>{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.product.slug, item.size, 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(item.product.slug, item.size)}
                        aria-label="Remove item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="cart-drawer-footer">
              <div className="subtotal-row">
                <span>Subtotal</span>
                <strong>{money(subtotal)}</strong>
              </div>
              <p className="subtotal-note">Taxes and shipping calculated at checkout.</p>
              <Link
                href="/cart"
                className="checkout-btn dark-btn"
                onClick={() => setCartOpen(false)}
              >
                VIEW BAG & CHECKOUT <span>→</span>
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
