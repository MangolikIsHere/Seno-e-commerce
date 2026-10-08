'use client'

import React from 'react'
import { Check, Clock, Truck, Package, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface OrderStatusTimelineProps {
  status: string
  paymentStatus?: string
}

export function OrderStatusTimeline({ status, paymentStatus }: OrderStatusTimelineProps) {
  const isCancelled = status === 'cancelled' || status === 'delivery_failed'
  const isRefunded = paymentStatus === 'refunded'

  const steps = [
    { key: 'placed', label: 'Order Placed' },
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'processing', label: 'Processing' },
    { key: 'shipped', label: 'Dispatched' },
    { key: 'out_for_delivery', label: 'Out for Delivery' },
    { key: 'delivered', label: 'Delivered' }
  ]

  const getStepIndex = (currentStatus: string) => {
    switch (currentStatus) {
      case 'unfulfilled':
      case 'pending':
        return 0
      case 'confirmed':
        return 1
      case 'processing':
        return 2
      case 'dispatched':
      case 'shipped':
      case 'in_transit':
        return 3
      case 'out_for_delivery':
        return 4
      case 'delivered':
        return 5
      default:
        return 0
    }
  }

  const currentIndex = getStepIndex(status)

  if (isCancelled) {
    return (
      <div className="order-timeline-card cancelled">
        <div className="order-timeline-cancelled-header">
          <XCircle size={18} color="#b91c1c" />
          <span style={{ fontWeight: 600, fontSize: '13px', color: '#b91c1c' }}>
            Order Terminated: {status.toUpperCase()}
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
          {isRefunded ? 'Payment has been refunded to original settlement method.' : 'This order was cancelled and inventory released.'}
        </p>
      </div>
    )
  }

  return (
    <div className="order-timeline-card">
      <div className="order-timeline-track">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex
          const isCurrent = idx === currentIndex
          return (
            <div key={step.key} className={`order-timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
              <div className="order-timeline-marker">
                {isCompleted ? (
                  <Check size={12} strokeWidth={2.5} />
                ) : isCurrent ? (
                  <span className="order-timeline-dot" />
                ) : (
                  <span className="order-timeline-upcoming" />
                )}
              </div>
              <span className="order-timeline-label">{step.label}</span>
              {idx < steps.length - 1 && (
                <div className={`order-timeline-line ${idx < currentIndex ? 'completed' : ''}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
