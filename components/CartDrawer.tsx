'use client'

import React from 'react'
import Link from 'next/link'
import { X, Plus, Minus, Trash2 } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'
import { SenoImage } from '@/components/SenoImage'

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, updateCartQty, removeFromCart, subtotal, cartCount, totalWeightGrams } = useStore()

  if (!cartOpen) return null

  const freeShippingThreshold = 1999
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100)

  return (
    <div className="modal-backdrop cart-modal-backdrop" onClick={() => setCartOpen(false)}>
      <aside className="cart-drawer-panel" onClick={e => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div>
            <span className="section-kicker" style={{ margin: 0 }}>YOUR SELECTION</span>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, margin: '4px 0 0' }}>
              CART <span style={{ fontSize: '14px', fontFamily: 'monospace', color: 'var(--muted)', fontWeight: 400 }}>({cartCount})</span>
            </h2>
          </div>
          <button className="close-btn" onClick={() => setCartOpen(false)} aria-label="Close cart">
            <X size={20} />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="cart-empty-state" style={{ padding: '72px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px' }}>
            <span style={{ fontSize: '10.5px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600, marginBottom: '8px' }}>
              CART
            </span>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: 'var(--ink)', margin: '0 0 24px', fontWeight: 400 }}>
              Your selection is currently empty.
            </p>
            <button className="dark-btn" onClick={() => setCartOpen(false)} style={{ padding: '14px 28px', fontSize: '11px', letterSpacing: '1.8px' }}>
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
                  ? '✨ You have unlocked complimentary express delivery across India.'
                  : `Add ${money(freeShippingThreshold - subtotal)} more for complimentary express shipping.`}
              </p>
            </div>

            {/* Cart Items List */}
            <div className="cart-drawer-items">
              {cart.map(item => (
                <div className="cart-item-row" key={item.variant_id}>
                  <div style={{ width: '70px', height: '90px', flexShrink: 0, overflow: 'hidden', background: 'var(--surface-subtle)', borderRadius: '2px' }}>
                    <SenoImage
                      src={item.product.image}
                      alt={item.product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div className="cart-item-info">
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="cart-item-title"
                      onClick={() => setCartOpen(false)}
                      style={{ fontSize: '13px', fontWeight: 500 }}
                    >
                      {item.product.name}
                    </Link>
                    <span className="cart-item-size" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                      Size: {item.size} {item.colour && item.colour !== 'Default' ? `/ ${item.colour}` : ''}
                    </span>
                    <span className="cart-item-price" style={{ fontSize: '12.5px', fontWeight: 600, marginTop: '4px' }}>
                      {money(item.unit_price)}
                    </span>

                    <div className="cart-item-controls" style={{ marginTop: '10px' }}>
                      <div className="quantity-stepper">
                        <button
                          onClick={() => updateCartQty(item.variant_id, -1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span>{item.qty}</span>
                        <button
                          onClick={() => updateCartQty(item.variant_id, 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(item.variant_id)}
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
              <div className="subtotal-row" style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>Estimated Weight</span>
                <span style={{ fontSize: '11.5px', color: 'var(--ink)' }}>{(totalWeightGrams / 1000).toFixed(2)} kg</span>
              </div>
              <div className="subtotal-row">
                <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Subtotal</span>
                <strong style={{ fontSize: '15px' }}>{money(subtotal)}</strong>
              </div>
              <p className="subtotal-note" style={{ fontSize: '11px', color: 'var(--muted)', margin: '6px 0 16px' }}>
                Complimentary packaging. Duties and shipping finalized at checkout.
              </p>
              <Link
                href="/cart"
                className="checkout-btn dark-btn"
                onClick={() => setCartOpen(false)}
                style={{ width: '100%', padding: '16px', fontSize: '11px', letterSpacing: '1.8px' }}
              >
                PROCEED TO CHECKOUT <span>→</span>
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
