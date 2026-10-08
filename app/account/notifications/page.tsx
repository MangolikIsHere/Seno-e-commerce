'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShoppingBag,
  XCircle,
  RotateCcw,
  Package,
  ShieldAlert,
  Check,
  ArrowLeft
} from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
import { NotificationRecord, NotificationType } from '@/lib/notifications/types'
import { AccountShell } from '@/components/account/AccountShell'

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'order_placed':
      return <ShoppingBag size={18} className="notif-icon notif-icon-neutral" />
    case 'payment_confirmed':
    case 'order_delivered':
      return <CheckCircle2 size={18} className="notif-icon notif-icon-success" />
    case 'payment_failed':
    case 'order_cancelled':
    case 'seller_item_cancelled':
    case 'admin_payment_failed':
      return <XCircle size={18} className="notif-icon notif-icon-danger" />
    case 'order_processing':
    case 'order_dispatched':
    case 'order_in_transit':
    case 'order_out_for_delivery':
      return <Truck size={18} className="notif-icon notif-icon-info" />
    case 'refund_initiated':
    case 'refund_completed':
    case 'admin_refund_requested':
      return <RotateCcw size={18} className="notif-icon notif-icon-warning" />
    case 'seller_new_order':
      return <Package size={18} className="notif-icon notif-icon-neutral" />
    case 'admin_new_order':
      return <ShieldAlert size={18} className="notif-icon notif-icon-neutral" />
    default:
      return <Bell size={18} className="notif-icon notif-icon-neutral" />
  }
}

export default function AccountNotificationsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    pushEnabled,
    togglePushNotifications,
    isPushSupported
  } = useNotifications()

  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/account?next=%2Faccount%2Fnotifications')
    }
  }, [authLoading, router, user])

  if (authLoading) {
    return (
      <AccountShell title="Notifications">
        <div className="account-loading-card">
          <p>Loading notification center...</p>
        </div>
      </AccountShell>
    )
  }

  if (!user) {
    return (
      <AccountShell title="Sign In Required">
        <div className="account-empty-order-card">
          <p style={{ color: 'var(--muted)', fontSize: '13px' }}>Redirecting to sign in...</p>
        </div>
      </AccountShell>
    )
  }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read_at) : notifications

  return (
    <AccountShell title="Notifications" subtitle="Track orders, logistics updates, and account security alerts">
      <div className="account-section-block">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 className="account-section-heading">Alert Center</h2>
            <p className="account-section-subheading">Activity and tracking messages</p>
          </div>

          {unreadCount > 0 && (
            <button
              className="button button-outline"
              style={{ padding: '6px 14px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={markAllAsRead}
            >
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}
        </div>

        {/* Web Push Alerts Card */}
        {isPushSupported && (
          <div style={{
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xs)',
            padding: '18px 24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <strong style={{ display: 'block', fontSize: '13.5px', marginBottom: '2px', color: 'var(--ink)' }}>
                Push Notifications
              </strong>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                Instant delivery updates when your parcel is dispatched or out for delivery.
              </span>
            </div>
            <button
              className={pushEnabled ? 'button button-outline' : 'button button-primary'}
              style={{ padding: '8px 16px', fontSize: '11px' }}
              onClick={togglePushNotifications}
            >
              {pushEnabled ? 'Disable Push' : 'Enable Push Alerts'}
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
          <button
            onClick={() => setFilter('all')}
            className={`admin-filter-chip ${filter === 'all' ? 'active' : ''}`}
          >
            All Alerts ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`admin-filter-chip ${filter === 'unread' ? 'active' : ''}`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loading && notifications.length === 0 ? (
            <div className="account-loading-card">
              <p>Loading alerts...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="account-empty-order-card">
              <Bell size={36} style={{ color: 'var(--muted)', margin: '0 auto 12px', opacity: 0.6 }} />
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', margin: '0 0 6px', color: 'var(--ink)' }}>
                No notifications
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
                {filter === 'unread' ? 'You have caught up with all notifications.' : 'Your notification activity will be recorded here.'}
              </p>
            </div>
          ) : (
            filtered.map((notif: NotificationRecord) => {
              const isUnread = !notif.read_at
              return (
                <div
                  key={notif.id}
                  onClick={async () => {
                    if (isUnread) {
                      await markAsRead(notif.id)
                    }
                    const link = notif.data?.deep_link || (notif.data?.order_id ? `/account/orders/${notif.data.order_id}` : '/account')
                    router.push(link as string)
                  }}
                  style={{
                    background: isUnread ? 'var(--surface-subtle)' : '#fff',
                    border: isUnread ? '1px solid var(--ink)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '18px 20px',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background-color 0.2s'
                  }}
                >
                  <div style={{ paddingTop: '2px' }}>
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '4px' }}>
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
                    <p style={{ fontSize: '12.5px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                      {notif.message}
                    </p>
                  </div>
                  {isUnread && (
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--clay)',
                      flexShrink: 0,
                      marginTop: '6px'
                    }} />
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </AccountShell>
  )
}
