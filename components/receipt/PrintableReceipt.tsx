import React from 'react'
import { money } from '@/lib/catalog'

export interface PrintableReceiptProps {
  order: any
  format?: 'a4' | 'compact'
  audience?: 'admin' | 'customer'
  className?: string
}

function formatReceiptDate(value?: string | null): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  } catch {
    return String(value)
  }
}

function formatReceiptTime(value?: string | null): string {
  if (!value) return ''
  try {
    const d = new Date(value)
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

function humanizeStatus(status?: string | null): string {
  if (!status) return 'PROCESSING'
  const map: Record<string, string> = {
    unfulfilled: 'AWAITING PROCESSING',
    pending: 'PENDING CONFIRMATION',
    confirmed: 'CONFIRMED',
    processing: 'PROCESSING',
    dispatched: 'DISPATCHED',
    shipped: 'IN TRANSIT',
    in_transit: 'IN TRANSIT',
    out_for_delivery: 'OUT FOR DELIVERY',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
    refunded: 'REFUNDED',
    refund_processing: 'REFUND INITIATED',
    returned: 'RETURNED',
    delivery_failed: 'DELIVERY FAILED'
  }
  return map[status.toLowerCase()] || status.toUpperCase()
}

export function PrintableReceipt({
  order,
  format = 'a4',
  audience = 'customer',
  className = ''
}: PrintableReceiptProps) {
  if (!order) return null

  const address = order.shipping_address || {}
  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles
  const customerName = address.recipient_name || profile?.full_name || 'Guest Patron'
  const customerEmail = profile?.email || address.email || '—'
  const customerPhone = address.phone || profile?.phone || '—'

  const items = order.order_items || []
  const subtotal = Number(order.subtotal_amount || 0)
  const discount = Number(order.discount_amount || 0)
  const shipping = Number(order.shipping_amount || 0)
  const total = Number(order.total_amount || 0)

  const isRefunded = order.payment_status === 'refunded' || order.status === 'refunded'
  const isCancelled = order.status === 'cancelled'
  const paymentMethod = order.payment_method || 'Razorpay Gateway'

  // Extract stored promotion snapshot
  const promoSnapshot = order.promotion_snapshot || {}
  const promoCode = order.promotion_code || promoSnapshot.coupon_code || promoSnapshot.code || null
  const promoTitle = promoSnapshot.discount_label || promoSnapshot.name || promoSnapshot.headline || (promoCode ? `Special Offer (${promoCode})` : (discount > 0 ? 'Promotional Discount' : null))

  if (format === 'compact') {
    return (
      <div 
        className={`seno-receipt-document seno-receipt-compact ${className}`}
        style={{
          width: '80mm',
          maxWidth: '80mm',
          margin: '0 auto',
          padding: '12px 10px',
          background: '#ffffff',
          color: '#111111',
          fontFamily: 'monospace, -apple-system, sans-serif',
          fontSize: '11px',
          lineHeight: '1.4',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px', borderBottom: '1px dashed #111', paddingBottom: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '2px', fontFamily: 'Georgia, serif' }}>SENO</div>
          <div style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', color: '#555' }}>Everyday, Considered.</div>
          <div style={{ fontSize: '10px', fontWeight: 600, marginTop: '6px' }}>ORDER RECEIPT</div>
          <div style={{ fontSize: '12px', fontWeight: 700 }}>#{order.order_number}</div>
          <div style={{ fontSize: '9px', color: '#555' }}>{formatReceiptDate(order.created_at)} {formatReceiptTime(order.created_at)}</div>
          <div style={{ display: 'inline-block', border: '1px solid #111', padding: '1px 6px', fontSize: '9px', fontWeight: 700, marginTop: '4px' }}>
            {humanizeStatus(order.status)}
          </div>
        </div>

        {/* Customer & Destination */}
        <div style={{ borderBottom: '1px dashed #111', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 700, fontSize: '10px' }}>CUSTOMER:</div>
          <div>{customerName}</div>
          <div>{customerPhone}</div>
          <div style={{ marginTop: '4px', fontWeight: 700, fontSize: '10px' }}>DELIVERY ADDRESS:</div>
          <div>{address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}</div>
          <div>{address.city}, {address.state} {address.postal_code}</div>
        </div>

        {/* Items */}
        <div style={{ borderBottom: '1px dashed #111', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ fontWeight: 700, marginBottom: '4px' }}>ITEMS ({items.length})</div>
          {items.map((item: any, idx: number) => (
            <div key={item.id || idx} style={{ marginBottom: '6px' }}>
              <div style={{ fontWeight: 600 }}>{item.product_name}</div>
              <div style={{ fontSize: '10px', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
                <span>
                  {item.variant_details?.size ? `Size: ${item.variant_details.size}` : ''}
                  {item.variant_details?.colour ? ` · ${item.variant_details.colour}` : ''}
                </span>
                <span>{item.quantity} × {money(Number(item.unit_price))}</span>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 600 }}>
                {money(Number(item.total_price))}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Summary */}
        <div style={{ borderBottom: '1px dashed #111', paddingBottom: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>{money(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{promoTitle || `Discount (${promoCode || 'PROMO'})`}:</span>
              <span>-{money(discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Shipping:</span>
            <span>{shipping === 0 ? 'Complimentary' : money(shipping)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 800, marginTop: '4px', borderTop: '1px solid #111', paddingTop: '4px' }}>
            <span>TOTAL:</span>
            <span>{money(total)}</span>
          </div>
          <div style={{ marginTop: '6px', fontSize: '10px' }}>
            <div>Payment: <span style={{ fontWeight: 700 }}>{order.payment_status?.toUpperCase() || 'UNPAID'}</span></div>
            <div>Method: {paymentMethod}</div>
            {isRefunded && (
              <div style={{ marginTop: '4px', background: '#f5f5f5', padding: '4px', fontWeight: 700 }}>
                REFUNDED: {money(total)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '9px', color: '#555' }}>
          <div>Thank you for shopping with SENO.</div>
          <div style={{ fontWeight: 600, color: '#111' }}>www.seno.co.in</div>
        </div>
      </div>
    )
  }

  // Primary Format: A4 Standard Document (for PDF and High-res Print)
  return (
    <div
      className={`seno-receipt-document seno-receipt-a4 ${className}`}
      style={{
        width: '100%',
        maxWidth: '820px',
        margin: '0 auto',
        padding: '36px 44px',
        background: '#ffffff',
        color: '#111111',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        fontSize: '13px',
        lineHeight: 1.5,
        boxSizing: 'border-box'
      }}
    >
      {/* Top Brand Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '2px solid #111111',
          paddingBottom: '20px',
          marginBottom: '28px'
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '3px',
              color: '#111111',
              lineHeight: 1
            }}
          >
            SENO
          </div>
          <div
            style={{
              fontSize: '10px',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: '#666666',
              marginTop: '6px',
              fontWeight: 500
            }}
          >
            Everyday, Considered.
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#888888',
              fontWeight: 600,
              marginBottom: '4px'
            }}
          >
            Official Order Receipt
          </div>
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '20px',
              fontWeight: 600,
              color: '#111111'
            }}
          >
            #{order.order_number}
          </div>
          <div style={{ fontSize: '12px', color: '#555555', marginTop: '2px' }}>
            Date: <strong style={{ color: '#111111' }}>{formatReceiptDate(order.created_at)}</strong>
          </div>
        </div>
      </div>

      {/* Meta Grid: Status, Customer, Delivery */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '24px',
          paddingBottom: '24px',
          borderBottom: '1px solid #e5e5e5',
          marginBottom: '28px'
        }}
      >
        {/* Order Status */}
        <div>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#888888',
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600
            }}
          >
            Fulfillment State
          </span>
          <div
            style={{
              display: 'inline-block',
              border: '1px solid #111111',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              background: '#fcfcfc'
            }}
          >
            {humanizeStatus(order.status)}
          </div>
          <div style={{ fontSize: '11px', color: '#666666', marginTop: '6px' }}>
            Settlement: <strong style={{ color: '#111111' }}>{order.payment_status?.toUpperCase() || 'UNPAID'}</strong>
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#888888',
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600
            }}
          >
            Customer
          </span>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#111111' }}>
            {customerName}
          </div>
          <div style={{ fontSize: '12px', color: '#444444', marginTop: '2px' }}>
            {customerEmail}
          </div>
          <div style={{ fontSize: '12px', color: '#444444', marginTop: '2px' }}>
            {customerPhone}
          </div>
        </div>

        {/* Delivery Address */}
        <div>
          <span
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              color: '#888888',
              display: 'block',
              marginBottom: '6px',
              fontWeight: 600
            }}
          >
            Delivery Address
          </span>
          <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#222222' }}>
            <div>{address.address_line1} {address.address_line2 ? `, ${address.address_line2}` : ''}</div>
            <div>{address.city}, {address.state} {address.postal_code}</div>
            <div>{address.country || 'India'}</div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '32px' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left'
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid #111111' }}>
              <th style={{ padding: '8px 4px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: '#666666' }}>
                Item Description
              </th>
              <th style={{ padding: '8px 4px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: '#666666', textAlign: 'center', width: '70px' }}>
                Qty
              </th>
              <th style={{ padding: '8px 4px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: '#666666', textAlign: 'right', width: '120px' }}>
                Unit Price
              </th>
              <th style={{ padding: '8px 4px', fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: '#666666', textAlign: 'right', width: '120px' }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item: any, idx: number) => {
              const size = item.variant_details?.size
              const colour = item.variant_details?.colour
              return (
                <tr
                  key={item.id || idx}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    pageBreakInside: 'avoid'
                  }}
                >
                  <td style={{ padding: '14px 4px' }}>
                    <div style={{ fontWeight: 600, color: '#111111', fontSize: '13.5px' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#666666', marginTop: '3px' }}>
                      {size ? `Size: ${size}` : ''}
                      {colour && colour !== 'Default' ? ` · Colour: ${colour}` : ''}
                      {item.sku ? ` · SKU: ${item.sku}` : ''}
                    </div>
                    {audience === 'admin' && item.sellers?.store_name && (
                      <div style={{ fontSize: '11px', color: '#888888', marginTop: '2px' }}>
                        Origin: {item.sellers.store_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 4px', textAlign: 'center', fontSize: '13px', color: '#111111' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '14px 4px', textAlign: 'right', fontSize: '13px', color: '#444444' }}>
                    {money(Number(item.unit_price))}
                  </td>
                  <td style={{ padding: '14px 4px', textAlign: 'right', fontWeight: 600, fontSize: '13.5px', color: '#111111' }}>
                    {money(Number(item.total_price))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Section (Price Ledger + Payment Note) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          gap: '32px',
          alignItems: 'flex-start',
          borderTop: '1px solid #111111',
          paddingTop: '20px',
          pageBreakInside: 'avoid'
        }}
      >
        {/* Left: Promotion Snapshot & Settlement Details */}
        <div>
          {promoTitle && (
            <div
              style={{
                background: '#fafafa',
                border: '1px solid #e5e5e5',
                padding: '12px 14px',
                borderRadius: '2px',
                marginBottom: '16px'
              }}
            >
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, color: '#888888' }}>
                Applied Promotion
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#111111', marginTop: '2px' }}>
                {promoTitle}
              </div>
              {promoCode && (
                <div style={{ fontSize: '11.5px', color: '#555555', marginTop: '2px' }}>
                  Snapshot code: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{promoCode}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: '12px', color: '#555555' }}>
            <div>Payment Reference: <strong style={{ color: '#111111' }}>{paymentMethod}</strong></div>
            {order.razorpay_payment_id && (
              <div style={{ fontSize: '11px', color: '#777777', marginTop: '2px' }}>
                Transaction ID: <span style={{ fontFamily: 'monospace' }}>{order.razorpay_payment_id}</span>
              </div>
            )}
            {isRefunded && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Historical State: This order was fully refunded. Reversal amount: {money(total)}
              </div>
            )}
            {isCancelled && !isRefunded && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '8px 12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '12px',
                  fontWeight: 600
                }}
              >
                Historical State: Order was cancelled. Reserved inventory returned to catalog.
              </div>
            )}
          </div>
        </div>

        {/* Right: Numerical Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555555' }}>
            <span>Subtotal</span>
            <span style={{ color: '#111111' }}>{money(subtotal)}</span>
          </div>

          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
              <span>{promoTitle || 'Promotional Discount'}</span>
              <span>-{money(discount)}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#555555' }}>
            <span>Shipping & Delivery</span>
            <span style={{ color: '#111111' }}>
              {shipping === 0 ? 'Complimentary' : money(shipping)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '2px solid #111111',
              paddingTop: '10px',
              marginTop: '6px',
              fontSize: '18px',
              fontWeight: 700,
              color: '#111111'
            }}
          >
            <span>TOTAL</span>
            <span>{money(total)}</span>
          </div>

          <div style={{ textAlign: 'right', fontSize: '11px', color: '#777777', marginTop: '2px' }}>
            Payment Status: <strong style={{ color: '#111111' }}>{order.payment_status?.toUpperCase() || 'UNPAID'}</strong>
          </div>
        </div>
      </div>

      {/* Brand Sign-off Footer */}
      <div
        style={{
          borderTop: '1px solid #e5e5e5',
          marginTop: '36px',
          paddingTop: '20px',
          textAlign: 'center',
          fontSize: '11.5px',
          color: '#666666',
          pageBreakInside: 'avoid'
        }}
      >
        <p style={{ margin: '0 0 4px', fontWeight: 500 }}>
          Thank you for shopping with SENO.
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#888888' }}>
          Official Store Receipt · <span style={{ color: '#111111' }}>www.seno.co.in</span> · Support: care@seno.co.in
        </p>
      </div>
    </div>
  )
}
