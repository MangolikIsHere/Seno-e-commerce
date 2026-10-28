import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, MapPin, PackageCheck, Truck, Phone, Mail, CalendarDays } from 'lucide-react'
import { getMySellerRecord, getSellerOrderById } from '@/lib/sellers'
import { money } from '@/lib/catalog'
import { PaidCancelForm } from '../PaidCancelForm'
import { FulfillmentForm } from '../FulfillmentForm'

const FULFILLMENT_OPTIONS = [
  'unfulfilled',
  'processing',
  'dispatched',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'returned',
  'delivery_failed'
] as const

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  try {
    return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}

function formatStateLabel(value?: string | null) {
  if (!value) return 'Unfulfilled'
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const seller = await getMySellerRecord()

  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const order = await getSellerOrderById(orderId)
  if (!order) notFound()

  const customer = order.shipping_address || {}

  return (
    <main className="static-page-container" style={{ maxWidth: '1100px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/seller/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>

      <div className="seller-order-detail-grid-2col">
        <section style={{ display: 'grid', gap: '24px' }}>
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <span className="section-kicker">SELLER ORDER</span>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '30px', margin: '8px 0 6px', fontWeight: 400 }}>{order.order_number}</h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span className="status-pill paid">Payment: {order.payment_status}</span>
              <span className="status-pill processing">Fulfillment: {formatStateLabel(order.fulfillment_status)}</span>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Order details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Order date</div><div style={{ fontWeight: 600 }}>{formatDate(order.created_at)}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Payment status</div><div style={{ fontWeight: 600 }}>{order.payment_status}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Fulfillment</div><div style={{ fontWeight: 600 }}>{formatStateLabel(order.fulfillment_status)}</div></div>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Customer & shipping</h2>
            <div className="seller-order-detail-inner-grid">
              <div style={{ display: 'grid', gap: '10px', minWidth: 0 }}>
                <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Customer name</div><div style={{ fontWeight: 600 }}>{customer.recipient_name || '—'}</div></div>
                <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Phone</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}><Phone size={14} /> {customer.phone || '—'}</div></div>
                <div style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Email</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}><Mail size={14} /> {order.customer_email || 'Not provided'}</div></div>
              </div>
              <div style={{ display: 'grid', gap: '8px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}><MapPin size={14} /> Shipping address</div>
                <div style={{ lineHeight: 1.6, color: 'var(--ink)', wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                  <div>{customer.address_line1 || '—'}</div>
                  {customer.address_line2 ? <div>{customer.address_line2}</div> : null}
                  {customer.landmark ? <div><span style={{ color: 'var(--muted)', fontSize: '12px' }}>Landmark:</span> {customer.landmark}</div> : null}
                  <div>{customer.city || ''}{customer.city && customer.state ? ', ' : ''}{customer.state || ''} {customer.postal_code || ''}</div>
                  <div>{customer.country || 'India'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Items</h2>
            <div style={{ display: 'grid', gap: '18px', minWidth: 0 }}>
              {order.order_items?.map((item: any) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)', minWidth: 0 }} className="seller-order-item-row">
                  <div style={{ width: '72px', height: '88px', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                    {item.image_url ? <img src={item.image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </div>
                  <div style={{ minWidth: 0, overflowWrap: 'break-word' }}>
                    <div style={{ fontWeight: 600, wordBreak: 'break-word' }}>{item.product_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px', overflowWrap: 'break-word' }}>
                      SKU: {item.sku} · Qty: {item.quantity} · Variant: {item.variant_details?.size || 'Default'}{item.variant_details?.colour ? ` / ${item.variant_details.colour}` : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px', overflowWrap: 'break-word' }}>Unit price: {money(Number(item.unit_price))}</div>
                  </div>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{money(Number(item.total_price))}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: '24px' }}>
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>
              Fulfillment Control
            </h2>
            <FulfillmentForm
              orderItemId={order.order_items?.[0]?.id || order.id}
              initialStatus={order.fulfillment_status || 'unfulfilled'}
              initialTracking={order.tracking_number || ''}
              initialCarrier={order.carrier || ''}
              initialEstimatedDelivery={order.estimated_delivery_date || ''}
            />

            {order.payment_status === 'paid' && order.fulfillment_status !== 'cancelled' && (
              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <PaidCancelForm orderItemId={order.order_items?.[0]?.id || order.id} />
              </div>
            )}
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Payment</h2>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Payment status</span><strong>{order.payment_status}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Razorpay order</span><strong>{order.razorpay_order_id || '—'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Razorpay payment</span><strong>{order.razorpay_payment_id || '—'}</strong></div>
              {order.fulfillment_status === 'cancelled' && order.payment_status === 'paid' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                  <span style={{ color: 'var(--muted)' }}>Refund status</span>
                  <strong style={{ color: 'var(--error)' }}>Processing</strong>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
