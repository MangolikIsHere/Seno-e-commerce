'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingBag, Plus, Minus, Trash2, ArrowLeft, Tag, ShieldCheck, Video, Lock, Truck, Check } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'
import { fetchActiveShippingConfig, calculateShippingForLines, DEFAULT_SHIPPING_SETTINGS, ShippingSettings, ShippingWeightRule } from '@/lib/shipping'
import { SenoImage } from '@/components/SenoImage'
import { evaluateCartDiscount } from '@/lib/promotions'
import { PromotionEvaluationResult } from '@/lib/promotions-shared'
import { CheckoutPolicyModal } from '@/components/CheckoutPolicyModal'

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
  const router = useRouter()
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false)
  const [shippingConfig, setShippingConfig] = useState<{ settings: ShippingSettings; rules: ShippingWeightRule[] }>({
    settings: DEFAULT_SHIPPING_SETTINGS,
    rules: []
  })
  const [promoResult, setPromoResult] = useState<PromotionEvaluationResult | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)

  const handleProceedToCheckout = () => {
    try {
      if (sessionStorage.getItem('seno_checkout_policy_acknowledged') === 'true') {
        router.push('/checkout')
        return
      }
    } catch {
      // Ignore storage errors
    }
    setIsPolicyModalOpen(true)
  }

  const handleContinueCheckout = () => {
    setIsPolicyModalOpen(false)
    router.push('/checkout')
  }

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
        <>
          <style dangerouslySetInnerHTML={{__html: `
            .cart-layout {
              display: grid;
              grid-template-columns: 1fr 370px;
              gap: 40px;
              align-items: start;
              margin-top: 24px;
            }
            .cart-summary-sidebar {
              background: #ffffff;
              border: 1px solid var(--border);
              border-radius: 3px;
              padding: 28px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
              position: sticky;
              top: 96px;
            }
            .cart-item-row {
              display: flex;
              gap: 20px;
              padding: 22px 0;
              border-bottom: 1px solid var(--soft);
              transition: background-color 0.2s ease;
            }
            .cart-item-thumb {
              width: 84px;
              aspect-ratio: 3/4;
              flex-shrink: 0;
              overflow: hidden;
              border-radius: 2px;
              background: var(--surface-subtle);
            }
            @media (max-width: 900px) {
              .cart-layout {
                grid-template-columns: 1fr;
                gap: 28px;
                margin-top: 16px;
              }
              .cart-summary-sidebar {
                position: static;
                padding: 20px 16px;
              }
            }
            @media (max-width: 480px) {
              .cart-item-row {
                gap: 14px;
                padding: 16px 0;
              }
              .cart-item-thumb {
                width: 72px;
              }
            }
          `}} />

          <div className="cart-layout">
            {/* Cart Table / Items Column */}
            <div>
              <div style={{ paddingBottom: '16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span className="free-shipping-notice" style={{ fontSize: '13px', fontWeight: 500 }}>
                    {subtotal >= freeShippingThreshold ? (
                      <span style={{ color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> You qualify for complimentary express shipping across India.
                      </span>
                    ) : (
                      `Add ${money(freeShippingThreshold - subtotal)} more to unlock complimentary shipping.`
                    )}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--muted)', fontWeight: 600 }}>
                    {Math.round(progressPercent)}%
                  </span>
                </div>
                <div className="shipping-progress-track" style={{ marginTop: '10px', height: '6px', background: 'var(--soft)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    className="shipping-progress-fill"
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: subtotal >= freeShippingThreshold ? '#15803d' : 'var(--ink)',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              {promoResult && promoResult.message && (
                <div
                  style={{
                    background: promoResult.status === 'applied' ? '#f4fbf5' : '#fafafa',
                    border: `1px solid ${promoResult.status === 'applied' ? '#bbf7d0' : 'var(--border)'}`,
                    padding: '14px 18px',
                    margin: '16px 0',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    fontSize: '12.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Tag size={14} color={promoResult.status === 'applied' ? '#15803d' : 'var(--ink)'} />
                    <span style={{ color: promoResult.status === 'applied' ? '#14532d' : 'var(--ink)', fontWeight: 600, letterSpacing: '0.4px', flex: 1 }}>
                      {promoResult.message}
                    </span>
                  </div>
                  {promoResult.subMessage && (
                    <p style={{ color: '#166534', margin: '2px 0 0 22px', fontSize: '12px', lineHeight: 1.4 }}>
                      {promoResult.subMessage}
                    </p>
                  )}
                  {promoResult.pendingOpportunity && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #bbf7d0', color: '#15803d', fontSize: '11.5px' }}>
                      ✨ {promoResult.pendingOpportunity.message}
                    </div>
                  )}
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
                        marginTop: '4px',
                        marginLeft: '22px'
                      }}
                    >
                      SHOP ELIGIBLE ITEMS →
                    </Link>
                  )}
                </div>
              )}

              {cart.map(item => (
                <div key={item.variant_id} className="cart-item-row">
                  <div className="cart-item-thumb">
                    <SenoImage
                      src={item.product.image}
                      alt={item.product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                    <Link
                      href={`/products/${item.product.slug}`}
                      style={{ fontSize: '14.5px', fontWeight: 500, color: 'var(--ink)', textDecoration: 'none', marginBottom: '4px', lineHeight: 1.35 }}
                    >
                      {item.product.name}
                    </Link>
                    <span style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '8px' }}>
                      Size: <strong style={{ color: 'var(--ink)' }}>{item.size}</strong> {item.colour && item.colour !== 'Default' ? ` · Colour: ${item.colour}` : ''}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '14px' }}>
                      {money(item.unit_price)}
                    </span>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                      <div className="quantity-stepper-box" style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', background: '#fff', borderRadius: '2px' }}>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variant_id, -1)}
                          aria-label="Decrease quantity"
                          style={{ minWidth: '40px', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <Minus size={13} />
                        </button>
                        <span style={{ minWidth: '32px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.variant_id, 1)}
                          aria-label="Increase quantity"
                          style={{ minWidth: '40px', minHeight: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.variant_id)}
                        aria-label={`Remove ${item.product.name} from bag`}
                        style={{ color: 'var(--muted)', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', minHeight: '38px', padding: '0 8px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary Column */}
            <div className="cart-summary-sidebar">
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, margin: '0 0 20px', color: 'var(--ink)' }}>
                Order Summary
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: 'var(--ink)' }}>
                <span style={{ color: 'var(--muted)' }}>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                <span>{money(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: 'var(--ink)' }}>
                <span style={{ color: 'var(--muted)' }}>Shipment Weight</span>
                <span>{(totalWeightGrams / 1000).toFixed(2)} kg</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: 'var(--ink)' }}>
                <span style={{ color: 'var(--muted)' }}>Estimated Shipping</span>
                <span>{finalShipping === 0 ? <strong style={{ color: '#15803d' }}>FREE</strong> : money(finalShipping)}</span>
              </div>

              {finalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px', color: '#15803d' }}>
                  <span style={{ fontWeight: 500 }}>{promoResult?.discountLabel || promoResult?.appliedPromotion?.name || 'Promotion Discount'}</span>
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
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderRadius: '2px',
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
                        padding: '10px 14px',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        fontSize: '10px',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        borderRadius: '2px'
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
                        padding: '10px 16px',
                        background: 'var(--ink)',
                        color: '#fff',
                        border: 'none',
                        fontSize: '10px',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        borderRadius: '2px'
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
                  alignItems: 'baseline',
                  fontSize: '16px',
                  fontWeight: 600,
                  marginBottom: '20px'
                }}
              >
                <span>Estimated Total</span>
                <span style={{ fontSize: '18px' }}>{money(estimatedTotal)}</span>
              </div>

              <button
                type="button"
                onClick={handleProceedToCheckout}
                className="dark-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  minHeight: '48px',
                  padding: '16px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  textAlign: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '2px'
                }}
              >
                <span>PROCEED TO CHECKOUT</span>
                <span>→</span>
              </button>

              {/* Compact Returns & Refunds Policy Information Row */}
              <div
                style={{
                  marginTop: '18px',
                  padding: '12px 14px',
                  background: 'var(--soft)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={13} color="var(--ink)" />
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Returns &amp; Refunds</span>
                  </div>
                  <Link
                    href="/return-refund-policy"
                    style={{ fontSize: '11px', textDecoration: 'underline', color: 'var(--ink)', fontWeight: 600 }}
                  >
                    View Policy
                  </Link>
                </div>
                <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  Please record your parcel&apos;s unboxing video to verify any issues upon delivery.
                </p>
              </div>

              {/* Trust badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line)', fontSize: '11.5px', color: 'var(--muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={13} />
                  <span>256-Bit Encrypted Secure Checkout</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={13} />
                  <span>Complimentary Doorstep Reverse Pickups</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Checkout Unboxing Policy Notice Modal */}
      <CheckoutPolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        onContinue={handleContinueCheckout}
      />
    </main>
  )
}
