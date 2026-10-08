'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, MapPin, ShieldCheck, Printer, PackageCheck, Truck, HelpCircle } from 'lucide-react'
import { getCustomerOrderById, Order } from '@/lib/orders'
import { money } from '@/lib/catalog'
import { AccountShell } from '@/components/account/AccountShell'
import { OrderStatusTimeline } from '@/components/admin/OrderStatusTimeline'
import { PrintReceiptTrigger } from '@/components/receipt/PrintReceiptTrigger'

const humanStatusNarratives: Record<string, string> = {
  unfulfilled: 'Your order was received and authenticated. Awaiting processing.',
  pending: 'Your checkout reservation is pending final settlement.',
  confirmed: 'Your payment was confirmed. Preparing your wardrobe pieces.',
  processing: 'Your pieces are being hand-inspected and packaged for dispatch.',
  dispatched: 'Your parcel has been handed over to our courier partner.',
  shipped: 'Your parcel is in transit to your registered delivery address.',
  in_transit: 'Your consignment is on its way to the final delivery hub.',
  out_for_delivery: 'Your order is out with the delivery courier today.',
  delivered: 'Your order has been safely delivered to your address.',
  cancelled: 'This order was cancelled. Unused reservation was released.',
  returned: 'This return has been logged and received.'
}

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
      <AccountShell title="Order Dossier">
        <div className="account-loading-card">
          <p>Retrieving order details and tracking status...</p>
        </div>
      </AccountShell>
    )
  }

  if (error || !order) {
    return (
      <AccountShell title="Order Not Found">
        <div className="account-empty-order-card">
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: '0 0 10px' }}>Order Not Found</h3>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px' }}>
            {error || 'This order does not exist or you do not have permission to view it.'}
          </p>
          <Link href="/account/orders" className="button button-primary" style={{ padding: '10px 24px', fontSize: '12px' }}>
            Back to Orders
          </Link>
        </div>
      </AccountShell>
    )
  }

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
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

  const narrative = humanStatusNarratives[order.status] || 'Order details recorded in system.'

  return (
    <AccountShell title={`Order #${order.order_number}`} subtitle={`Recorded on ${formatDateTime(order.created_at)}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Back Link & Print */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link
            href="/account/orders"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}
          >
            <ArrowLeft size={14} />
            <span>Back to All Orders</span>
          </Link>

          <PrintReceiptTrigger
            order={order}
            audience="customer"
            label="Print Receipt"
            className="button button-ghost"
            style={{ fontSize: '12px', padding: '6px 14px', border: '1px solid var(--border)' }}
          />
        </div>

        {/* Milestone Progression Card */}
        <div className="account-recent-order-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <span className="account-order-kicker">FULFILLMENT STATUS</span>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 400, margin: '2px 0 4px', color: 'var(--ink)' }}>
                {order.status === 'delivered' ? 'Delivered' : order.status === 'shipped' ? 'In Transit' : 'In Progress'}
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                {narrative}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                {order.payment_status?.toUpperCase()}
              </span>
              <span className={`status-pill ${order.status === 'delivered' ? 'approved' : order.status === 'cancelled' ? 'rejected' : 'processing'}`}>
                {order.status?.toUpperCase()}
              </span>
            </div>
          </div>

          <OrderStatusTimeline status={order.status} paymentStatus={order.payment_status} />
        </div>

        {/* Two Column Breakdown */}
        <div className="admin-grid-two-col">
          {/* Purchased Items */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <div>
                <h3 className="admin-card-heading">Purchased Items ({order.order_items?.length || 0})</h3>
                <p className="admin-card-subheading">Authenticated SENO selections</p>
              </div>
            </div>

            <div style={{ padding: '0 24px' }}>
              {order.order_items?.map(item => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '20px 0',
                    borderBottom: '1px solid var(--border)',
                    gap: '16px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                      SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> · Size: {item.variant_details?.size || 'Standard'} {item.variant_details?.colour && item.variant_details.colour !== 'Default' ? `· Colour: ${item.variant_details.colour}` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Status: <strong style={{ color: 'var(--ink)', textTransform: 'capitalize' }}>{item.fulfillment_status}</strong>
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

          {/* Delivery Destination & Financial Ledger */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Delivery Destination */}
            {order.shipping_address && (
              <div className="admin-table-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <MapPin size={16} color="var(--ink)" />
                  <h3 style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: 0 }}>
                    Shipping Destination
                  </h3>
                </div>
                <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)' }}>
                  <strong style={{ display: 'block', marginBottom: '2px' }}>{order.shipping_address.recipient_name}</strong>
                  <div>{order.shipping_address.address_line1}{order.shipping_address.address_line2 ? `, ${order.shipping_address.address_line2}` : ''}</div>
                  <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</div>
                  <div>{order.shipping_address.country}</div>
                  <div style={{ marginTop: '8px', color: 'var(--muted)', fontSize: '12px' }}>Phone: {order.shipping_address.phone}</div>
                </div>
              </div>
            )}

            {/* Payment Ledger */}
            <div className="admin-table-card" style={{ padding: '24px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 400, margin: '0 0 16px' }}>
                Payment Summary
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                  <span>{money(Number(order.subtotal_amount))}</span>
                </div>

                {order.discount_amount && Number(order.discount_amount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                    <span>Promotion ({order.promotion_code || 'APPLIED'})</span>
                    <span>-{money(Number(order.discount_amount))}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--muted)' }}>Shipping</span>
                  <span>{Number(order.shipping_amount) === 0 ? 'Complimentary' : money(Number(order.shipping_amount))}</span>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
                  <span>Total Settled</span>
                  <span>{money(Number(order.total_amount))}</span>
                </div>
              </div>

              <div style={{ marginTop: '20px', padding: '14px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                  <ShieldCheck size={14} />
                  <span>Gateway Settlement</span>
                </div>
                <div>Method: <strong style={{ color: 'var(--ink)' }}>{order.payment_method || 'Online Razorpay'}</strong></div>
                <div style={{ color: 'var(--muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                  Ref: {order.razorpay_payment_id || order.razorpay_order_id || 'Direct Settlement'}
                </div>
              </div>

              {/* Need help concierge link */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Link
                  href="/contact"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}
                >
                  <HelpCircle size={14} />
                  <span>Inquire about this order with SENO Concierge</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AccountShell>
  )
}
