'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'
import { fetchActiveShippingConfig, calculateShippingFee, DEFAULT_SHIPPING_SETTINGS, ShippingSettings, ShippingWeightRule } from '@/lib/shipping'
import { SenoImage } from '@/components/SenoImage'

export default function CartPage() {
  const { cart, updateCartQty, removeFromCart, subtotal, cartCount, totalWeightGrams } = useStore()
  const [shippingConfig, setShippingConfig] = useState<{ settings: ShippingSettings; rules: ShippingWeightRule[] }>({
    settings: DEFAULT_SHIPPING_SETTINGS,
    rules: []
  })

  useEffect(() => {
    fetchActiveShippingConfig().then(setShippingConfig)
  }, [])

  const freeShippingThreshold = shippingConfig.settings.free_shipping_threshold ?? 1999
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100)
  const shippingFee = calculateShippingFee(subtotal, totalWeightGrams, shippingConfig.settings, shippingConfig.rules)
  const estimatedTotal = subtotal + shippingFee

  return (
    <main className="static-page-container">
      <Link href="/collections/all" className="breadcrumb-back-link">
        <ArrowLeft size={13} /> CONTINUE SHOPPING
      </Link>

      <span className="section-kicker">YOUR SENO BAG</span>
      <h1 className="static-page-title">Shopping Cart</h1>

      {cart.length === 0 ? (
        <div style={{ borderTop: '1px solid var(--line)', padding: '70px 0', textAlign: 'center' }}>
          <ShoppingBag size={42} strokeWidth={1.2} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '24px' }}>Your shopping bag is currently empty.</p>
          <Link href="/collections/all" className="dark-btn" style={{ padding: '14px 28px' }}>
            EXPLORE COLLECTION
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '48px', marginTop: '32px' }}>
          {/* Cart Table */}
          <div>
            <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
              <span className="free-shipping-notice">
                {subtotal >= freeShippingThreshold
                  ? '✨ You qualify for free shipping across India.'
                  : `Add ${money(freeShippingThreshold - subtotal)} more to qualify for free shipping.`}
              </span>
              <div className="shipping-progress-track" style={{ marginTop: '10px' }}>
                <div className="shipping-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            {cart.map(item => (
              <div
                key={item.variant_id}
                style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '24px 0',
                  borderBottom: '1px solid var(--soft)'
                }}
              >
                <div style={{ width: '90px', aspectRatio: '3/4', flexShrink: 0, overflow: 'hidden', borderRadius: '2px', background: 'var(--surface-subtle)' }}>
                  <SenoImage
                    src={item.product.image}
                    alt={item.product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Link
                    href={`/products/${item.product.slug}`}
                    style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}
                  >
                    {item.product.name}
                  </Link>
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                    Category: {item.product.category} | Size: {item.size} {item.colour && item.colour !== 'Default' ? `| Colour: ${item.colour}` : ''}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                    {money(item.unit_price)}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div className="quantity-stepper-box">
                      <button onClick={() => updateCartQty(item.variant_id, -1)}>
                        <Minus size={13} />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateCartQty(item.variant_id, 1)}>
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.variant_id)}
                      style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cart Summary */}
          <div style={{ background: 'var(--soft)', padding: '28px', height: 'fit-content' }}>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, margin: '0 0 20px' }}>
              Order Summary
            </h3>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
              <span>Items ({cartCount})</span>
              <span>{money(subtotal)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
              <span>Total Weight</span>
              <span>{(totalWeightGrams / 1000).toFixed(2)} kg</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '20px' }}>
              <span>Estimated Shipping</span>
              <span>{shippingFee === 0 ? 'FREE' : money(shippingFee)}</span>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--line)',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '24px'
              }}
            >
              <span>Estimated Total</span>
              <span>{money(estimatedTotal)}</span>
            </div>

            <Link
              href="/checkout"
              className="dark-btn"
              style={{ display: 'block', width: '100%', padding: '16px', fontSize: '10px', letterSpacing: '2px', textAlign: 'center' }}
            >
              PROCEED TO CHECKOUT <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
