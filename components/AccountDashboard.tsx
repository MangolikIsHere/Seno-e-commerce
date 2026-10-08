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
  Clock,
  Bell,
  Shield,
  HelpCircle,
  Truck,
  ArrowRight
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/context/AuthContext'
import { getCustomerOrders, Order } from '@/lib/orders'
import { money } from '@/lib/catalog'
import { useStore } from '@/context/StoreContext'
import { useNotifications } from '@/context/NotificationContext'
import { AccountShell } from '@/components/account/AccountShell'
import { OrderStatusTimeline } from '@/components/admin/OrderStatusTimeline'
import { PrintReceiptTrigger } from '@/components/receipt/PrintReceiptTrigger'

const fulfillmentLabels: Record<string, string> = {
  unfulfilled: 'Order Placed',
  pending: 'Awaiting Settlement',
  processing: 'Preparing for Dispatch',
  dispatched: 'Dispatched',
  shipped: 'In Transit',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery Today',
  delivered: 'Delivered',
  cancelled: 'Order Cancelled',
  returned: 'Returned',
  delivery_failed: 'Delivery Unsuccessful'
}

const formatOrderDate = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return isoString
  }
}

export function AccountDashboard() {
  const router = useRouter()
  const { profile } = useAuth()
  const { wishlist } = useStore()
  const { unreadCount } = useNotifications()

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    getCustomerOrders().then(({ orders: customerOrders }) => {
      setOrders(customerOrders || [])
      setLoadingOrders(false)
    })
  }, [])

  const recentOrder = orders.length > 0 ? orders[0] : null
  const recentOrderItems = recentOrder?.order_items || []

  return (
    <AccountShell>
      {/* 1. Recent Order Spotlight Card */}
      <section className="account-section-block">
        <div className="account-section-header">
          <div>
            <h2 className="account-section-heading">Recent Order</h2>
            <p className="account-section-subheading">Latest transaction and tracking status</p>
          </div>
          {orders.length > 1 && (
            <Link href="/account/orders" className="account-text-link">
              <span>View all ({orders.length})</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>

        {loadingOrders ? (
          <div className="account-loading-card">
            <p>Retrieving your wardrobe orders...</p>
          </div>
        ) : recentOrder ? (
          <div className="account-recent-order-card">
            <div className="account-recent-order-top">
              <div>
                <span className="account-order-kicker">LATEST PURCHASE</span>
                <h3 className="account-order-title">
                  Order #{recentOrder.order_number}
                </h3>
                <span className="account-order-date">
                  Placed on {formatOrderDate(recentOrder.created_at)}
                </span>
              </div>
              <div className="account-order-status-badge-wrap">
                <span className={`status-pill ${recentOrder.status === 'delivered' ? 'approved' : recentOrder.status === 'cancelled' ? 'rejected' : 'processing'}`}>
                  {fulfillmentLabels[recentOrder.status] || recentOrder.status?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Visual Timeline for the recent order */}
            <div style={{ margin: '20px 0' }}>
              <OrderStatusTimeline status={recentOrder.status} paymentStatus={recentOrder.payment_status} />
            </div>

            {/* Order Items Summary */}
            <div className="account-order-items-preview">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recentOrderItems.slice(0, 3).map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: 'var(--ink)' }}>
                      <strong>{item.quantity}×</strong> {item.product_name}
                      {item.variant_details?.size ? ` (Size: ${item.variant_details.size})` : ''}
                    </span>
                    <span style={{ fontWeight: 500 }}>{money(Number(item.total_price))}</span>
                  </div>
                ))}
                {recentOrderItems.length > 3 && (
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    +{recentOrderItems.length - 3} more items in this shipment
                  </span>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="account-recent-order-footer">
              <div className="account-order-total-settled">
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px' }}>Total Settled</span>
                <strong style={{ fontSize: '16px', color: 'var(--ink)' }}>{money(Number(recentOrder.total_amount))}</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <PrintReceiptTrigger
                  order={recentOrder}
                  audience="customer"
                  label="Receipt"
                  className="button button-ghost"
                  style={{ fontSize: '12px', padding: '9px 14px', border: '1px solid var(--border)' }}
                />
                <Link
                  href={`/account/orders/${recentOrder.id}`}
                  className="button button-primary"
                  style={{ fontSize: '12px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>Track & Manage</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="account-empty-order-card">
            <ShoppingBag size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 400, margin: '0 0 6px' }}>
              Your Wardrobe History is Empty
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '13px', maxWidth: '380px', margin: '0 auto 20px', lineHeight: 1.6 }}>
              Explore curated contemporary silhouettes, tailored essentials, and seasonal collections made for you.
            </p>
            <Link href="/collections/all" className="button button-primary" style={{ padding: '12px 24px', fontSize: '12px' }}>
              Explore Curated Collection
            </Link>
          </div>
        )}
      </section>

      {/* 2. Direct Task-Oriented Quick Action Grid */}
      <section className="account-section-block" style={{ marginTop: '36px' }}>
        <div className="account-section-header">
          <div>
            <h2 className="account-section-heading">Quick Actions</h2>
            <p className="account-section-subheading">Direct access to your client preferences</p>
          </div>
        </div>

        <div className="account-actions-grid">
          {/* Orders */}
          <Link href="/account/orders" className="account-action-card">
            <div className="account-action-icon-wrap">
              <ShoppingBag size={20} color="var(--ink)" />
            </div>
            <div className="account-action-text">
              <h3 className="account-action-title">My Orders</h3>
              <p className="account-action-desc">
                {orders.length} recorded {orders.length === 1 ? 'transaction' : 'transactions'}
              </p>
            </div>
            <ChevronRight size={16} color="var(--muted)" className="account-action-chevron" />
          </Link>

          {/* Wishlist */}
          <Link href="/wishlist" className="account-action-card">
            <div className="account-action-icon-wrap">
              <Heart size={20} color="var(--ink)" />
            </div>
            <div className="account-action-text">
              <h3 className="account-action-title">Saved Wishlist</h3>
              <p className="account-action-desc">
                {wishlist.length} saved {wishlist.length === 1 ? 'silhouette' : 'silhouettes'}
              </p>
            </div>
            <ChevronRight size={16} color="var(--muted)" className="account-action-chevron" />
          </Link>

          {/* Addresses */}
          <Link href="/account/addresses" className="account-action-card">
            <div className="account-action-icon-wrap">
              <MapPin size={20} color="var(--ink)" />
            </div>
            <div className="account-action-text">
              <h3 className="account-action-title">Saved Addresses</h3>
              <p className="account-action-desc">Manage delivery destinations</p>
            </div>
            <ChevronRight size={16} color="var(--muted)" className="account-action-chevron" />
          </Link>

          {/* Notifications */}
          <Link href="/account/notifications" className="account-action-card">
            <div className="account-action-icon-wrap">
              <Bell size={20} color="var(--ink)" />
            </div>
            <div className="account-action-text">
              <h3 className="account-action-title">Updates & Alerts</h3>
              <p className="account-action-desc">
                {unreadCount > 0 ? `${unreadCount} unread update` : 'Shipment notifications'}
              </p>
            </div>
            <ChevronRight size={16} color="var(--muted)" className="account-action-chevron" />
          </Link>

          {/* Security */}
          <Link href="/account/update-password" className="account-action-card">
            <div className="account-action-icon-wrap">
              <Shield size={20} color="var(--ink)" />
            </div>
            <div className="account-action-text">
              <h3 className="account-action-title">Account Security</h3>
              <p className="account-action-desc">Password & sign-in preferences</p>
            </div>
            <ChevronRight size={16} color="var(--muted)" className="account-action-chevron" />
          </Link>

          {/* Concierge & Support */}
          <Link href="/contact" className="account-action-card">
            <div className="account-action-icon-wrap">
              <HelpCircle size={20} color="var(--ink)" />
            </div>
            <div className="account-action-text">
              <h3 className="account-action-title">Client Concierge</h3>
              <p className="account-action-desc">Assistance & sizing queries</p>
            </div>
            <ChevronRight size={16} color="var(--muted)" className="account-action-chevron" />
          </Link>
        </div>
      </section>
    </AccountShell>
  )
}
