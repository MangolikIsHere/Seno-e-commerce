import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Mail, ShieldCheck, Tag, PackageCheck, AlertCircle } from 'lucide-react'
import { getAdminOrderById, checkIsAdmin, cancelAdminOrderAction } from '@/lib/admin'
import { money } from '@/lib/catalog'
import { formatStateLabel } from '@/lib/utils'
import { CopyButton } from './CopyButton'
import { AdminOrderFulfillmentForm } from './AdminOrderFulfillmentForm'
import { AdminOrderActions } from '@/components/admin/AdminOrderActions'
import { OrderStatusTimeline } from '@/components/admin/OrderStatusTimeline'

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isAdmin = await checkIsAdmin()

  if (!isAdmin) {
    redirect('/account')
  }

  const order = await getAdminOrderById(id)
  if (!order) notFound()

  const customer = order.shipping_address || {}
  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles

  // Group items by seller
  const sellerGroups: Record<string, any[]> = {}
  let totalItemsCount = 0

  for (const item of (order.order_items || [])) {
    totalItemsCount += Number(item.quantity)
    const sellerName = item.sellers?.store_name || 'Platform (SENO)'
    if (!sellerGroups[sellerName]) {
      sellerGroups[sellerName] = []
    }
    sellerGroups[sellerName].push(item)
  }

  const uniqueETAs = Array.from(new Set(
    (order.order_items || []).map((i: any) => i.estimated_delivery_date).filter(Boolean)
  ))
  const etaDisplay = uniqueETAs.length === 0 ? 'Not scheduled'
    : uniqueETAs.length === 1 ? formatDate(uniqueETAs[0] as string)
    : 'Multiple ETAs'

  return (
    <div className="admin-page-container">
      {/* Top Breadcrumb & Print */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href="/admin/orders"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Platform Orders</span>
        </Link>
        <div>
          <AdminOrderActions order={order} />
        </div>
      </div>

      {/* Order Header Card */}
      <div className="admin-table-card" style={{ padding: '28px 32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span className="admin-kicker">ORDER RECORD</span>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 3.5vw, 36px)', margin: '4px 0 8px', fontWeight: 400 }}>
              Order #{order.order_number}
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Placed on {formatDate(order.created_at)}
              </span>
              <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'unpaid' ? 'pending' : 'rejected'}`}>
                Payment: {order.payment_status?.toUpperCase()}
              </span>
              <span className={`status-pill ${['cancelled', 'returned', 'delivery_failed'].includes(order.status) ? 'rejected' : order.status === 'delivered' ? 'approved' : 'processing'}`}>
                Fulfillment: {order.status?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Milestone Progression Timeline */}
        <div style={{ marginTop: '28px' }}>
          <OrderStatusTimeline status={order.status} paymentStatus={order.payment_status} />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="admin-grid-two-col">
        {/* Left Column: Items and Logistics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Purchased Items Card */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <div>
                <h2 className="admin-card-heading">Purchased Items ({totalItemsCount})</h2>
                <p className="admin-card-subheading">Verified selections and seller attribution</p>
              </div>
            </div>

            <div style={{ padding: '0 24px' }}>
              {(order.order_items || []).map((item: any) => {
                const primaryImage = item.products?.product_images?.find((img: any) => img.is_primary)?.url || item.products?.product_images?.[0]?.url
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      padding: '20px 0',
                      borderBottom: '1px solid var(--border)',
                      gap: '16px'
                    }}
                  >
                    {primaryImage && (
                      <div style={{ width: '60px', height: '76px', position: 'relative', flexShrink: 0, background: '#f5f5f4', borderRadius: '2px', overflow: 'hidden' }}>
                        <Image src={primaryImage} alt={item.product_name} fill style={{ objectFit: 'cover' }} sizes="60px" />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                        {item.product_name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                        SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku}</span> · Size: {item.variant_details?.size || 'Standard'} {item.variant_details?.colour && item.variant_details.colour !== 'Default' ? `· Colour: ${item.variant_details.colour}` : ''}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '11px', color: 'var(--muted)' }}>
                        <span>Seller: <strong style={{ color: 'var(--ink)' }}>{item.sellers?.store_name || 'SENO Platform'}</strong></span>
                        <span>·</span>
                        <span>Fulfillment: <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{item.fulfillment_status}</strong></span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '2px' }}>
                        {item.quantity} × {money(Number(item.unit_price))}
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>
                        {money(Number(item.total_price))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fulfillment Tracking & Carrier Form */}
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>Fulfillment & Logistics Controls</h2>
            <p className="admin-card-subheading" style={{ marginBottom: '20px' }}>Update carrier dispatch, airway bill, and shipment progression</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {(order.order_items || []).map((item: any) => (
                <div key={item.id} style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', marginBottom: '8px' }}>
                    {item.product_name} ({item.quantity} units)
                  </div>
                  <AdminOrderFulfillmentForm
                    item={item}
                    isPlatformFulfillment={true}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Financial Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Customer & Shipping Address Card */}
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="admin-card-heading" style={{ margin: 0 }}>Customer & Destination</h2>
              {customer.phone && <CopyButton text={customer.phone} label="Copy Phone" />}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', marginBottom: '2px' }}>
                  Customer Name
                </span>
                <strong style={{ fontSize: '14px' }}>{customer.recipient_name || profile?.full_name || 'Guest'}</strong>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', marginBottom: '2px' }}>
                  Contact Email & Phone
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={13} color="var(--muted)" />
                  <span>{profile?.email || 'No email provided'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <Phone size={13} color="var(--muted)" />
                  <span>{customer.phone || profile?.phone || 'No phone provided'}</span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', display: 'block', marginBottom: '4px' }}>
                  Shipping Address
                </span>
                <div style={{ lineHeight: 1.5, color: 'var(--ink)' }}>
                  <div>{customer.address_line1} {customer.address_line2 ? `, ${customer.address_line2}` : ''}</div>
                  <div>{customer.city}, {customer.state} {customer.postal_code}</div>
                  <div>{customer.country || 'India'}</div>
                </div>
              </div>

              {order.notes && (
                <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '12px', borderRadius: '2px', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Customer Delivery Note:</span>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ink)' }}>{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Ledger Card */}
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 className="admin-card-heading" style={{ marginBottom: '16px' }}>Financial Settlement</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Items Subtotal</span>
                <span>{money(Number(order.subtotal_amount || 0))}</span>
              </div>

              {order.discount_amount && Number(order.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                  <span>Promotion Discount ({order.promotion_code || 'PROMO'})</span>
                  <span>-{money(Number(order.discount_amount))}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Shipping & Freight</span>
                <span>{Number(order.shipping_amount) === 0 ? 'Complimentary' : money(Number(order.shipping_amount))}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
                <span>Total Settled</span>
                <span>{money(Number(order.total_amount || 0))}</span>
              </div>
            </div>

            {/* Operational Refund Ledger (Part 28) */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)', fontSize: '12.5px' }}>
              <div style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '8px' }}>
                Operational Settlement Status
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Paid</span>
                <span>{order.payment_status === 'paid' || order.payment_status === 'refunded' ? money(Number(order.total_amount || 0)) : '₹0'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Refundable</span>
                <span style={{ color: order.payment_status === 'paid' ? '#b91c1c' : 'inherit' }}>
                  {order.payment_status === 'paid' ? money(Number(order.total_amount || 0)) : '₹0'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Refunded</span>
                <span style={{ fontWeight: order.payment_status === 'refunded' ? 700 : 400, color: order.payment_status === 'refunded' ? '#b91c1c' : 'inherit' }}>
                  {order.payment_status === 'refunded' ? money(Number(order.total_amount || 0)) : '₹0'}
                </span>
              </div>
            </div>

            {/* Gateway Verification Box */}
            <div style={{ marginTop: '20px', padding: '14px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                <ShieldCheck size={14} />
                <span>Gateway Settlement Reference</span>
              </div>
              <div style={{ color: 'var(--muted)' }}>
                Method: <strong style={{ color: 'var(--ink)' }}>{order.payment_method || 'Razorpay Gateway'}</strong>
              </div>
              <div style={{ color: 'var(--muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                Payment ID: <span style={{ fontFamily: 'monospace', color: 'var(--ink)' }}>{order.razorpay_payment_id || order.razorpay_order_id || 'Direct Settlement'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
