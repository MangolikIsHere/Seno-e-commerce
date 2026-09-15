'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, MapPin, ShieldCheck, Printer, PackageCheck, Truck } from 'lucide-react'
import { getCustomerOrderById, Order } from '@/lib/orders'
import { money } from '@/lib/catalog'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orderId) {
      getCustomerOrderById(orderId).then(({ order: loadedOrder, error: fetchError }) => {
        if (fetchError || !loadedOrder) {
          setError(fetchError || 'Order not found or unauthorized.')
        } else {
          setOrder(loadedOrder)
        }
        setLoading(false)
      })
    }
  }, [orderId])

  if (loading) {
    return (
      <main className="static-page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '13px', letterSpacing: '1px' }}>RETRIEVING ORDER DOSSIER...</p>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="static-page-container" style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '500px' }}>
        <h1 className="static-page-title" style={{ marginBottom: '16px' }}>Order Not Found</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
          {error || 'This order does not exist or you do not have permission to view it.'}
        </p>
        <Link href="/account" className="button button-primary" style={{ padding: '12px 28px', fontSize: '12px' }}>
          Return to Account
        </Link>
      </main>
    )
  }

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return iso
    }
  }

  return (
    <main className="static-page-container" style={{ maxWidth: '960px', paddingBottom: '96px' }}>
      {/* Navigation Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <Link 
          href="/account" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.5px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Account</span>
        </Link>

        <button
          onClick={() => window.print()}
          className="button button-ghost"
          style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Printer size={14} />
          <span>Print Receipt</span>
        </button>
      </div>

      {/* Header Banner */}
      <div style={{
        padding: '28px 32px',
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: '2px',
        marginBottom: '28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <span className="section-kicker" style={{ margin: '0 0 6px' }}>CONFIRMED TRANSACTION</span>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
            fontWeight: 400,
            letterSpacing: '-0.5px',
            margin: '0 0 8px'
          }}>
            Order #{order.order_number}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
            Recorded on {formatDateTime(order.created_at)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
            Payment: {order.payment_status}
          </span>
          <span className={`status-pill ${order.status === 'delivered' ? 'delivered' : order.status === 'shipped' ? 'shipped' : order.status === 'cancelled' ? 'cancelled' : 'processing'}`}>
            Fulfillment: {order.status}
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
        
        {/* Left Column: Items and Logistics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Purchased Items Card */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>Purchased Items ({order.order_items?.length || 0})</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Authenticated wardrobe selections</div>
              </div>
            </div>

            <div style={{ padding: '0 24px' }}>
              {order.order_items?.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px 0',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> · Size: {item.variant_details?.size || 'Standard'} {item.variant_details?.colour && item.variant_details.colour !== 'Default' ? `· Colour: ${item.variant_details.colour}` : ''}
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--muted)' }}>
                      <PackageCheck size={13} />
                      <span>Fulfillment Status: </span>
                      <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{item.fulfillment_status}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '2px' }}>
                      {item.quantity} × {money(Number(item.unit_price))}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>
                      {money(Number(item.total_price))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Destination Card */}
          {order.shipping_address && (
            <div className="admin-table-card" style={{ padding: '24px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <MapPin size={16} color="var(--ink)" />
                <h3 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                  Shipping & Delivery Address
                </h3>
              </div>
              <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)' }}>
                <strong style={{ display: 'block', marginBottom: '2px' }}>{order.shipping_address.recipient_name}</strong>
                <div>{order.shipping_address.address_line1}{order.shipping_address.address_line2 ? `, ${order.shipping_address.address_line2}` : ''}</div>
                <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</div>
                <div>{order.shipping_address.country}</div>
                <div style={{ marginTop: '8px', color: 'var(--muted)', fontSize: '12px' }}>Contact Phone: {order.shipping_address.phone}</div>
              </div>
            </div>
          )}

          {/* Special Instructions */}
          {order.notes && (
            <div style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '18px 20px', borderRadius: '2px' }}>
              <h4 style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 6px', color: 'var(--muted)' }}>
                Client Delivery Notes
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--ink)', margin: 0 }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column: Financial Ledger */}
        <div style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '2px',
          padding: '24px',
          position: 'sticky',
          top: '100px'
        }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, margin: '0 0 20px', letterSpacing: '-0.3px' }}>
            Payment Ledger
          </h2>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
            <span style={{ color: 'var(--muted)' }}>Subtotal</span>
            <span style={{ fontWeight: 500 }}>{money(Number(order.subtotal_amount))}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
            <span style={{ color: 'var(--muted)' }}>Consignment Weight</span>
            <span style={{ fontWeight: 500 }}>{(Number(order.total_weight_grams || 0) / 1000).toFixed(2)} kg</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '16px' }}>
            <span style={{ color: 'var(--muted)' }}>Calculated Delivery</span>
            <span style={{ fontWeight: 500 }}>
              {Number(order.shipping_amount) === 0 ? 'Complimentary' : money(Number(order.shipping_amount))}
            </span>
          </div>

          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--ink)',
            marginBottom: '24px'
          }}>
            <span>Total Settled</span>
            <span>{money(Number(order.total_amount))}</span>
          </div>

          <div style={{
            background: '#fff',
            border: '1px solid var(--border)',
            padding: '14px',
            borderRadius: '2px',
            fontSize: '12px',
            color: 'var(--muted)',
            lineHeight: 1.5
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--ink)', fontWeight: 600 }}>
              <ShieldCheck size={14} />
              <span>Cryptographic Gateway Verification</span>
            </div>
            <div>Method: <strong style={{ color: 'var(--ink)' }}>{order.payment_method || 'Razorpay Online'}</strong></div>
            <div style={{ fontSize: '11px', marginTop: '4px', wordBreak: 'break-all' }}>
              Ref: {order.razorpay_payment_id || order.razorpay_order_id || 'Direct Platform Settlement'}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

