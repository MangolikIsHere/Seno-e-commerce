import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, MapPin, PackageCheck, Truck, Phone, Mail, CalendarDays } from 'lucide-react'
import { getAdminOrderById, updateAdminOrderFulfillment, checkIsAdmin } from '@/lib/admin'
import { money } from '@/lib/catalog'

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

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const isAdmin = await checkIsAdmin()

  if (!isAdmin) {
    redirect('/')
  }

  const order = await getAdminOrderById(id)
  if (!order) notFound()

  const customer = order.shipping_address || {}
  const profile = Array.isArray(order.profiles) ? order.profiles[0] : order.profiles

  return (
    <main className="static-page-container" style={{ maxWidth: '1100px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/admin/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '24px' }}>
        <section style={{ display: 'grid', gap: '24px' }}>
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <span className="section-kicker">PLATFORM ORDER</span>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '30px', margin: '8px 0 6px', fontWeight: 400 }}>{order.order_number}</h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
              <span className="status-pill paid">Payment: {order.payment_status}</span>
              <span className="status-pill processing">Order Status: {formatStateLabel(order.status)}</span>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Customer & shipping</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ display: 'grid', gap: '10px' }}>
                <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Customer name</div><div style={{ fontWeight: 600 }}>{customer.recipient_name || profile?.full_name || '—'}</div></div>
                <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Phone</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}><Phone size={14} /> {customer.phone || profile?.phone || '—'}</div></div>
                <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Email</div><div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}><Mail size={14} /> {profile?.email || 'Not provided'}</div></div>
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}><MapPin size={14} /> Shipping address</div>
                <div style={{ lineHeight: 1.6, color: 'var(--ink)' }}>
                  <div>{customer.address_line1 || '—'}</div>
                  {customer.address_line2 ? <div>{customer.address_line2}</div> : null}
                  <div>{customer.city || ''}{customer.city && customer.state ? ', ' : ''}{customer.state || ''} {customer.postal_code || ''}</div>
                  <div>{customer.country || 'India'}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Order Items & Fulfillment</h2>
            <div style={{ display: 'grid', gap: '24px' }}>
              {order.order_items?.map((item: any) => {
                const isPlatformFulfillment = !item.sellers || item.sellers?.store_name === 'SENO'

                return (
                  <div key={item.id} style={{ display: 'grid', gap: '16px', paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr auto', gap: '16px' }}>
                      <div style={{ width: '72px', height: '88px', borderRadius: '2px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                         {/* Item image could go here if added to schema */}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                          SKU: {item.sku} · Qty: {item.quantity}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                          Seller: <strong style={{ color: 'var(--ink)' }}>{item.sellers?.store_name || 'Platform (SENO)'}</strong>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>Unit price: {money(Number(item.unit_price))}</div>
                      </div>
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{money(Number(item.total_price))}</div>
                    </div>

                    {/* Fulfillment form for Platform items */}
                    <div style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                      <div style={{ marginBottom: '12px', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Fulfillment Status: {formatStateLabel(item.fulfillment_status)}</span>
                        {!isPlatformFulfillment && <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 400 }}>(Managed by {item.sellers?.store_name})</span>}
                      </div>

                      <form action={updateAdminOrderFulfillment} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr auto', gap: '12px', alignItems: 'end' }}>
                        <input type="hidden" name="orderItemId" value={item.id} />
                        
                        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Status
                          <select name="status" defaultValue={item.fulfillment_status || 'unfulfilled'} className="input-field" style={{ fontSize: '12px' }} disabled={!isPlatformFulfillment}>
                            {FULFILLMENT_OPTIONS.map(option => (
                              <option key={option} value={option}>{formatStateLabel(option)}</option>
                            ))}
                          </select>
                        </label>

                        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Carrier
                          <input name="carrier" defaultValue={item.carrier || ''} className="input-field" placeholder="Delhivery" disabled={!isPlatformFulfillment} />
                        </label>

                        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Tracking #
                          <input name="trackingNumber" defaultValue={item.tracking_number || ''} className="input-field" placeholder="ABC123" disabled={!isPlatformFulfillment} />
                        </label>

                        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Estimated Delivery
                          <input type="date" name="estimatedDeliveryDate" defaultValue={item.estimated_delivery_date ? new Date(item.estimated_delivery_date).toISOString().split('T')[0] : ''} className="input-field" disabled={!isPlatformFulfillment} />
                        </label>

                        <button type="submit" className="button button-primary" style={{ padding: '0 16px', height: '40px' }} disabled={!isPlatformFulfillment}>
                          Update
                        </button>
                      </form>
                    </div>

                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: '24px' }}>
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 18px' }}>Payment & Ledger</h2>
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Payment status</span><strong>{order.payment_status}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Order Total</span><strong>{money(Number(order.total_amount))}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: 'var(--muted)' }}>Razorpay order</span>
                <strong style={{ fontSize: '11px', wordBreak: 'break-all', textAlign: 'right', maxWidth: '120px' }}>{order.razorpay_order_id || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Razorpay payment</span>
                <strong style={{ fontSize: '11px', wordBreak: 'break-all', textAlign: 'right', maxWidth: '120px' }}>{order.razorpay_payment_id || '—'}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
