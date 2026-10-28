'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, MapPin, Truck, ShoppingBag, RefreshCw, XCircle, Tag, Video, ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'
import { fetchAddresses, createAddress, Address, AddressInput } from '@/lib/addresses'
import { fetchActiveShippingConfig, calculateShippingForLines, DEFAULT_SHIPPING_SETTINGS, ShippingSettings, ShippingWeightRule } from '@/lib/shipping'
import { placeOrderAction, OrderAddress } from '@/lib/orders'
import { evaluateCartDiscount } from '@/lib/promotions'
import { PromotionEvaluationResult } from '@/lib/promotions-shared'
import {
  getPaymentConfigAction,
  createRazorpayOrderAction,
  verifyPaymentAction,
  reconcilePendingOrderAction,
  recordPaymentFailureAction
} from '@/lib/payments'

interface ActiveOrderState {
  order_id: string
  order_number: string
  total_amount: number
  purchased_variant_ids: string[]
  razorpay_order_id?: string
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const { cart, subtotal, cartCount, totalWeightGrams, clearOrderedItems, clearCart, appliedCouponCode, setAppliedCouponCode } = useStore()
  const [promoResult, setPromoResult] = useState<PromotionEvaluationResult | null>(null)
  const [couponInput, setCouponInput] = useState('')
  const [couponError, setCouponError] = useState<string | null>(null)
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false)

  // Addresses state
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string>('')
  const [useNewAddress, setUseNewAddress] = useState<boolean>(false)
  const [saveNewAddress, setSaveNewAddress] = useState<boolean>(true)
  const [loadingAddresses, setLoadingAddresses] = useState(true)

  // New Address Form state
  const [newAddress, setNewAddress] = useState<AddressInput>({
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    is_default: false
  })

  // Order notes & idempotency
  const [orderNotes, setOrderNotes] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState('')

  // Shipping configuration state
  const [shippingConfig, setShippingConfig] = useState<{ settings: ShippingSettings; rules: ShippingWeightRule[] }>({
    settings: DEFAULT_SHIPPING_SETTINGS,
    rules: []
  })

  // Submission & Payment state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false)

  // Razorpay public config & active order tracking
  const [paymentConfig, setPaymentConfig] = useState<{ keyId: string; currency: string }>({
    keyId: '',
    currency: 'INR'
  })
  const [activeOrderTracker, setActiveOrderTracker] = useState<{ orderId: string, razorpayOrderId: string } | null>(null)
  const razorpayScriptLoaded = useRef(false)

  // Generate unique idempotency key on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = 'seno_chk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9)
      setIdempotencyKey(token)
    }
  }, [])

  // Load public payment config
  useEffect(() => {
    getPaymentConfigAction().then(setPaymentConfig)
  }, [])

  // Load active shipping settings
  useEffect(() => {
    fetchActiveShippingConfig().then(setShippingConfig)
  }, [])

  // Load customer addresses if authenticated
  useEffect(() => {
    if (user) {
      setLoadingAddresses(true)
      fetchAddresses(user.id).then(addresses => {
        setSavedAddresses(addresses)
        if (addresses.length > 0) {
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0]
          setSelectedAddressId(defaultAddr.id)
          setUseNewAddress(false)
        } else {
          setUseNewAddress(true)
          if (profile?.full_name) {
            setNewAddress(prev => ({ ...prev, recipient_name: profile.full_name || '' }))
          }
        }
        setLoadingAddresses(false)
      })
    } else if (!authLoading) {
      setLoadingAddresses(false)
    }
  }, [user, profile, authLoading])

  // Reconcile pending order status with authoritative backend & gateway
  const handleCheckStatus = async (orderId: string, rzpOrderId: string) => {
    setIsCheckingStatus(true)
    setInfoMessage("Payment wasn't confirmed. We're checking the payment status. Please wait before retrying.")

    try {
      const res = await reconcilePendingOrderAction(orderId, rzpOrderId)
      setIsCheckingStatus(false)

      if (res.success) {
        if (res.action === 'paid') {
          setErrorMessage(null)
          setInfoMessage('Payment was completed successfully. Redirecting...')
          clearCart()
          router.push(`/checkout/success?order_id=${orderId}`)
          return
        }

        if (res.action === 'unpaid') {
          setErrorMessage(null)
          setInfoMessage("Payment wasn't completed. You can retry securely when you're ready.")
          return
        }

        if (res.action === 'failed' || res.action === 'cancelled') {
          setErrorMessage(res.message || "Payment wasn't completed. You can retry securely when you're ready.")
          setInfoMessage(null)
          return
        }

        if (res.action === 'expired') {
          setErrorMessage('Your reservation has expired. Please review your bag and place a new order.')
          setInfoMessage(null)
          setActiveOrderTracker(null)
          setIdempotencyKey('seno_chk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9))
          return
        }
      }

      // If status could not be determined / gateway unreachable
      setInfoMessage("Payment wasn't confirmed. We're checking the payment status. Please wait before retrying.")
    } catch {
      setIsCheckingStatus(false)
      setInfoMessage("Payment wasn't confirmed. We're checking the payment status. Please wait before retrying.")
    }
  }

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && activeOrderTracker) {
        if (!isCheckingStatus) {
          await handleCheckStatus(activeOrderTracker.orderId, activeOrderTracker.razorpayOrderId)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [activeOrderTracker, isCheckingStatus])

  // Shipping calculation preview
  const shippingFee = calculateShippingForLines(
    subtotal,
    cart.map(item => ({
      quantity: item.qty,
      unitWeightGrams: item.unit_weight_grams || item.product?.defaultWeightGrams || 500,
      shippingMethod: item.shipping_method || item.product?.shippingMethod || (item.product as any)?.shipping_method || 'weight_based',
      customDeliveryCharge: item.custom_delivery_charge !== undefined
        ? item.custom_delivery_charge
        : (item.product?.customDeliveryCharge !== undefined ? item.product.customDeliveryCharge : (item.product as any)?.custom_delivery_charge)
    })),
    shippingConfig.settings,
    shippingConfig.rules
  )

  useEffect(() => {
    if (cart.length > 0) {
      evaluateCartDiscount({
        cart,
        promotionCode: appliedCouponCode,
        shippingFee,
        customerId: user?.id || null
      })
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
  }, [cart, appliedCouponCode, shippingFee, user?.id])

  const promoDiscount = promoResult?.discountAmount || 0
  const finalShippingFee = promoResult?.isFreeShipping ? 0 : shippingFee
  const grandTotal = Math.max(0, subtotal - promoDiscount) + finalShippingFee

  // Razorpay Checkout Launcher
  const launchRazorpayModal = async (
    orderId: string,
    orderNumber: string,
    purchasedVariantIds: string[],
    existingRzpOrderId?: string
  ) => {
    setIsSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      // 1. Concurrency-safe Razorpay order creation / retrieval
      const rzpRes = await createRazorpayOrderAction(orderId)

      if (!rzpRes.success || !rzpRes.razorpay_order_id) {
        if (rzpRes.already_paid) {
          clearOrderedItems(purchasedVariantIds)
          router.push(`/checkout/success?order_id=${orderId}&order_number=${orderNumber}`)
          return
        }
        throw new Error(rzpRes.error || 'Failed to initialize payment gateway order.')
      }

      const rzpOrderId = rzpRes.razorpay_order_id

      // Update tracking variable (no longer visually locking the UI)
      const currentOrderId = orderId
      const currentOrderNumber = orderNumber
      const currentVariantIds = purchasedVariantIds
      setActiveOrderTracker({ orderId: currentOrderId, razorpayOrderId: rzpOrderId })

      // 2. Open Razorpay modal if script loaded and in browser
      if (typeof window !== 'undefined' && window.Razorpay) {
        let paymentHandled = false
        const options = {
          key: paymentConfig.keyId,
          amount: rzpRes.amount,
          currency: rzpRes.currency || 'INR',
          name: 'SENO Luxury',
          description: `Order ${orderNumber}`,
          order_id: rzpOrderId,
          prefill: {
            name: profile?.full_name || user?.email || '',
            email: user?.email || ''
          },
          theme: {
            color: '#111111'
          },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_order_id: string
            razorpay_signature: string
          }) => {
            paymentHandled = true
            setIsVerifying(true)
            setIsSubmitting(false)
            setErrorMessage(null)

            try {
              // 3. Server-authoritative cryptographic signature verification
              const verifyRes = await verifyPaymentAction({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })

              if (!verifyRes.success) {
                setErrorMessage(verifyRes.error || 'Payment verification failed. Your reservation is held.')
                setIsVerifying(false)
                return
              }

              // Verified Success: Only now remove purchased variants from cart
              if (cart.length === purchasedVariantIds.length) {
                clearCart()
              } else {
                clearOrderedItems(purchasedVariantIds)
              }
              router.push(`/checkout/success?order_id=${orderId}&order_number=${orderNumber}`)
            } catch (vErr: unknown) {
              const msg = vErr instanceof Error ? vErr.message : 'Failed to verify payment.'
              setErrorMessage(msg)
              setIsVerifying(false)
            }
          },
          modal: {
            ondismiss: async () => {
              if (paymentHandled) return
              setIsSubmitting(false)

              await handleCheckStatus(currentOrderId, rzpOrderId)
            }
          }
        }

        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', async (response: any) => {
          setIsSubmitting(false)
          const reason = response.error?.description || 'Payment rejected by gateway.'
          setErrorMessage(`Payment failed: ${reason}. Please retry your payment.`)

          // Genuine failure: Record failure authoritatively via existing failure handling path
          try {
            await recordPaymentFailureAction(
              currentOrderId,
              rzpOrderId,
              response.error?.metadata?.payment_id || response.error?.source || '',
              reason
            )
          } catch {
            // Non-fatal
          }

          // Regenerate idempotency key so a fresh order attempt can be placed cleanly
          setIdempotencyKey('seno_chk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9))
        })
        rzp.open()
      } else {
        // Fallback for development/simulator mode
        setIsSubmitting(false)
        setInfoMessage(
          `Payment gateway initialized (Razorpay Order ID: ${rzpOrderId}). Click 'Simulate Verified Payment' below to test in local environment.`
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred launching payment.'
      setErrorMessage(msg)
      setIsSubmitting(false)
    }
  }

  // Handle Order Placement (New Order or Retry)
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting || isVerifying) return

    setErrorMessage(null)
    setInfoMessage(null)

    // CASE 2: NEW ORDER CREATION
    // (Retries are treated as new orders now, checking stock fresh)
    setIsSubmitting(true)

    try {
      let shippingAddressPayload: OrderAddress | undefined = undefined
      let addressIdPayload: string | undefined = undefined

      if (useNewAddress || savedAddresses.length === 0) {
        if (
          !newAddress.recipient_name.trim() ||
          !newAddress.phone.trim() ||
          !newAddress.address_line1.trim() ||
          !newAddress.city.trim() ||
          !newAddress.state.trim() ||
          !newAddress.postal_code.trim()
        ) {
          setErrorMessage('Please fill in all required delivery address fields.')
          setIsSubmitting(false)
          return
        }

        shippingAddressPayload = {
          recipient_name: newAddress.recipient_name.trim(),
          phone: newAddress.phone.trim(),
          address_line1: newAddress.address_line1.trim(),
          address_line2: newAddress.address_line2?.trim() || null,
          city: newAddress.city.trim(),
          state: newAddress.state.trim(),
          postal_code: newAddress.postal_code.trim(),
          country: newAddress.country.trim() || 'India'
        }

        if (saveNewAddress && user) {
          try {
            await createAddress(user.id, { ...newAddress, is_default: savedAddresses.length === 0 })
          } catch {
            // Non-fatal if address book persistence fails
          }
        }
      } else {
        if (!selectedAddressId) {
          setErrorMessage('Please select a delivery address.')
          setIsSubmitting(false)
          return
        }
        addressIdPayload = selectedAddressId
      }

      const itemsPayload = cart.map(item => ({
        variant_id: item.variant_id,
        quantity: item.qty
      }))
      const purchasedVariantIds = itemsPayload.map(i => i.variant_id)

      // Place authoritative SENO order (atomically reserves inventory)
      const result = await placeOrderAction({
        items: itemsPayload,
        address_id: addressIdPayload,
        shipping_address: shippingAddressPayload,
        notes: orderNotes.trim() || undefined,
        idempotency_key: idempotencyKey,
        coupon_code: appliedCouponCode || undefined
      })

      if (!result.success || !result.order_id || !result.order_number) {
        setErrorMessage(result.error || 'Unable to place order. Please try again.')
        setIsSubmitting(false)
        return
      }

      // Launch Razorpay checkout
      await launchRazorpayModal(result.order_id, result.order_number, purchasedVariantIds)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected checkout error occurred.'
      setErrorMessage(message)
      setIsSubmitting(false)
    }
  }




  // Unauthenticated Guard
  if (authLoading || (user && loadingAddresses)) {
    return (
      <main className="static-page-container" style={{ minHeight: '60vh', textAlign: 'center', padding: '80px 20px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px', letterSpacing: '1px' }}>PREPARING SECURE CHECKOUT...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="static-page-container" style={{ maxWidth: '520px', minHeight: '60vh', textAlign: 'center', padding: '60px 20px' }}>
        <ShieldCheck size={36} strokeWidth={1.5} color="var(--ink)" style={{ margin: '0 auto 16px' }} />
        <span className="section-kicker">SECURE CHECKOUT</span>
        <h1 className="static-page-title" style={{ marginBottom: '16px' }}>Sign In Required</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px' }}>
          Please sign in to your SENO customer account or register to complete your order with encrypted server-authoritative checkout.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link href="/account?next=/checkout" className="dark-btn" style={{ padding: '16px', letterSpacing: '2px', fontSize: '11px', textAlign: 'center' }}>
            SIGN IN TO CONTINUE <span>→</span>
          </Link>
          <Link href="/account/register?next=/checkout" className="outline-btn" style={{ padding: '16px', letterSpacing: '2px', fontSize: '11px', textAlign: 'center' }}>
            CREATE AN ACCOUNT
          </Link>
          <Link href="/cart" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'underline' }}>
            Return to Shopping Cart
          </Link>
        </div>
      </main>
    )
  }

  // Empty Cart Guard
  if (cart.length === 0) {
    return (
      <main className="static-page-container" style={{ minHeight: '50vh', textAlign: 'center', padding: '70px 20px' }}>
        <ShoppingBag size={38} strokeWidth={1.2} color="var(--muted)" style={{ margin: '0 auto 16px' }} />
        <h1 className="static-page-title" style={{ marginBottom: '16px' }}>Your Bag is Empty</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
          You have no items in your shopping bag to check out.
        </p>
        <Link href="/collections/all" className="dark-btn" style={{ padding: '14px 28px', fontSize: '11px' }}>
          EXPLORE CATALOG
        </Link>
      </main>
    )
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => {
          razorpayScriptLoaded.current = true
        }}
      />

      <main className="static-page-container" style={{ maxWidth: '1060px', paddingBottom: '80px' }}>
        <Link href="/cart" className="breadcrumb-back-link" style={{ marginBottom: '24px', display: 'inline-flex' }}>
          <ArrowLeft size={13} /> RETURN TO CART
        </Link>

        <span className="section-kicker">SENO COMMERCE</span>
        <h1 className="static-page-title" style={{ marginBottom: '32px' }}>Checkout</h1>

        {/* Informational Notification */}
        {infoMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#f7fafc',
            border: '1px solid #e2e8f0',
            color: '#2d3748',
            padding: '16px',
            fontSize: '13px',
            marginBottom: '28px',
            lineHeight: 1.5,
            wordBreak: 'break-word'
          }}>
            {isCheckingStatus ? (
              <RefreshCw size={18} className="animate-spin" color="var(--ink)" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <ShieldCheck size={18} color="var(--ink)" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span>{infoMessage}</span>
              {activeOrderTracker && !isCheckingStatus && (
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleCheckStatus(activeOrderTracker.orderId, activeOrderTracker.razorpayOrderId)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--ink)',
                      textDecoration: 'underline',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Check Status Again
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            background: '#fff5f5',
            border: '1px solid #fed7d7',
            color: '#c53030',
            padding: '16px',
            fontSize: '13px',
            marginBottom: '28px',
            lineHeight: 1.5,
            wordBreak: 'break-word'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <span>{errorMessage}</span>
              <div style={{ marginTop: '8px', fontSize: '12px' }}>
                Need concierge assistance?{' '}
                <a
                  href="https://wa.me/918617648031?text=Hello%20SENO%2C%20I%20need%20help%20with%20an%20order."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'underline', fontWeight: 600, color: '#c53030' }}
                >
                  Contact SENO WhatsApp Support
                </a>
              </div>
            </div>
          </div>
        )}


        <style dangerouslySetInnerHTML={{__html: `
          .checkout-grid { display: grid; grid-template-columns: 1fr 390px; gap: 40px; align-items: start; }
          .order-summary-sidebar { background: #ffffff; padding: 28px; border: 1px solid var(--border); border-radius: 3px; position: sticky; top: 96px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }
          .mobile-order-summary-toggle { display: none; }
          .checkout-form-card { background: #ffffff; border: 1px solid var(--border); border-radius: 3px; padding: 24px; }
          @media (max-width: 900px) {
            .checkout-grid { grid-template-columns: 1fr; gap: 24px; }
            .order-summary-sidebar { position: static; padding: 20px 16px; }
            .static-page-title { font-size: 26px; margin-bottom: 20px !important; }
            .static-page-container { padding-left: 16px; padding-right: 16px; }
            .mobile-order-summary-toggle { display: block; margin-bottom: 20px; background: #ffffff; border: 1px solid var(--border); border-radius: 3px; overflow: hidden; }
            .checkout-form-card { padding: 18px 16px; }
          }
          @media (max-width: 520px) {
            .checkout-two-col { grid-template-columns: 1fr !important; }
            .form-input-field { font-size: 16px !important; }
          }
        `}} />

        {/* Mobile Collapsible Order Summary Banner (< 900px) */}
        <div className="mobile-order-summary-toggle">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: 'var(--soft)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--ink)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
              <ShoppingBag size={16} />
              <span>{mobileSummaryOpen ? 'Hide order summary' : 'Show order summary'} ({cartCount})</span>
              {mobileSummaryOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            <strong style={{ fontSize: '15px' }}>{money(grandTotal)}</strong>
          </button>

          {mobileSummaryOpen && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', background: '#fff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {cart.map(item => (
                  <div key={item.variant_id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '48px', height: '64px', position: 'relative', flexShrink: 0, overflow: 'hidden', borderRadius: '2px', background: 'var(--surface-subtle)' }}>
                      <img src={item.image_url || item.product?.image} alt={item.product?.name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, fontSize: '12px' }}>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '11px' }}>Size: {item.size} {item.colour && item.colour !== 'Default' ? `· ${item.colour}` : ''} · Qty: {item.qty}</div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{money(item.unit_price * item.qty)}</div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                {promoDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                    <span>Promotion Discount</span>
                    <strong>-{money(promoDiscount)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Shipping</span>
                  <span>{finalShippingFee === 0 ? 'FREE' : money(finalShippingFee)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="checkout-grid">
            
            {/* Left Column: Customer Info & Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* 1. Customer Account Info */}
              <div className="checkout-form-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CheckCircle2 size={16} color="var(--ink)" />
                  <h2 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>
                    Customer Account
                  </h2>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.6 }}>
                  <p style={{ margin: 0, fontWeight: 500 }}>{profile?.full_name || 'Valued Customer'}</p>
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{user.email}</p>
                </div>
              </div>

              {/* 2. Delivery Address Selection */}
              <div className="checkout-form-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                  <MapPin size={16} color="var(--ink)" />
                  <h2 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>
                    Delivery Address
                  </h2>
                </div>

                {savedAddresses.length > 0 && (
                  <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {savedAddresses.map(addr => (
                      <label
                        key={addr.id}
                        style={{
                          display: 'flex',
                          gap: '12px',
                          padding: '16px',
                          border: selectedAddressId === addr.id && !useNewAddress ? '1px solid var(--ink)' : '1px solid var(--border)',
                          background: selectedAddressId === addr.id && !useNewAddress ? 'var(--soft)' : '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="radio"
                          name="address_choice"
                          checked={selectedAddressId === addr.id && !useNewAddress}
                          onChange={() => {
                            setSelectedAddressId(addr.id)
                            setUseNewAddress(false)
                          }}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>
                          <div style={{ fontWeight: 600 }}>
                            {addr.recipient_name}
                            {addr.is_default && (
                              <span style={{ marginLeft: '8px', fontSize: '10px', background: 'var(--ink)', color: '#fff', padding: '2px 6px' }}>
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <div style={{ color: 'var(--muted)' }}>{addr.phone}</div>
                          <div>{addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}</div>
                          <div>{addr.city}, {addr.state} {addr.postal_code}, {addr.country}</div>
                        </div>
                      </label>
                    ))}

                    <label
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '16px',
                        border: useNewAddress ? '1px solid var(--ink)' : '1px solid var(--border)',
                        background: useNewAddress ? 'var(--soft)' : '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <input
                        type="radio"
                        name="address_choice"
                        checked={useNewAddress}
                        onChange={() => setUseNewAddress(true)}
                        style={{ marginTop: '3px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>Deliver to a new address</span>
                    </label>
                  </div>
                )}

                {/* New Address Inputs */}
                {(useNewAddress || savedAddresses.length === 0) && (
                  <div style={{ marginTop: savedAddresses.length > 0 ? '16px' : '0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Recipient Full Name *"
                      className="form-input-field"
                      value={newAddress.recipient_name}
                      onChange={e => setNewAddress({ ...newAddress, recipient_name: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Phone Number (for courier contact) *"
                      className="form-input-field"
                      value={newAddress.phone}
                      onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Address Line 1 (House/Flat, Street) *"
                      className="form-input-field"
                      value={newAddress.address_line1}
                      onChange={e => setNewAddress({ ...newAddress, address_line1: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      placeholder="Address Line 2 (Apartment, Suite, Landmark - Optional)"
                      className="form-input-field"
                      value={newAddress.address_line2 || ''}
                      onChange={e => setNewAddress({ ...newAddress, address_line2: e.target.value })}
                    />
                    <div className="checkout-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="City *"
                        className="form-input-field"
                        value={newAddress.city}
                        onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="State *"
                        className="form-input-field"
                        value={newAddress.state}
                        onChange={e => setNewAddress({ ...newAddress, state: e.target.value })}
                        required
                      />
                    </div>
                    <div className="checkout-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <input
                        type="text"
                        placeholder="PIN / Postal Code *"
                        className="form-input-field"
                        value={newAddress.postal_code}
                        onChange={e => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                        required
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        className="form-input-field"
                        value={newAddress.country}
                        readOnly
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '4px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={saveNewAddress}
                        onChange={e => setSaveNewAddress(e.target.checked)}
                        style={{ width: 'auto', margin: 0 }}
                      />
                      Save this address to my SENO account
                    </label>
                  </div>
                )}
              </div>

              {/* 3. Order Notes / Delivery Instructions */}
              <div className="checkout-form-card">
                <h2 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Delivery Notes (Optional)
                </h2>
                <textarea
                  placeholder="Special instructions for delivery (e.g. gate code, leave with concierge)"
                  className="form-input-field"
                  rows={3}
                  value={orderNotes}
                  onChange={e => setOrderNotes(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

            </div>

            {/* Right Column: Order Summary */}
            <div className="order-summary-sidebar">
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, margin: '0 0 20px' }}>
                Order Summary
              </h3>

              {/* Items breakdown */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                {cart.map(item => (
                  <div key={item.variant_id} style={{ display: 'flex', gap: '14px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    <img
                      src={item.image_url || item.product?.image}
                      alt={item.product?.name || ''}
                      style={{ width: '56px', aspectRatio: '3/4', objectFit: 'cover' }}
                    />
                    <div style={{ flex: 1, fontSize: '12px', lineHeight: 1.4 }}>
                      <div style={{ fontWeight: 600, marginBottom: '2px' }}>{item.product.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        Size: {item.size} {item.colour && item.colour !== 'Default' ? `| ${item.colour}` : ''}
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '11px' }}>
                        Qty: {item.qty} × {money(item.unit_price)}
                      </div>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                      {money(item.unit_price * item.qty)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Input Box */}
              <div style={{ marginBottom: '18px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
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
                {promoResult?.status === 'applied' && promoResult.appliedPromotion && (
                  <p style={{ color: '#15803d', fontSize: '11px', margin: '6px 0 0', fontWeight: 500 }}>
                    ✨ {promoResult.discountLabel || promoResult.appliedPromotion.name} applied
                    {promoResult.subMessage ? ` · ${promoResult.subMessage}` : ''}
                  </p>
                )}
              </div>

              {/* Calculations Breakdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                <span style={{ color: 'var(--muted)' }}>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                <span>{money(subtotal)}</span>
              </div>

              {promoDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px', color: '#15803d' }}>
                  <span style={{ fontWeight: 500 }}>{promoResult?.discountLabel || promoResult?.appliedPromotion?.name || 'Promotion'}</span>
                  <strong>-{money(promoDiscount)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                <span style={{ color: 'var(--muted)' }}>Shipment Weight</span>
                <span>{(totalWeightGrams / 1000).toFixed(2)} kg</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px' }}>
                <span style={{ color: 'var(--muted)' }}>Shipping Fee</span>
                <span>{finalShippingFee === 0 ? 'FREE' : money(finalShippingFee)}</span>
              </div>

              <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '16px',
                fontWeight: 600,
                marginBottom: '24px'
              }}>
                <span>Total Amount</span>
                <span>{money(grandTotal)}</span>
              </div>

              {/* Subtle Unboxing & Return Policy Reminder */}
              <div
                style={{
                  background: '#fafafa',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  padding: '12px 14px',
                  marginBottom: '18px',
                  fontSize: '11.5px',
                  lineHeight: 1.45,
                  color: 'var(--muted)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ink)', fontWeight: 600, marginBottom: '3px' }}>
                  <Video size={13} />
                  <span>Unboxing Verification Policy</span>
                </div>
                <p style={{ margin: 0 }}>
                  Please record a continuous unboxing video when opening your parcel to verify any damaged, defective, or missing items.{' '}
                  <Link
                    href="/return-refund-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 500 }}
                  >
                    Read Policy
                  </Link>
                </p>
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                className="dark-btn"
                disabled={isSubmitting || isVerifying || isCheckingStatus}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  opacity: (isSubmitting || isVerifying || isCheckingStatus) ? 0.7 : 1,
                  cursor: (isSubmitting || isVerifying || isCheckingStatus) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {isVerifying ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    VERIFYING PAYMENT CRYPTOGRAPHY...
                  </>
                ) : isCheckingStatus ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    CHECKING PAYMENT STATUS...
                  </>
                ) : isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    OPENING RAZORPAY GATEWAY...
                  </>
                ) : activeOrderTracker ? (
                  'RETRY PAYMENT →'
                ) : (
                  'PROCEED TO RAZORPAY PAYMENT →'
                )}
              </button>


              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '16px', fontSize: '11px', color: 'var(--muted)' }}>
                <ShieldCheck size={14} />
                <span>Zero-trust server-side signature verification</span>
              </div>
            </div>
          </div>
        </form>
      </main>
    </>
  )
}
