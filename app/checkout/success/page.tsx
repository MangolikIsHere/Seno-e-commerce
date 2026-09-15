'use client'

import React, { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, AlertCircle, Package, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react'
import { money } from '@/lib/catalog'
import { getCustomerOrderById, Order } from '@/lib/orders'

function CheckoutSuccessContent() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order_id')
  const orderNumberParam = searchParams.get('order_number')

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) {
      getCustomerOrderById(orderId).then(({ order: loadedOrder }) => {
        if (loadedOrder) {
          setOrder(loadedOrder)
        }
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [orderId])

  const displayOrderNumber = order?.order_number || orderNumberParam || 'Confirmed'
  const isPaid = order?.payment_status === 'paid'

  return (
    <main className="static-page-container" style={{ maxWidth: '720px', padding: '60px 20px 100px' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: isPaid ? '#f0fff4' : 'var(--soft)',
          border: isPaid ? '1px solid #c6f6d5' : '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          {isPaid ? (
            <CheckCircle2 size={36} color="#2f855a" strokeWidth={1.5} />
          ) : (
            <CheckCircle2 size={36} color="var(--ink)" strokeWidth={1.5} />
          )}
        </div>
        <span className="section-kicker">
          {isPaid ? 'ORDER & PAYMENT CONFIRMED' : 'ORDER RECORDED'}
        </span>
        <h1 className="static-page-title" style={{ marginBottom: '12px' }}>
          {isPaid ? 'Thank You For Your Order' : 'Order Placed'}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
          {isPaid
            ? 'Your payment was cryptographically verified and recorded in our marketplace database.'
            : 'Your order was recorded with reserved inventory. Payment verification is pending.'}
        </p>
      </div>

      <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '28px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block' }}>Order Reference</span>
            <span style={{ fontSize: '15px', fontWeight: 600, fontFamily: 'monospace' }}>{displayOrderNumber}</span>
          </div>
          <div style={{ textAlign: 'right', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div>
              <span className="status-pill" style={{ textTransform: 'capitalize' }}>
                {order?.status || 'Pending'}
              </span>
            </div>
            <div>
              <span className={`status-pill ${isPaid ? 'paid' : 'pending'}`}>
                {order?.payment_status || 'Unpaid'}
              </span>
            </div>
          </div>
        </div>

        {/* Shipping address snapshot */}
        {order?.shipping_address && (
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Delivery Destination</span>
            <div style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--ink)' }}>
              <strong>{order.shipping_address.recipient_name}</strong> ({order.shipping_address.phone})<br />
              {order.shipping_address.address_line1}{order.shipping_address.address_line2 ? `, ${order.shipping_address.address_line2}` : ''}<br />
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}, {order.shipping_address.country}
            </div>
          </div>
        )}

        {/* Order Items */}
        {order?.order_items && order.order_items.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginBottom: '20px' }}>
            <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '14px' }}>
              Purchased Items ({order.order_items.length})
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.order_items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: 500 }}>{item.product_name}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '11px', marginLeft: '8px' }}>
                      ({item.variant_details?.size || ''} {item.variant_details?.colour ? `/ ${item.variant_details.colour}` : ''}) × {item.quantity}
                    </span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{money(Number(item.total_price))}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Totals Breakdown */}
        {order && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>Subtotal</span>
              <span>{money(Number(order.subtotal_amount))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--muted)' }}>Shipping Fee</span>
              <span>{Number(order.shipping_amount) === 0 ? 'Complimentary' : money(Number(order.shipping_amount))}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
              <span>Total Settled Amount</span>
              <span>{money(Number(order.total_amount))}</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Link href="/account" className="button button-primary" style={{ padding: '14px', textAlign: 'center', fontSize: '11px', letterSpacing: '1px' }}>
          View Order History
        </Link>
        <Link href="/collections/all" className="button button-outline" style={{ padding: '14px', textAlign: 'center', fontSize: '11px', letterSpacing: '1px' }}>
          Continue Shopping
        </Link>
      </div>
    </main>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <main className="static-page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Loading order confirmation...</p>
      </main>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  )
}
