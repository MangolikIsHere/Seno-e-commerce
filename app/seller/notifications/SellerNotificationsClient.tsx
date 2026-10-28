'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Check,
  CheckCircle2,
  AlertCircle,
  Package,
  Truck,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { NotificationRecord, NotificationType } from '@/lib/notifications/types'

export function SellerNotificationsClient({ initialNotifications }: { initialNotifications: NotificationRecord[] }) {
  const router = useRouter()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    pushEnabled,
    togglePushNotifications,
    isPushSupported
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread' | 'products' | 'orders' | 'financial'>('all')

  const displayedNotifications = (notifications.length > 0 ? notifications : initialNotifications).filter(n => {
    if (filter === 'unread') return !n.read_at
    const notifType = (n.data?.original_type as string) || n.type
    if (filter === 'products') {
      return notifType.includes('product') || notifType.includes('stock')
    }
    if (filter === 'orders') {
      return notifType.includes('order') || notifType.includes('dispatched') || notifType.includes('delivered')
    }
    if (filter === 'financial') {
      return notifType.includes('commission') || notifType.includes('refund') || notifType.includes('payment')
    }
    return true
  })

  const handleNotificationClick = async (notif: NotificationRecord) => {
    if (!notif.read_at) {
      await markAsRead(notif.id)
    }
    if (notif.data?.deep_link) {
      router.push(notif.data.deep_link as string)
    }
  }

  const getIcon = (type: NotificationType, data?: any) => {
    const effectiveType = (data?.original_type as NotificationType) || type
    switch (effectiveType) {
      case 'seller_product_approved':
      case 'seller_account_approved':
        return <CheckCircle2 size={18} color="#16a34a" />
      case 'seller_product_rejected':
        return <AlertCircle size={18} color="#e11d48" />
      case 'seller_product_suspended':
      case 'seller_account_suspended':
      case 'seller_account_rejected':
      case 'order_cancelled':
      case 'seller_item_cancelled':
        return <AlertCircle size={18} color="#e11d48" />
      case 'seller_new_order':
        return <Package size={18} color="#2563eb" />
      case 'refund_completed':
      case 'refund_initiated':
        return <RotateCcw size={18} color="#d97706" />
      case 'seller_commission_updated':
        return <CheckCircle2 size={18} color="#0284c7" />
      case 'seller_low_stock':
        return <AlertCircle size={18} color="#b45309" />
      default:
        return <Bell size={18} color="var(--muted)" />
    }
  }

  return (
    <div>
      {/* Top Header */}
      <div className="seller-orders-header-strip" style={{ marginBottom: '24px' }}>
        <div>
          <span className="section-kicker">CENTRALIZED INBOX</span>
          <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: 'clamp(22px, 4vw, 28px)' }}>
            Notifications & Announcements
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
            Real-time administrative approvals, inventory alerts, commission updates, and customer orders.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="button button-outline"
              onClick={markAllAsRead}
              style={{ fontSize: '12px', padding: '8px 14px', gap: '6px' }}
            >
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Web Push Configuration Card */}
      {isPushSupported && (
        <div className="seller-push-optin-card" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: pushEnabled ? '#f0fdf4' : '#eff6ff', border: `1px solid ${pushEnabled ? '#bbf7d0' : '#bfdbfe'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color={pushEnabled ? '#16a34a' : '#2563eb'} />
            </div>
            <div>
              <strong style={{ fontSize: '13.5px', display: 'block', color: 'var(--ink)' }}>
                Browser Push Notifications {pushEnabled ? '(Active)' : '(Disabled)'}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {pushEnabled
                  ? 'Active: You are receiving device alerts for order items and curation decisions.'
                  : 'Receive immediate device alerts for new product approvals and new customer orders even when your dashboard tab is closed.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={pushEnabled ? 'button button-outline' : 'button button-primary'}
            onClick={togglePushNotifications}
            style={{ fontSize: '12px', padding: '8px 16px', whiteSpace: 'nowrap' }}
          >
            {pushEnabled ? 'Disable Push' : 'Enable Push Alerts'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="admin-table-card" style={{ padding: '14px 16px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`seller-chip-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts ({notifications.length || initialNotifications.length})
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${filter === 'unread' ? 'active tab-urgent' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${filter === 'products' ? 'active' : ''}`}
            onClick={() => setFilter('products')}
          >
            Products & Approvals
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${filter === 'orders' ? 'active' : ''}`}
            onClick={() => setFilter('orders')}
          >
            Orders & Shipments
          </button>
          <button
            type="button"
            className={`seller-chip-tab ${filter === 'financial' ? 'active' : ''}`}
            onClick={() => setFilter('financial')}
          >
            Commission & Refunds
          </button>
        </div>
      </div>

      {/* Notification Items Feed */}
      {displayedNotifications.length === 0 ? (
        <div className="admin-table-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <Bell size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 6px' }}>All caught up</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
            {filter === 'unread'
              ? 'You have no unread notifications at this time.'
              : 'No notification records match this category.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {displayedNotifications.map(notif => {
            const isUnread = !notif.read_at
            return (
              <div
                key={notif.id}
                className={`seller-notif-row ${isUnread ? 'notif-unread-active' : ''}`}
                onClick={() => handleNotificationClick(notif)}
                role="button"
                tabIndex={0}
              >
                <div className="notif-row-icon">
                  {getIcon(notif.type, notif.data)}
                </div>

                <div className="notif-row-body">
                  <div className="notif-row-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong className="notif-row-title">{notif.title}</strong>
                      {isUnread && <span className="notif-unread-badge">New</span>}
                    </div>
                    <span className="notif-row-time">
                      {new Date(notif.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="notif-row-message">{notif.message}</p>
                </div>

                {notif.data?.deep_link && (
                  <div className="notif-row-action">
                    <ArrowRight size={14} color="var(--muted)" />
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
