'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, Plus, Minus, Trash2, ArrowLeft, Tag } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'
import { fetchActiveShippingConfig, calculateShippingForLines, DEFAULT_SHIPPING_SETTINGS, ShippingSettings, ShippingWeightRule } from '@/lib/shipping'
import { SenoImage } from '@/components/SenoImage'
import { evaluateCartDiscount } from '@/lib/promotions'
import { PromotionEvaluationResult } from '@/lib/promotions-shared'

export default function CartPage() {
  const {
    cart,
    updateCartQty,
    removeFromCart,
    subtotal,
    cartCount,
    totalWeightGrams,
    appliedCouponCode,
    setAppliedCouponCode
  } = useStore()
  const [shippingConfig, setShippingConfig] = useState<{ settings: ShippingSettings; rules: ShippingWeightRule[] }>({
    settings: DEFAULT_SHIPPING_SETTINGS,
    rules: []
  })
  const [promoResult, setPromoResult] = useState<PromotionEvaluationResult | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)

  useEffect(() => {
    fetchActiveShippingConfig().then(setShippingConfig)
  }, [])

  const freeShippingThreshold = shippingConfig.settings.free_shipping_threshold ?? 1999
  const progressPercent = Math.min(100, (subtotal / freeShippingThreshold) * 100)
  const rawShippingFee = calculateShippingForLines(subtotal, cart.map(item => ({
    quantity: item.qty,
    unitWeightGrams: item.unit_weight_grams || item.product?.defaultWeightGrams || 500,
    shippingMethod: item.shipping_method || item.product?.shippingMethod || (item.product as any)?.shipping_method || 'weight_based',
    customDeliveryCharge: item.custom_delivery_charge !== undefined
      ? item.custom_delivery_charge
      : (item.product?.customDeliveryCharge !== undefined ? item.product.customDeliveryCharge : (item.product as any)?.custom_delivery_charge)
  })), shippingConfig.settings, shippingConfig.rules)

  useEffect(() => {
    if (cart.length > 0) {
      evaluateCartDiscount({ cart, promotionCode: appliedCouponCode, shippingFee: rawShippingFee })
        .then(res => {
          setPromoResult(res)
          if (res.status === 'ineligible' && appliedCouponCode) {
            setCouponError(res.message)
          } else {
            setCouponError(null)
          }
        })
        .catch(() => setPromoResult(null))
    } else {
      setPromoResult(null)
    }
  }, [cart, appliedCouponCode, rawShippingFee])

  const finalDiscount = promoResult?.discountAmount || 0
  const finalShipping = promoResult?.isFreeShipping ? 0 : rawShippingFee
  const estimatedTotal = Math.max(0, subtotal - finalDiscount) + finalShipping

  return (
    <main className="static-page-container">
      <Link href="/collections/all" className="breadcrumb-back-link" style={{ minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}>
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
        <div className="cart-layout">
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

            {promoResult && promoResult.message && (
              <div
                style={{
                  background: promoResult.status === 'applied' ? '#f4fbf4' : '#fafafa',
                  border: `1px solid ${promoResult.status === 'applied' ? '#c8e6c9' : 'var(--border)'}`,
                  padding: '12px 16px',
                  margin: '14px 0',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  fontSize: '12.5px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tag size={14} color={promoResult.status === 'applied' ? '#2e7d32' : 'var(--ink)'} />
                  <span style={{ color: promoResult.status === 'applied' ? '#1b5e20' : 'var(--ink)', fontWeight: 500, flex: 1 }}>
                    {promoResult.message}
                  </span>
                </div>
                {promoResult.status === 'threshold_not_met' && promoResult.appliedPromotion && (
                  <Link
                    href={`/offers/${promoResult.appliedPromotion.slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      textDecoration: 'underline',
                      marginTop: '2px'
                    }}
                  >
                    SHOP ELIGIBLE ITEMS →
                  </Link>
                )}
              </div>
            )}

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
                    <div className="quantity-stepper-box" style={{ display: 'flex', alignItems: 'center' }}>
                      <button onClick={() => updateCartQty(item.variant_id, -1)} style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Minus size={13} />
                      </button>
                      <span style={{ minWidth: '32px', textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateCartQty(item.variant_id, 1)} style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(item.variant_id)}
                      style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', minHeight: '44px', padding: '0 8px' }}
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

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
              <span>Estimated Shipping</span>
              <span>{finalShipping === 0 ? 'FREE' : money(finalShipping)}</span>
            </div>

            {finalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: '#2e7d32' }}>
                <span>{promoResult?.appliedPromotion?.name || 'Promotion Discount'}</span>
                <strong>-{money(finalDiscount)}</strong>
              </div>
            )}

            {/* Promo Code Input Box */}
            <div style={{ margin: '16px 0 18px', borderTop: '1px solid var(--line)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="PROMO CODE"
                  value={appliedCouponCode || couponInput}
                  disabled={!!appliedCouponCode}
                  onChange={e => {
                    setCouponInput(e.target.value.toUpperCase())
                    setCouponError(null)
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    background: appliedCouponCode ? '#f5f5f5' : '#fff'
                  }}
                />
                {appliedCouponCode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCouponCode(null)
                      setCouponInput('')
                      setCouponError(null)
                    }}
                    style={{
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid var(--border)',
                      fontSize: '10px',
                      letterSpacing: '1px',
                      cursor: 'pointer'
                    }}
                  >
                    REMOVE
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!couponInput.trim()) return
                      setAppliedCouponCode(couponInput.trim().toUpperCase())
                    }}
                    style={{
                      padding: '8px 14px',
                      background: 'var(--ink)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '10px',
                      letterSpacing: '1px',
                      cursor: 'pointer'
                    }}
                  >
                    APPLY
                  </button>
                )}
              </div>
              {couponError && (
                <p style={{ color: '#d32f2f', fontSize: '11px', margin: '6px 0 0' }}>{couponError}</p>
              )}
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
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '44px', padding: '16px', fontSize: '10px', letterSpacing: '2px', textAlign: 'center' }}
            >
              PROCEED TO CHECKOUT <span>→</span>
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
