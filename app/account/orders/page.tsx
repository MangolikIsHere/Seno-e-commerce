'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShoppingBag, ChevronRight, Package, ArrowLeft, Clock } from 'lucide-react'
import { getCustomerOrders, Order } from '@/lib/orders'
import { money } from '@/lib/catalog'
import { AccountShell } from '@/components/account/AccountShell'
import { PrintReceiptTrigger } from '@/components/receipt/PrintReceiptTrigger'

const fulfillmentLabels: Record<string, string> = {
  unfulfilled: 'Order Placed',
  pending: 'Awaiting Settlement',
  processing: 'Preparing for Dispatch',
  dispatched: 'Dispatched',
  shipped: 'In Transit',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  delivery_failed: 'Delivery Failed'
}

export default function AccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'delivered'>('all')

  useEffect(() => {
    getCustomerOrders().then(({ orders: customerOrders }) => {
      setOrders(customerOrders || [])
      setLoading(false)
    })
  }, [])

  const filteredOrders = orders.filter(order => {
    if (activeFilter === 'delivered') return order.status === 'delivered'
    if (activeFilter === 'active') return order.status !== 'delivered' && order.status !== 'cancelled'
    return true
  })

  return (
    <AccountShell title="My Orders" subtitle="Track consignments, delivery progression, and order history">
      <div className="account-section-block">
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', overflowX: 'auto' }}>
          <button
            onClick={() => setActiveFilter('all')}
            className={`admin-filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
          >
            All Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveFilter('active')}
            className={`admin-filter-chip ${activeFilter === 'active' ? 'active' : ''}`}
          >
            Active & In Transit ({orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setActiveFilter('delivered')}
            className={`admin-filter-chip ${activeFilter === 'delivered' ? 'active' : ''}`}
          >
            Delivered ({orders.filter(o => o.status === 'delivered').length})
          </button>
        </div>

        {loading ? (
          <div className="account-loading-card">
            <p>Retrieving your order dossiers...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="account-empty-order-card">
            <ShoppingBag size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, margin: '0 0 6px' }}>
              No Orders Found
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              {activeFilter !== 'all' ? 'No orders match this status filter.' : 'Your wardrobe purchases and shipments will appear here.'}
            </p>
            <Link href="/collections/all" className="button button-primary" style={{ padding: '12px 24px', fontSize: '12px' }}>
              Explore Collection
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredOrders.map(order => {
              const items = order.order_items || []
              const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })

              return (
                <div key={order.id} className="account-order-item-card">
                  <div className="account-order-item-header">
                    <div>
                      <span className="account-order-item-num">Order #{order.order_number}</span>
                      <span className="account-order-item-date">Placed on {orderDate}</span>
                    </div>
                    <span className={`status-pill ${order.status === 'delivered' ? 'approved' : order.status === 'cancelled' ? 'rejected' : 'processing'}`}>
                      {fulfillmentLabels[order.status] || order.status}
                    </span>
                  </div>

                  <div className="account-order-item-body">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {items.slice(0, 3).map((item: any) => (
                          <div key={item.id} style={{ fontSize: '13px', color: 'var(--ink)' }}>
                            <strong>{item.quantity}×</strong> {item.product_name}
                            {item.variant_details?.size ? ` · Size ${item.variant_details.size}` : ''}
                          </div>
                        ))}
                        {items.length > 3 && (
                          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                            +{items.length - 3} additional pieces
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block' }}>Settled Total</span>
                      <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{money(Number(order.total_amount))}</strong>
                    </div>
                  </div>

                  <div className="account-order-item-footer" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="button button-outline"
                      style={{ fontSize: '12px', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>View Order Dossier</span>
                      <ChevronRight size={14} />
                    </Link>
                    <PrintReceiptTrigger
                      order={order}
                      audience="customer"
                      label="Receipt"
                      className="button button-ghost"
                      style={{ fontSize: '12px', padding: '8px 14px', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AccountShell>
  )
}
