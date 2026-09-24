'use client'

import React, { useState, useRef, useEffect } from 'react'
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
  X,
  ExternalLink
} from 'lucide-react'
import { useNotifications } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
import { NotificationRecord, NotificationType } from '@/lib/notifications/types'

function getNotificationIcon(type: NotificationType) {
  switch (type) {
    case 'order_placed':
      return <ShoppingBag size={16} className="notif-icon notif-icon-neutral" />
    case 'payment_confirmed':
    case 'order_delivered':
      return <CheckCircle2 size={16} className="notif-icon notif-icon-success" />
    case 'payment_failed':
    case 'order_cancelled':
    case 'seller_item_cancelled':
    case 'admin_payment_failed':
      return <XCircle size={16} className="notif-icon notif-icon-danger" />
    case 'order_processing':
    case 'order_dispatched':
    case 'order_in_transit':
    case 'order_out_for_delivery':
      return <Truck size={16} className="notif-icon notif-icon-info" />
    case 'refund_initiated':
    case 'refund_completed':
    case 'admin_refund_requested':
      return <RotateCcw size={16} className="notif-icon notif-icon-warning" />
    case 'seller_new_order':
      return <Package size={16} className="notif-icon notif-icon-neutral" />
    case 'admin_new_order':
      return <ShieldAlert size={16} className="notif-icon notif-icon-neutral" />
    default:
      return <Bell size={16} className="notif-icon notif-icon-neutral" />
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

export function NotificationBell({ isMobile = false }: { isMobile?: boolean }) {
  const router = useRouter()
  const { user } = useAuth()
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

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // If user is not logged in, clicking the bell directs them to sign in
  const handleTriggerClick = () => {
    if (!user) {
      router.push('/account/login')
      return
    }
    setIsOpen(!isOpen)
  }

  const handleNotificationClick = async (notif: NotificationRecord) => {
    if (!notif.read_at) {
      await markAsRead(notif.id)
    }
    setIsOpen(false)

    const targetUrl = notif.data?.deep_link || (notif.data?.order_id ? `/account/orders/${notif.data.order_id}` : '/account')
    router.push(targetUrl as string)
  }

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      {isMobile ? (
        <button
          className="mobile-icon-btn notif-trigger"
          onClick={handleTriggerClick}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          aria-expanded={isOpen}
        >
          <Bell size={19} />
          {unreadCount > 0 && <span className="action-badge notif-badge">{unreadCount}</span>}
        </button>
      ) : (
        <button
          className="header-action-btn notif-trigger"
          onClick={handleTriggerClick}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          aria-expanded={isOpen}
        >
          <Bell size={17} />
          <span>ALERTS</span>
          {unreadCount > 0 && <span className="action-badge notif-badge">{unreadCount}</span>}
        </button>
      )}

      {/* NOTIFICATION FLYOUT / MODAL */}
      {isOpen && (
        <div className={`notif-dropdown ${isMobile ? 'notif-dropdown-mobile' : 'notif-dropdown-desktop'}`}>
          <div className="notif-header">
            <div className="notif-header-left">
              <span className="notif-title">NOTIFICATIONS</span>
              {unreadCount > 0 && <span className="notif-unread-pill">{unreadCount} new</span>}
            </div>
            <div className="notif-header-right">
              {unreadCount > 0 && (
                <button
                  className="notif-mark-all-btn"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <Check size={13} />
                  <span>Mark all read</span>
                </button>
              )}
              {isMobile && (
                <button
                  className="notif-close-btn"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Web Push Prompt Banner (if supported and not yet enabled) */}
          {isPushSupported && !pushEnabled && (
            <div className="notif-push-banner">
              <div className="notif-push-info">
                <strong>Enable Push Notifications</strong>
                <span>Get real-time order, delivery, and refund alerts.</span>
              </div>
              <button
                className="notif-push-toggle-btn"
                onClick={togglePushNotifications}
              >
                Enable
              </button>
            </div>
          )}

          {/* NOTIFICATION FEED */}
          <div className="notif-list">
            {loading && notifications.length === 0 ? (
              <div className="notif-loading">
                <span className="notif-spinner" />
                <span>Loading alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={32} className="notif-empty-icon" />
                <p className="notif-empty-title">All caught up</p>
                <p className="notif-empty-desc">
                  You have no notifications right now. Order updates, shipping tracking, and studio announcements will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read_at
                return (
                  <div
                    key={notif.id}
                    className={`notif-item ${isUnread ? 'notif-item-unread' : 'notif-item-read'}`}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleNotificationClick(notif)
                      }
                    }}
                  >
                    <div className="notif-item-icon-col">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-top">
                        <span className="notif-item-title">{notif.title}</span>
                        <span className="notif-item-time">{formatRelativeTime(notif.created_at)}</span>
                      </div>
                      <p className="notif-item-message">{notif.message}</p>
                    </div>
                    {isUnread && <span className="notif-unread-dot" title="Unread" />}
                  </div>
                )
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="notif-footer">
            <Link
              href="/account/notifications"
              className="notif-view-all-link"
              onClick={() => setIsOpen(false)}
            >
              <span>View all notifications</span>
              <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
