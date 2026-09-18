'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ShoppingBag, 
  MapPin, 
  Heart, 
  ChevronRight, 
  ShieldCheck, 
  Store, 
  LogOut, 
  Package, 
  ArrowUpRight,
  Clock
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { getCustomerOrders, Order } from '@/lib/orders'
import { money } from '@/lib/catalog'
import { useStore } from '@/context/StoreContext'

const fulfillmentLabels: Record<string, string> = {
  unfulfilled: 'Order Placed',
  processing: 'Processing',
  dispatched: 'Dispatched',
  shipped: 'Dispatched',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled by Seller',
  returned: 'Returned',
  delivery_failed: 'Delivery Failed'
}

const fulfillmentSummaries: Record<string, string> = {
  unfulfilled: 'Your order has been received.',
  processing: 'Your order is being prepared.',
  dispatched: 'Your order has been shipped.',
  shipped: 'Your order has been shipped.',
  in_transit: 'Your order is on the way.',
  out_for_delivery: 'Your order is out for delivery today.',
  delivered: 'Your order has been delivered.',
  cancelled: 'This item was cancelled by the seller.',
  returned: 'This item has been returned.',
  delivery_failed: 'Delivery could not be completed.'
}

const formatOrderDate = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return isoString
  }
}

const getOrderItems = (order: Order) => order.order_items || []

const getOrderStatus = (order: Order) => {
  const items = getOrderItems(order)
  if (items.length === 0) return order.status

  const statuses = Array.from(new Set(items.map(item => item.fulfillment_status || 'unfulfilled')))
  return statuses.length === 1 ? statuses[0] : null
}

const formatStatus = (status: string) => fulfillmentLabels[status] || status.replaceAll('_', ' ')

const formatDelivery = (date: string, delivered: boolean) => {
  const deliveryDate = new Date(date)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const dateKey = deliveryDate.toLocaleDateString('en-CA')
  const todayKey = today.toLocaleDateString('en-CA')
  const tomorrowKey = tomorrow.toLocaleDateString('en-CA')

  if (delivered) return { label: 'Delivered', value: '' }
  if (dateKey === todayKey) return { label: 'Arriving today', value: '' }
  if (dateKey === tomorrowKey) return { label: 'Arriving tomorrow', value: '' }
  if (deliveryDate < today) return { label: 'Delivery update', value: 'Expected delivery date has passed.' }
  return { label: 'Arriving', value: formatOrderDate(date) }
}

