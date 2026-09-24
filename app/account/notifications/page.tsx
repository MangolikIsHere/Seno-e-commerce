'use client'

import React, { useState } from 'react'
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

  if (authLoading) {
    return (
      <main className="static-page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <p style={{ color: 'var(--muted)' }}>Loading account...</p>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="static-page-container" style={{ textAlign: 'center', padding: '100px 20px' }}>
        <h1 className="static-page-title" style={{ fontSize: '28px', marginBottom: '16px' }}>Sign in required</h1>
        <p style={{ color: 'var(--muted)', marginBottom: '28px' }}>Please sign in to view your notifications.</p>
        <Link href="/account/login" className="dark-btn" style={{ display: 'inline-block' }}>
          Sign In
        </Link>
      </main>
    )
  }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.read_at) : notifications

  return (
    <main className="static-page-container" style={{ maxWidth: '840px', paddingBottom: '96px' }}>
      <Link href="/account" className="breadcrumb-back-link" style={{ marginBottom: '28px', display: 'inline-flex' }}>
        <ArrowLeft size={14} style={{ marginRight: '6px' }} />
        Back to Account
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <span className="section-kicker">UPDATES & ALERTS</span>
          <h1 className="static-page-title" style={{ margin: '8px 0 0' }}>Notifications</h1>
        </div>

        {unreadCount > 0 && (
          <button
            className="outline-btn"
            style={{ padding: '8px 16px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={markAllAsRead}
          >
            <Check size={14} />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Push notifications permission card */}
      {isPushSupported && (
        <div style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xs)',
          padding: '18px 24px',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--ink)' }}>
              Web Push Notifications
            </strong>
            <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              Receive instant updates when your order is placed, shipped, or delivered on this device.
            </span>
          </div>
          <button
            className={pushEnabled ? 'outline-btn' : 'dark-btn'}
            style={{ padding: '9px 18px', fontSize: '11px' }}
            onClick={togglePushNotifications}
          >
            {pushEnabled ? 'Disable Push' : 'Enable Push Alerts'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--line)', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: filter === 'all' ? 600 : 400,
            color: filter === 'all' ? 'var(--ink)' : 'var(--muted)',
            borderBottom: filter === 'all' ? '2px solid var(--ink)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          style={{
            background: 'none',
            border: 'none',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: filter === 'unread' ? 600 : 400,
            color: filter === 'unread' ? 'var(--ink)' : 'var(--muted)',
            borderBottom: filter === 'unread' ? '2px solid var(--ink)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading && notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xs)',
            textAlign: 'center',
            padding: '60px 24px'
          }}>
            <Bell size={36} style={{ color: 'var(--muted)', margin: '0 auto 12px', opacity: 0.6 }} />
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', margin: '0 0 6px', color: 'var(--ink)' }}>
              No notifications
            </p>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0 }}>
              {filter === 'unread' ? 'You have no unread notifications.' : 'Your notification activity will be recorded here.'}
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
                  background: isUnread ? 'var(--surface-subtle)' : 'var(--surface)',
                  border: isUnread ? '1px solid var(--ink)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '20px',
                  display: 'flex',
                  gap: '16px',
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
                    <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{notif.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(notif.created_at).toLocaleString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
                    {notif.message}
                  </p>
                </div>
                {isUnread && (
                  <span style={{
                    width: '8px',
                    height: '8px',
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
    </main>
  )
}
