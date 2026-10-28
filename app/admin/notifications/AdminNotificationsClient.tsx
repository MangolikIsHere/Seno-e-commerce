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
  ArrowRight,
  CreditCard
} from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { NotificationRecord, NotificationType, buildNotificationDeepLink } from '@/lib/notifications/types'

export function AdminNotificationsClient({ initialNotifications }: { initialNotifications: NotificationRecord[] }) {
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

  const [filter, setFilter] = useState<'all' | 'unread' | 'orders' | 'financial' | 'inventory'>('all')

  const activeList = notifications.length > 0 ? notifications : initialNotifications

  const displayedNotifications = activeList.filter(n => {
    if (filter === 'unread') return !n.read_at
    const notifType = (n.data?.original_type as string) || n.type
    if (filter === 'orders') {
      return notifType.includes('order') || notifType.includes('dispatched') || notifType.includes('delivered')
    }
    if (filter === 'financial') {
      return notifType.includes('payment') || notifType.includes('refund') || notifType.includes('commission')
    }
    if (filter === 'inventory') {
      return notifType.includes('stock') || notifType.includes('product')
    }
    return true
  })

  const handleNotificationClick = async (notif: NotificationRecord) => {
    if (!notif.read_at) {
      await markAsRead(notif.id)
    }
    const target = notif.data?.deep_link || buildNotificationDeepLink(notif.type, notif.data || {})
    router.push(target)
  }

  const getIcon = (type: NotificationType, data?: any) => {
    const effectiveType = (data?.original_type as NotificationType) || type
    switch (effectiveType) {
      case 'admin_new_order':
      case 'order_placed':
        return <ShoppingBag size={18} color="#0f172a" />
      case 'payment_confirmed':
      case 'order_delivered':
        return <CheckCircle2 size={18} color="#16a34a" />
      case 'admin_payment_failed':
      case 'payment_failed':
      case 'order_cancelled':
        return <AlertCircle size={18} color="#e11d48" />
      case 'admin_refund_requested':
      case 'refund_completed':
      case 'refund_initiated':
      case 'order_returned':
        return <RotateCcw size={18} color="#d97706" />
      case 'admin_low_stock':
      case 'seller_low_stock':
        return <AlertCircle size={18} color="#b45309" />
      default:
        return <Bell size={18} color="var(--muted)" />
    }
  }

  return (
    <div>
      {/* Top Bar Header */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">GOVERNANCE &amp; AUDIT</span>
          <h1 className="admin-page-title">Notifications &amp; System Alerts</h1>
          <p className="admin-page-subtitle">
            Live operational feed of verified checkouts, payment events, gateway webhooks, and catalog inventory notifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              className="button button-outline"
              onClick={markAllAsRead}
              style={{ fontSize: '12px', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Push Notifications Configuration Strip */}
      {isPushSupported && (
        <div className="admin-table-card" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: pushEnabled ? '#f0fdf4' : '#f8fafc', border: `1px solid ${pushEnabled ? '#bbf7d0' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={17} color={pushEnabled ? '#16a34a' : 'var(--muted)'} />
            </div>
            <div>
              <strong style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block' }}>
                Desktop &amp; Mobile Browser Push Alerts {pushEnabled ? '(Active)' : '(Disabled)'}
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {pushEnabled
                  ? 'You are receiving real-time alerts for customer payments, orders, and refund requests on this device.'
                  : 'Enable browser push to be notified immediately when a new customer checkout or payment event occurs.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={pushEnabled ? 'button button-outline' : 'button button-primary'}
            onClick={togglePushNotifications}
            style={{ fontSize: '12px', padding: '7px 16px', whiteSpace: 'nowrap' }}
          >
            {pushEnabled ? 'Disable Push Alerts' : 'Enable Push Alerts'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="admin-table-card" style={{ padding: '14px 18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`admin-filter-chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Alerts ({activeList.length})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${filter === 'orders' ? 'active' : ''}`}
            onClick={() => setFilter('orders')}
          >
            Orders
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${filter === 'financial' ? 'active' : ''}`}
            onClick={() => setFilter('financial')}
          >
            Payments &amp; Refunds
          </button>
          <button
            type="button"
            className={`admin-filter-chip ${filter === 'inventory' ? 'active' : ''}`}
            onClick={() => setFilter('inventory')}
          >
            Inventory &amp; Products
          </button>
        </div>
      </div>

      {/* Notifications Ledger List */}
      <div className="admin-table-card">
        {displayedNotifications.length === 0 ? (
          <div className="admin-empty-card-inner" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Bell size={36} color="var(--muted)" style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '15px' }}>No notifications found</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
              {filter === 'unread' ? 'You have reviewed all pending notifications.' : 'Operational alerts and events will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {displayedNotifications.map((notif) => {
              const isUnread = !notif.read_at
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(notif)
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '14px',
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    background: isUnread ? '#fafaf9' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  <div style={{ paddingTop: '2px', flexShrink: 0 }}>
                    {getIcon(notif.type, notif.data)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '3px' }}>
                      <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{notif.title}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {new Date(notif.created_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: '0 0 6px', lineHeight: 1.5 }}>
                      {notif.message}
                    </p>

                    {notif.data?.order_number && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        background: '#f1f5f9',
                        color: '#475569',
                        border: '1px solid #cbd5e1'
                      }}>
                        Order #{String(notif.data.order_number)}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginTop: '2px' }}>
                    {isUnread && (
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#2563eb'
                        }}
                        title="Unread"
                      />
                    )}
                    <ExternalLink size={14} color="var(--muted)" />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

