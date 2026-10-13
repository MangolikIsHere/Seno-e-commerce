'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Truck,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Printer
} from 'lucide-react'
import { money } from '@/lib/catalog'
import { FulfillmentForm } from './FulfillmentForm'
import { PrintButton } from '@/components/PrintButton'

export function SellerOrdersClient({ orders }: { orders: any[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      const q = query.trim().toLowerCase()
      if (q) {
        const orderNum = item.orders?.order_number?.toLowerCase() || ''
        const prodName = item.product_name?.toLowerCase() || ''
        const recipient = item.orders?.shipping_address?.recipient_name?.toLowerCase() || ''
        if (!orderNum.includes(q) && !prodName.includes(q) && !recipient.includes(q)) {
          return false
        }
      }

      const st = item.fulfillment_status || 'unfulfilled'
      if (statusFilter === 'unfulfilled' && st !== 'unfulfilled') return false
      if (statusFilter === 'processing' && st !== 'processing') return false
      if (statusFilter === 'transit' && !['dispatched', 'in_transit', 'out_for_delivery'].includes(st)) return false
      if (statusFilter === 'delivered' && st !== 'delivered') return false
      if (statusFilter === 'cancelled' && !['cancelled', 'returned', 'delivery_failed'].includes(st)) return false

      return true
    })
  }, [orders, query, statusFilter])

  const counts = useMemo(() => ({
    all: orders.length,
    unfulfilled: orders.filter(o => (o.fulfillment_status || 'unfulfilled') === 'unfulfilled').length,
    processing: orders.filter(o => o.fulfillment_status === 'processing').length,
    transit: orders.filter(o => ['dispatched', 'in_transit', 'out_for_delivery'].includes(o.fulfillment_status)).length,
    delivered: orders.filter(o => o.fulfillment_status === 'delivered').length
  }), [orders])

  return (
    <div>
      {/* Top Header & Print */}
      <div className="seller-orders-header-strip">
        <div>
          <span className="section-kicker">CONSIGNMENT DISPATCH</span>
          <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: 'clamp(22px, 4vw, 28px)' }}>
            Fulfillment & Orders
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
            Process customer consignments, assign couriers, and provide tracking numbers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <PrintButton label="Print Packing Slips" />
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="admin-table-card seller-filter-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button
            type="button"
            className={`seller-chip-tab ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Orders ({counts.all})
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${statusFilter === 'unfulfilled' ? 'active tab-urgent' : ''}`}
            onClick={() => setStatusFilter('unfulfilled')}
          >
            New to Pack ({counts.unfulfilled})
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${statusFilter === 'processing' ? 'active' : ''}`}
            onClick={() => setStatusFilter('processing')}
          >
            Processing ({counts.processing})
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${statusFilter === 'transit' ? 'active' : ''}`}
            onClick={() => setStatusFilter('transit')}
          >
            In Transit ({counts.transit})
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${statusFilter === 'delivered' ? 'active' : ''}`}
            onClick={() => setStatusFilter('delivered')}
          >
            Delivered ({counts.delivered})
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--muted)', pointerEvents: 'none' }} />
          <input
            aria-label="Search orders"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by order #, product name, or customer name..."
            className="input-field"
            style={{ paddingLeft: '36px' }}
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="admin-table-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <Truck size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 6px' }}>No orders found</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
            {query || statusFilter !== 'all'
              ? 'No consignments match the selected search or filter.'
              : 'No customer consignments assigned to your store yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {filteredOrders.map(item => {
            const isUnfulfilled = (item.fulfillment_status || 'unfulfilled') === 'unfulfilled'
            const isDelivered = item.fulfillment_status === 'delivered'
            const isExpanded = Boolean(expandedItems[item.id])
            const address = item.orders?.shipping_address || {}

            return (
              <div
                key={item.id}
                className={`seller-order-card ${isUnfulfilled ? 'order-card-urgent' : ''}`}
              >
                {/* Header Row */}
                <div className="seller-order-card-header">
                  <div className="order-header-left">
                    <div>
                      <span className="order-meta-label">ORDER #</span>
                      <strong className="order-number-text">{item.orders?.order_number}</strong>
                    </div>
                    <div>
                      <span className="order-meta-label">DATE</span>
                      <span className="order-meta-value">
                        {new Date(item.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="order-header-right">
                    <span className="status-pill paid" style={{ fontSize: '10px' }}>
                      PAID
                    </span>
                    <span className={`status-pill ${isDelivered ? 'approved' : isUnfulfilled ? 'pending' : 'processing'}`}>
                      {item.fulfillment_status?.replace(/_/g, ' ') || 'Unfulfilled'}
                    </span>
                  </div>
                </div>

                {/* Body Row */}
                <div className="seller-order-card-body">
                  <div className="order-item-info">
                    <strong className="order-product-name">{item.product_name}</strong>
                    <div className="order-variant-details">
                      {item.variant_details?.colour && <span>Colour: {item.variant_details.colour}</span>}
                      {item.variant_details?.size && <span>Size: {item.variant_details.size}</span>}
                      <span>Qty: {item.quantity}</span>
                      {item.sku && <span className="order-sku">SKU: {item.sku}</span>}
                    </div>

                    <div className="order-shipping-summary">
                      <MapPin size={13} color="var(--muted)" />
                      <span>
                        Ship to: <strong>{address.recipient_name || 'Customer'}</strong>
                        {address.city ? ` — ${address.city}, ${address.state || ''} ${address.postal_code || ''}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Financial & Dispatch Column */}
                  <div className="order-payout-column">
                    <div>
                      <span className="order-meta-label">NET VENDOR PAYOUT</span>
                      <strong className="order-payout-amount">{money(Number(item.seller_payout_amount))}</strong>
                      <span className="order-payout-sub">
                        (Price: {money(Number(item.total_price))} | Comm: {item.commission_rate}%)
                      </span>
                    </div>

                    <div className="order-action-links">
                      <Link
                        href={`/seller/orders/${item.id}`}
                        className="button button-outline order-detail-link"
                      >
                        <span>Full Details</span>
                        <ExternalLink size={12} />
                      </Link>

                      <button
                        type="button"
                        className="button button-primary order-dispatch-toggle-btn"
                        onClick={() => toggleExpanded(item.id)}
                      >
                        <Truck size={13} />
                        <span>{isExpanded ? 'Hide Dispatch' : isUnfulfilled ? 'Dispatch Item' : 'Edit Tracking'}</span>
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Fulfillment Form Drawer */}
                {isExpanded && (
                  <div className="seller-order-dispatch-drawer">
                    <h3 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 12px' }}>
                      Update Fulfillment & Tracking
                    </h3>
                    <FulfillmentForm
                      orderItemId={item.id}
                      initialStatus={item.fulfillment_status || 'unfulfilled'}
                      initialTracking={item.tracking_number || ''}
                      initialCarrier={item.carrier || ''}
                      initialEstimatedDelivery={item.estimated_delivery_date || ''}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
