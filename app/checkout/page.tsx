'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck, MapPin, Truck, ShoppingBag, RefreshCw, XCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useStore } from '@/context/StoreContext'
import { money } from '@/lib/catalog'
import { fetchAddresses, createAddress, Address, AddressInput } from '@/lib/addresses'
import { fetchActiveShippingConfig, calculateShippingForLines, DEFAULT_SHIPPING_SETTINGS, ShippingSettings, ShippingWeightRule } from '@/lib/shipping'
import { placeOrderAction, OrderAddress } from '@/lib/orders'
import {
  getPaymentConfigAction,
  createRazorpayOrderAction,
  verifyPaymentAction,
  cancelAndReleaseCheckoutAction
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
  const { cart, subtotal, cartCount, totalWeightGrams, clearOrderedItems, clearCart } = useStore()

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

  // Razorpay public config & active order tracking
  const [paymentConfig, setPaymentConfig] = useState<{ keyId: string; currency: string }>({
    keyId: '',
    currency: 'INR'
  })
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

  // Shipping calculation preview
  const shippingFee = calculateShippingForLines(
    subtotal,
    cart.map(item => ({
      quantity: item.qty,
      unitWeightGrams: item.unit_weight_grams,
      shippingMethod: item.shipping_method,
      customDeliveryCharge: item.custom_delivery_charge
    })),
    shippingConfig.settings,
    shippingConfig.rules
  )
  const grandTotal = subtotal + shippingFee

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

      // 2. Open Razorpay modal if script loaded and in browser
      if (typeof window !== 'undefined' && window.Razorpay) {
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
              setIsSubmitting(false)
              setInfoMessage(
                'PAYMENT NOT COMPLETED. Your payment was not completed and no inventory has been held. You can try again whenever you\'re ready.'
              )
              // Authoritative server-side check and release
              await cancelAndReleaseCheckoutAction(currentOrderId, rzpOrderId)
            }
          }
        }

        const rzp = new window.Razorpay(options)
        rzp.on('payment.failed', async (response: any) => {
          setIsSubmitting(false)
          const reason = response.error?.description || 'Payment rejected by gateway.'
          setErrorMessage(`Payment failed: ${reason}. Your payment was not completed and no inventory has been held.`)
          await cancelAndReleaseCheckoutAction(currentOrderId, rzpOrderId)
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
        idempotency_key: idempotencyKey
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
            <ShieldCheck size={18} color="var(--ink)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ flex: 1 }}>{infoMessage}</span>
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
            <span style={{ flex: 1 }}>{errorMessage}</span>
          </div>
        )}


        <style dangerouslySetInnerHTML={{__html: `
          .checkout-grid { display: grid; grid-template-columns: 1fr 380px; gap: 48px; alignItems: start; }
          .order-summary-sidebar { background: var(--soft); padding: 28px; border: 1px solid var(--border); position: sticky; top: 100px; }
          @media (max-width: 900px) {
            .checkout-grid { grid-template-columns: 1fr; gap: 32px; }
            .order-summary-sidebar { position: static; padding: 20px; }
            .static-page-title { font-size: 28px; margin-bottom: 24px !important; }
            .static-page-container { padding-left: 16px; padding-right: 16px; }
          }
        `}} />
        <form onSubmit={handlePlaceOrder}>
          <div className="checkout-grid">
            
            {/* Left Column: Customer Info & Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              
              {/* 1. Customer Account Info */}
              <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '24px' }}>
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
              <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '24px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
              <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '24px' }}>
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

              {/* 4. Payment Gateway Security Notice */}
              <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldCheck size={16} color="var(--ink)" />
                  <h3 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                    Razorpay Authoritative Checkout
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
                  Payments are processed via encrypted Razorpay gateway. Authoritative order totals and inventory reservations are enforced strictly by SENO PostgreSQL servers.
                </p>
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
                      src={item.product.image}
                      alt={item.product.name}
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

              {/* Calculations Breakdown */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                <span style={{ color: 'var(--muted)' }}>Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})</span>
                <span>{money(subtotal)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                <span style={{ color: 'var(--muted)' }}>Shipment Weight</span>
                <span>{(totalWeightGrams / 1000).toFixed(2)} kg</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px' }}>
                <span style={{ color: 'var(--muted)' }}>Shipping Fee</span>
                <span>{shippingFee === 0 ? 'FREE' : money(shippingFee)}</span>
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

              {/* Action Buttons */}
              <button
                type="submit"
                className="dark-btn"
                disabled={isSubmitting || isVerifying}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '11px',
                  letterSpacing: '2px',
                  opacity: (isSubmitting || isVerifying) ? 0.7 : 1,
                  cursor: (isSubmitting || isVerifying) ? 'not-allowed' : 'pointer',
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
                ) : isSubmitting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    OPENING RAZORPAY GATEWAY...
                  </>
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
