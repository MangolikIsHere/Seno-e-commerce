'use client'

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  RefreshCw,
  ExternalLink,
  Clock,
  AlertCircle
} from 'lucide-react'
import { getCustomerOrderById, Order, FulfillmentEvent } from '@/lib/orders'
import { createClient } from '@/utils/supabase/client'

// Authoritative customer-facing tracking stages
const TRACKING_STAGES = [
  { key: 'order_placed', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'dispatched', label: 'Dispatched' },
  { key: 'in_transit', label: 'In Transit' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' }
] as const

const STATUS_MESSAGES: Record<string, string> = {
  order_placed: 'Your order has been received.',
  processing: 'Your order is being prepared.',
  dispatched: 'Your order has been handed over to the carrier.',
  in_transit: 'Your order is on its way.',
  out_for_delivery: 'Your order is out for delivery.',
  delivered: 'Your order has been delivered.',
  cancelled: 'Your order has been cancelled.',
  refunded: 'Your refund has been processed.'
}

function getStageIndex(status?: string | null): number {
  const s = (status || '').toLowerCase().trim()
  switch (s) {
    case 'processing':
      return 1
    case 'dispatched':
    case 'shipped':
    case 'partially_shipped':
      return 2
    case 'in_transit':
      return 3
    case 'out_for_delivery':
      return 4
    case 'delivered':
      return 5
    case 'unfulfilled':
    case 'order_placed':
    case 'pending':
    case 'confirmed':
    default:
      return 0
  }
}

function formatStageTimestamp(iso?: string | null): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const datePart = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    })
    const timePart = d.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${datePart} · ${timePart}`
  } catch {
    return ''
  }
}

function formatEtaDisplay(iso?: string | null): string {
  if (!iso) return 'Estimated delivery date will be updated soon.'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return 'Estimated delivery date will be updated soon.'
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return 'Estimated delivery date will be updated soon.'
  }
}

function formatHeaderLastUpdated(date: Date): string {
  try {
    const datePart = date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const timePart = date.toLocaleTimeString('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    return `${datePart}, ${timePart}`
  } catch {
    return ''
  }
}

export default function TrackingPage() {
  const params = useParams()
  const orderId = params?.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const isMountedRef = useRef(true)

  const loadOrder = useCallback(
    async (isBackground = false) => {
      if (!orderId) return
      if (!isBackground) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      try {
        const { order: loadedOrder, error: loadError } = await getCustomerOrderById(orderId)
        if (!isMountedRef.current) return

        if (loadError || !loadedOrder) {
          setError(loadError || 'Order not found or unauthorized.')
        } else {
          setOrder(loadedOrder)
          setError(null)
          setLastUpdated(new Date())
        }
      } catch (err: unknown) {
        if (!isMountedRef.current) return
        setError(err instanceof Error ? err.message : 'Failed to retrieve order.')
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [orderId]
  )

  useEffect(() => {
    isMountedRef.current = true
    loadOrder(false)

    return () => {
      isMountedRef.current = false
    }
  }, [loadOrder])

  // Real-time synchronization & reactive background refresh
  useEffect(() => {
    if (!orderId) return

    const supabase = createClient()
    const channelName = `customer-order-tracking-${orderId}-${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${order?.id || orderId}` },
        () => {
          loadOrder(true)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${order?.id || orderId}` },
        () => {
          loadOrder(true)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'fulfillment_events' },
        () => {
          loadOrder(true)
        }
      )
      .subscribe()

    // Visibility change & window focus listeners to prevent stale tabs
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadOrder(true)
      }
    }
    const handleFocus = () => {
      loadOrder(true)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    // Gentle heartbeat poll (every 30 seconds when visible)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrder(true)
      }
    }, 30000)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      clearInterval(interval)
    }
  }, [orderId, order?.id, loadOrder])

  const trackedItem = useMemo(() => {
    return order?.order_items?.[0] || null
  }, [order])

  // Authoritative status resolution: check item fulfillment status, fallback to order.status
  const backendStatus = useMemo(() => {
    if (trackedItem?.fulfillment_status) {
      return trackedItem.fulfillment_status
    }
    return order?.status || 'unfulfilled'
  }, [trackedItem, order])

  const isCancelled = order?.status === 'cancelled' || backendStatus === 'cancelled'
  const isRefunded = order?.payment_status === 'refunded'
  const isFailed = order?.payment_status === 'failed' || backendStatus === 'delivery_failed'

  const currentStageIndex = useMemo(() => {
    return getStageIndex(backendStatus)
  }, [backendStatus])

  // Map events to stage timestamps
  const stageTimestamps = useMemo(() => {
    const map: Record<string, string | null> = {
      order_placed: order?.created_at || null,
      processing: null,
      dispatched: null,
      in_transit: null,
      out_for_delivery: null,
      delivered: null
    }

    const events = (trackedItem?.fulfillment_events || []) as FulfillmentEvent[]
    for (const evt of events) {
      const s = (evt.status || '').toLowerCase()
      if ((s === 'unfulfilled' || s === 'order_placed') && !map.order_placed) {
        map.order_placed = evt.created_at
      } else if (s === 'processing') {
        map.processing = evt.created_at
      } else if (s === 'dispatched' || s === 'shipped') {
        map.dispatched = evt.created_at
      } else if (s === 'in_transit') {
        map.in_transit = evt.created_at
      } else if (s === 'out_for_delivery') {
        map.out_for_delivery = evt.created_at
      } else if (s === 'delivered') {
        map.delivered = evt.created_at
      }
    }

    return map
  }, [trackedItem, order])

  // Contextual status message
  const statusMessage = useMemo(() => {
    if (isRefunded) return STATUS_MESSAGES.refunded
    if (isCancelled) return STATUS_MESSAGES.cancelled
    const stageKey = TRACKING_STAGES[currentStageIndex]?.key || 'order_placed'
    return STATUS_MESSAGES[stageKey] || 'Your order is being processed.'
  }, [isRefunded, isCancelled, currentStageIndex])

  // Carrier tracking URL check
  const carrierUrl = useMemo(() => {
    const tracking = trackedItem?.tracking_number?.trim() || ''
    if (tracking.startsWith('http://') || tracking.startsWith('https://')) {
      return tracking
    }
    return null
  }, [trackedItem])

  if (loading) {
    return (
      <main className="static-page-container" style={{ textAlign: 'center', padding: '120px 20px', minHeight: '60vh' }}>
        <p style={{ color: 'var(--muted)', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Retrieving live tracking dossier…
        </p>
      </main>
    )
  }

  if (error || !order) {
    return (
      <main className="static-page-container" style={{ maxWidth: '600px', padding: '100px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', marginBottom: '16px', fontWeight: 400 }}>
          Order Not Found
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
          {error || 'The tracking details for this order could not be located or are unauthorized.'}
        </p>
        <Link href="/account" className="button button-primary" style={{ padding: '12px 28px', fontSize: '12px' }}>
          Back to Orders
        </Link>
      </main>
    )
  }

  const currentDisplayStatus = isCancelled
    ? 'CANCELLED'
    : TRACKING_STAGES[currentStageIndex]?.label.toUpperCase() || 'ORDER PLACED'

  return (
    <main
      className="static-page-container tracking-page-layout"
      style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '32px 20px 96px',
        overflowX: 'hidden'
      }}
    >
      {/* Back Link */}
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/account"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.5px',
            minHeight: '44px'
          }}
        >
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>

      {/* Luxury Header Banner */}
      <header
        style={{
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '28px 32px',
          marginBottom: '32px'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                display: 'block',
                marginBottom: '6px'
              }}
            >
              ORDER TRACKING
            </span>
            <h1
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 'clamp(24px, 3.5vw, 32px)',
                fontWeight: 400,
                margin: '0 0 10px',
                color: 'var(--ink)'
              }}
            >
              #{order.order_number}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)' }}>
              <Clock size={13} />
              <span>Last updated: {formatHeaderLastUpdated(lastUpdated)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'refunded' ? 'cancelled' : 'pending'}`}>
                PAYMENT: {order.payment_status.toUpperCase()}
              </span>
              <span className={`status-pill ${isCancelled ? 'rejected' : currentStageIndex === 5 ? 'delivered' : 'processing'}`}>
                STATUS: {currentDisplayStatus}
              </span>
            </div>

            <button
              type="button"
              onClick={() => loadOrder(true)}
              disabled={refreshing}
              aria-label="Refresh status"
              className="button button-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '2px',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                minHeight: '36px'
              }}
            >
              <RefreshCw
                size={12}
                style={{
                  animation: refreshing ? 'spin 1s linear infinite' : 'none',
                  transition: 'transform 0.3s ease'
                }}
              />
              <span>{refreshing ? 'Refreshing…' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Terminal Alert (if cancelled, refunded, failed) */}
      {(isCancelled || isRefunded || isFailed) && (
        <div
          style={{
            background: isRefunded ? '#f4f7f4' : '#fbf2f2',
            border: `1px solid ${isRefunded ? '#d1e2d6' : '#f0cccc'}`,
            borderRadius: '4px',
            padding: '20px 24px',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <AlertCircle size={18} color={isRefunded ? '#1f5132' : '#8c2626'} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: isRefunded ? '#1f5132' : '#8c2626', marginBottom: '4px' }}>
              {isRefunded ? 'Refund Processed' : isCancelled ? 'Order Cancelled' : 'Delivery Update'}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
              {statusMessage}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Fulfillment Timeline + Shipment Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '32px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Fulfillment Timeline */}
        <section
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            padding: '28px'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border)',
              paddingBottom: '16px',
              marginBottom: '28px'
            }}
          >
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                margin: 0,
                color: 'var(--ink)'
              }}
            >
              FULFILLMENT TIMELINE
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              {isCancelled ? 'Cancelled' : currentStageIndex === 5 ? 'All stages completed' : `Stage ${currentStageIndex + 1} of 6`}
            </span>
          </div>

          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {TRACKING_STAGES.map((stage, index) => {
              const isDelivered = currentStageIndex === 5 && !isCancelled
              const isPastStage = index < currentStageIndex || isDelivered
              const isCurrentStage = index === currentStageIndex && !isDelivered && !isCancelled
              const isUpcomingStage = index > currentStageIndex && !isDelivered

              const stageTimestamp = stageTimestamps[stage.key]
              const formattedTime = formatStageTimestamp(stageTimestamp)
              const isLast = index === TRACKING_STAGES.length - 1

              return (
                <div
                  key={stage.key}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '20px',
                    position: 'relative',
                    minHeight: isLast ? 'auto' : '76px'
                  }}
                >
                  {/* Left Column: Node + Connecting Line */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '28px',
                      flexShrink: 0
                    }}
                  >
                    {/* Circle Node */}
                    <div
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: isPastStage ? '#111827' : isCurrentStage ? '#111827' : '#ffffff',
                        border: isPastStage
                          ? '1px solid #111827'
                          : isCurrentStage
                          ? '2px solid #111827'
                          : '1.5px solid #d1d5db',
                        boxShadow: isCurrentStage ? '0 0 0 4px rgba(17, 24, 39, 0.1)' : 'none',
                        transition: 'all 0.3s ease',
                        zIndex: 2
                      }}
                    >
                      {isPastStage ? (
                        <Check size={14} color="#ffffff" strokeWidth={2.5} />
                      ) : isCurrentStage ? (
                        <div
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ffffff'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: '#e5e7eb'
                          }}
                        />
                      )}
                    </div>

                    {/* Connecting vertical line */}
                    {!isLast && (
                      <div
                        style={{
                          width: '2px',
                          flexGrow: 1,
                          minHeight: '48px',
                          background: isPastStage && index < currentStageIndex ? '#111827' : '#e5e7eb',
                          transition: 'background 0.3s ease'
                        }}
                      />
                    )}
                  </div>

                  {/* Right Column: Stage Information */}
                  <div style={{ flex: 1, paddingBottom: isLast ? '0' : '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: isCurrentStage ? 700 : isPastStage ? 600 : 400,
                          color: isPastStage || isCurrentStage ? 'var(--ink)' : 'var(--muted)',
                          letterSpacing: '-0.2px'
                        }}
                      >
                        {stage.label}
                      </span>

                      {isCurrentStage && (
                        <span
                          style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            padding: '2px 8px',
                            borderRadius: '2px',
                            background: '#111827',
                            color: '#ffffff',
                            textTransform: 'uppercase'
                          }}
                        >
                          CURRENT
                        </span>
                      )}
                    </div>

                    {/* Stage Subtitle & Timestamps */}
                    <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      {formattedTime && (
                        <span style={{ color: 'var(--ink)', fontWeight: 500, marginRight: '6px' }}>
                          {formattedTime}
                        </span>
                      )}

                      {isCurrentStage && (
                        <div style={{ marginTop: '4px', color: 'var(--ink)', fontWeight: 500, fontSize: '13px' }}>
                          {statusMessage}
                        </div>
                      )}

                      {isUpcomingStage && index === currentStageIndex + 1 && !isCancelled && (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                          Expected next
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right Column: Shipment Details & Shipping Destination */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Shipment Details Card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '28px'
            }}
          >
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                margin: '0 0 20px',
                color: 'var(--ink)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '12px'
              }}
            >
              SHIPMENT DETAILS
            </h2>

            <div style={{ display: 'grid', gap: '16px', fontSize: '13px' }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                  Item
                </div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {trackedItem?.product_name || '—'}
                </div>
                {trackedItem?.variant_details?.size && (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    Size: {trackedItem.variant_details.size}
                    {trackedItem.variant_details.colour && trackedItem.variant_details.colour !== 'Default' ? ` · ${trackedItem.variant_details.colour}` : ''}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    Qty
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    {trackedItem?.quantity || 1}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    Seller
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    {trackedItem?.sellers?.store_name || 'SENO Official'}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                  Estimated Delivery
                </div>
                <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                  {formatEtaDisplay(trackedItem?.estimated_delivery_date)}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    Carrier
                  </div>
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>
                    {trackedItem?.carrier || '—'}
                  </div>
                </div>

                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '2px' }}>
                    Tracking
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--ink)', fontFamily: 'monospace', fontSize: '13px' }}>
                    {trackedItem?.tracking_number || '—'}
                  </div>
                </div>
              </div>

              {carrierUrl && (
                <div style={{ marginTop: '8px' }}>
                  <a
                    href={carrierUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button button-outline"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      padding: '10px 16px',
                      width: '100%',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      minHeight: '44px'
                    }}
                  >
                    <span>TRACK SHIPMENT</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Destination Card */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '28px'
            }}
          >
            <h2
              style={{
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                margin: '0 0 20px',
                color: 'var(--ink)',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '12px'
              }}
            >
              SHIPPING DESTINATION
            </h2>

            <div
              style={{
                lineHeight: 1.8,
                fontSize: '13px',
                color: 'var(--ink)',
                textTransform: 'uppercase',
                wordBreak: 'break-word'
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                {order.shipping_address?.recipient_name || '—'}
              </div>
              <div>{order.shipping_address?.address_line1 || ''}</div>
              {order.shipping_address?.address_line2 && (
                <div>{order.shipping_address.address_line2}</div>
              )}
              <div>
                {order.shipping_address?.city || ''}
                {order.shipping_address?.city && order.shipping_address?.state ? ', ' : ''}
                {order.shipping_address?.state || ''}
                {order.shipping_address?.postal_code ? ` - ${order.shipping_address.postal_code}` : ''}
              </div>
              <div>{order.shipping_address?.country || 'INDIA'}</div>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  )
}