export function AccountDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { profile } = useAuth()
  const { wishlist } = useStore()

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview')

  useEffect(() => {
    getCustomerOrders().then(({ orders: customerOrders }) => {
      setOrders(customerOrders || [])
      setLoadingOrders(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <main className="static-page-container" style={{ maxWidth: '1040px', paddingBottom: '96px' }}>
      {/* Account Suite Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: '24px',
        paddingBottom: '32px',
        borderBottom: '1px solid var(--border)',
        marginBottom: '36px'
      }}>
        <div>
          <span className="section-kicker">CLIENT SUITE</span>
          <h1 style={{
            fontFamily: 'Georgia, serif',
            fontSize: '32px',
            fontWeight: 400,
            letterSpacing: '-0.5px',
            margin: '6px 0 8px'
          }}>
            {profile?.full_name ? `Welcome back, ${profile.full_name}` : 'Welcome back'}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
            {profile?.email}
          </p>
        </div>

        {/* Role & Fast Switcher */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {profile?.role === 'admin' && (
            <Link
              href="/admin/dashboard"
              className="button button-primary"
              style={{ fontSize: '12px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldCheck size={14} />
              <span>Admin Console</span>
              <ArrowUpRight size={13} />
            </Link>
          )}

          {profile?.role === 'reseller' && (
            <Link
              href="/seller/dashboard"
              className="button button-primary"
              style={{ fontSize: '12px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Store size={14} />
              <span>Seller Portal</span>
              <ArrowUpRight size={13} />
            </Link>
          )}

          {profile?.role === 'customer' && (
            <Link
              href="/seller/register"
              className="button button-outline"
              style={{ fontSize: '12px', padding: '8px 16px' }}
            >
              Become a Seller
            </Link>
          )}

          <button
            onClick={handleSignOut}
            className="button button-ghost"
            style={{ fontSize: '12px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Sign out of account"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <nav className="account-section-nav" aria-label="Account navigation">
        <span className="account-section-nav-label">ACCOUNT</span>
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
          Orders <span>{orders.length}</span>
        </button>
        <Link href="/wishlist">Wishlist <span>{wishlist.length}</span></Link>
        <Link href="/account/addresses">Addresses</Link>
        {profile?.role === 'customer' && <Link href="/seller/register">Sell with SENO</Link>}
      </nav>

      {/* Navigation Quick Cards */}
      <div className="admin-grid admin-grid-3" style={{ marginBottom: '40px', gap: '16px' }}>
        <div 
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '20px',
            background: activeTab === 'orders' ? '#fff' : 'var(--surface-subtle)',
            border: activeTab === 'orders' ? '1px solid var(--ink)' : '1px solid var(--border)',
            borderRadius: '2px',
            cursor: 'pointer',
            transition: 'border-color 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--ink)' }}>
              My Orders
            </span>
            <ShoppingBag size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)' }}>
            {orders.length}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {orders.length === 1 ? 'Recorded transaction' : 'Recorded transactions'}
          </span>
        </div>

        <Link
          href="/wishlist"
          style={{
            padding: '20px',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: '2px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'block'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--ink)' }}>
              Saved Silhouettes
            </span>
            <Heart size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 600, color: 'var(--ink)' }}>
            {wishlist.length}
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Saved to your wishlist
          </span>
        </Link>

        <Link
          href="/account/addresses"
          style={{
            padding: '20px',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: '2px',
            textDecoration: 'none',
            color: 'inherit',
            display: 'block'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--ink)' }}>
              Saved Addresses
            </span>
            <MapPin size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '4px 0 2px' }}>
            Delivery Directory
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Manage delivery locations
          </span>
        </Link>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--border)', marginBottom: '32px' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--ink)' : '2px solid transparent',
            padding: '10px 4px',
            fontSize: '13px',
            fontWeight: activeTab === 'overview' ? 600 : 400,
            color: activeTab === 'overview' ? 'var(--ink)' : 'var(--muted)',
            cursor: 'pointer',
            letterSpacing: '0.5px'
          }}
        >
          Overview & Recent
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'orders' ? '2px solid var(--ink)' : '2px solid transparent',
            padding: '10px 4px',
            fontSize: '13px',
            fontWeight: activeTab === 'orders' ? 600 : 400,
            color: activeTab === 'orders' ? 'var(--ink)' : 'var(--muted)',
            cursor: 'pointer',
            letterSpacing: '0.5px'
          }}
        >
          All Orders ({orders.length})
        </button>
      </div>

      {/* Content Section */}
      {loadingOrders ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
          Loading your client profile...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ border: '1px solid var(--border)', padding: '64px 24px', textAlign: 'center', background: 'var(--surface-subtle)' }}>
          <ShoppingBag size={40} color="var(--muted)" strokeWidth={1.2} style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, margin: '0 0 8px' }}>
            Your order history is waiting
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '420px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Your completed wardrobe purchases and luxury shipments will be archived here with detailed tracking.
          </p>
          <Link href="/collections/all" className="button button-primary" style={{ padding: '12px 24px', fontSize: '12px' }}>
            Explore Curated Collections
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {(activeTab === 'overview' ? orders.slice(0, 3) : orders).map(order => (
            <div
              key={order.id}
              style={{
                border: '1px solid var(--border)',
                background: '#fff',
                borderRadius: '2px',
                overflow: 'hidden'
              }}
            >
              {(() => {
                const items = getOrderItems(order)
                const orderStatus = getOrderStatus(order)
                const showItemStatuses = items.length > 1 && !orderStatus
                const deliveryItems = items.filter(item => item.estimated_delivery_date)
                const allDelivered = items.length > 0 && items.every(item => item.fulfillment_status === 'delivered')
                const deliveryItem = deliveryItems[0]
                const deliveryDates = Array.from(new Set(deliveryItems.map(item => item.estimated_delivery_date)))
                const delivery = deliveryDates.length === 1 && deliveryItem?.estimated_delivery_date
                  ? formatDelivery(deliveryItem.estimated_delivery_date, allDelivered)
                  : null
                const trackingItem = items.find(item => item.tracking_number)
                const refundStatus = order.payment_status === 'refunded' ? 'Refunded' : 'Processing'

                return (
                  <>
              {/* Order Card Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px 20px',
                background: 'var(--surface-subtle)',
                borderBottom: '1px solid var(--border)',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Order</span>
                    <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{order.order_number}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Placed</span>
                    <span style={{ fontWeight: 600 }}>{formatOrderDate(order.created_at)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Total</span>
                    <span style={{ fontWeight: 600 }}>{money(Number(order.total_amount))}</span>
                  </div>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="button button-outline"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    <span>View Order</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>

              {/* Order Card Body */}
              <div style={{ padding: '20px' }}>
                {!showItemStatuses && orderStatus && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                      <span className="section-kicker">Order Status</span>
                      <div style={{ marginTop: '6px' }}><span className={`status-pill ${orderStatus === 'delivered' ? 'delivered' : orderStatus === 'cancelled' ? 'cancelled' : 'processing'}`}>{formatStatus(orderStatus)}</span></div>
                      <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>{fulfillmentSummaries[orderStatus] || 'Your order is being updated.'}</div>
                    </div>
                    {delivery && (
                      <div>
                        <span className="section-kicker">{delivery.label}</span>
                        {delivery.value && <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 600 }}>{delivery.value}</div>}
                      </div>
                    )}
                    <div>
                      <span className="section-kicker">Payment</span>
                      <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 600 }}>{order.payment_status === 'paid' || order.payment_status === 'refunded' ? 'Paid' : order.payment_status.replace('_', ' ')}</div>
                    </div>
                    {orderStatus === 'cancelled' && (
                      <div>
                        <span className="section-kicker">Refund</span>
                        <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 600 }}>{money(Number(order.total_amount))} · {refundStatus}</div>
                      </div>
                    )}
                    {trackingItem && (
                      <div>
                        <span className="section-kicker">Tracking</span>
                        <div style={{ marginTop: '6px', fontSize: '12px' }}>{trackingItem.carrier || 'Carrier'} · {trackingItem.tracking_number}</div>
                      </div>
                    )}
                  </div>
                )}

                {showItemStatuses && <div style={{ marginBottom: '18px' }}><span className="section-kicker">Order Status</span><p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--muted)' }}>Items in this order have different fulfillment states.</p></div>}

                {/* Items preview list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {items.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px',
                        paddingBottom: '14px',
                        borderBottom: '1px solid var(--border)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '12px', marginTop: '4px' }}>Size: {item.variant_details?.size || 'Standard'} {item.variant_details?.colour && item.variant_details.colour !== 'Default' ? `· ${item.variant_details.colour}` : ''} · Qty: {item.quantity}</div>
                        {showItemStatuses && <div style={{ marginTop: '8px' }}><span className={`status-pill ${item.fulfillment_status === 'delivered' ? 'delivered' : item.fulfillment_status === 'cancelled' ? 'cancelled' : 'processing'}`}>{formatStatus(item.fulfillment_status)}</span><div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>{fulfillmentSummaries[item.fulfillment_status] || 'This item is being updated.'}</div></div>}
                        {item.estimated_delivery_date && <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--muted)' }}>{formatDelivery(item.estimated_delivery_date, item.fulfillment_status === 'delivered').label} {formatDelivery(item.estimated_delivery_date, item.fulfillment_status === 'delivered').value}</div>}
                        {item.tracking_number && <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>Tracking: {item.carrier || 'Carrier'} · {item.tracking_number}</div>}
                        {item.fulfillment_status === 'cancelled' && <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--muted)' }}>Refund: {money(Number(item.total_price))} · {refundStatus}</div>}
                      </div>
                      <span style={{ fontWeight: 600 }}>{money(Number(item.total_price))}</span>
                    </div>
                  ))}
                </div>

                {order.shipping_address && (
                  <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--muted)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>Destination: </span>
                    {order.shipping_address.address_line1}, {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '18px' }}>
                  {trackingItem && <Link href={`/account/orders/${order.id}/track`} className="button button-outline" style={{ fontSize: '11px', padding: '8px 12px' }}>Track Order</Link>}
                  <Link href={`/account/orders/${order.id}`} className="button button-primary" style={{ fontSize: '11px', padding: '8px 12px' }}>View Receipt</Link>
                </div>
              </div>
                  </>
                )
              })()}
            </div>
          ))}

          {activeTab === 'overview' && orders.length > 3 && (
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <button
                onClick={() => setActiveTab('orders')}
                className="button button-outline"
                style={{ fontSize: '12px', padding: '10px 20px' }}
              >
                View All {orders.length} Orders
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  )
}

