import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, MapPin, Phone, Mail } from 'lucide-react'
import { getAdminOrderById, checkIsAdmin, cancelAdminOrderAction } from '@/lib/admin'
import { money } from '@/lib/catalog'
import { formatStateLabel } from '@/lib/utils'
import { CopyButton } from './CopyButton'
import { AdminOrderFulfillmentForm } from './AdminOrderFulfillmentForm'

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
    redirect('/')
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
  const etaDisplay = uniqueETAs.length === 0 ? 'Not set' 
    : uniqueETAs.length === 1 ? formatDate(uniqueETAs[0] as string) 
    : 'Multiple'

  const sellersCount = Object.keys(sellerGroups).length

  return (
    <main className="static-page-container" style={{ maxWidth: '1200px', paddingBottom: '96px' }}>
      {/* Back Link */}
      <div style={{ marginBottom: '32px' }}>
        <Link href="/admin/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)', textDecoration: 'none' }}>
          <ArrowLeft size={16} /> Back to Orders
        </Link>
      </div>

      {/* Order Header */}
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ 
              fontFamily: 'Georgia, serif', 
              fontSize: 'clamp(24px, 4vw, 36px)', 
              margin: '0 0 12px', 
              fontWeight: 400,
              wordBreak: 'normal',
              overflowWrap: 'anywhere'
            }}>
              Order {order.order_number}
            </h1>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                Placed {formatDate(order.created_at)}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`status-pill ${order.payment_status === 'paid' ? 'paid' : order.payment_status === 'unpaid' ? 'processing' : 'rejected'}`}>
                  {order.payment_status.toUpperCase()}
                </span>
                <span className={`status-pill ${['cancelled', 'returned', 'delivery_failed'].includes(order.status) ? 'rejected' : order.status === 'delivered' ? 'approved' : 'processing'}`}>
                  {formatStateLabel(order.status).toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {order.payment_status === 'unpaid' && order.status !== 'cancelled' && (
            <form action={cancelAdminOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit" className="button button-outline" style={{ borderColor: '#9f1239', color: '#9f1239', padding: '0 20px', minHeight: '44px' }}>
                Cancel Order
              </button>
            </form>
          )}
        </div>
      </header>

      {/* Summary Strip */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
        gap: '24px', 
        padding: '24px', 
        background: 'var(--surface-subtle)', 
        border: '1px solid var(--border)', 
        borderRadius: '8px',
        marginBottom: '40px' 
      }}>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px' }}>Payment</div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{formatStateLabel(order.payment_status)}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px' }}>Order Total</div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{money(Number(order.total_amount))}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px' }}>Items</div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{totalItemsCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px' }}>Seller(s)</div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{sellersCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', marginBottom: '8px' }}>Estimated Delivery</div>
          <div style={{ fontWeight: 600, fontSize: '15px' }}>{etaDisplay}</div>
        </div>
      </div>

      {/* Two Column Layout (Desktop) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 700px), 1fr))',
        gap: '40px' 
      }}>
        {/* Main Content */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* Customer & Shipping */}
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 24px' }}>Customer & Shipping</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Customer Name</div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{customer.recipient_name || profile?.full_name || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Phone</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}><Phone size={14} /> {customer.phone || profile?.phone || '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '4px' }}>Email</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px' }}><Mail size={14} /> {profile?.email || 'Not provided'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)' }}><MapPin size={14} /> Shipping Address</div>
                <div style={{ lineHeight: 1.6, fontSize: '15px', color: 'var(--ink)' }}>
                  <div>{customer.address_line1 || '—'}</div>
                  {customer.address_line2 ? <div>{customer.address_line2}</div> : null}
                  <div>{customer.city || ''}{customer.city && customer.state ? ', ' : ''}{customer.state || ''} {customer.postal_code || ''}</div>
                  <div>{customer.country || 'India'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items grouped by Seller */}
          <div>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 24px' }}>Order Items & Fulfillment</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {Object.entries(sellerGroups).map(([sellerName, items]) => (
                <div key={sellerName} style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--surface-subtle)', padding: '16px 24px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Seller — {sellerName}
                  </div>
                  <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {items.map(item => {
                      const isPlatformFulfillment = !item.sellers || item.sellers?.store_name === 'SENO'
                      const productImg = item.products?.product_images?.find((img: any) => img.is_primary)?.url || item.products?.product_images?.[0]?.url
                      const variantDetails = item.variant_details || {}
                      
                      return (
                        <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            <div style={{ width: '80px', height: '100px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface-subtle)', position: 'relative', flexShrink: 0 }}>
                               {productImg ? (
                                 <Image src={productImg} alt={item.product_name} fill style={{ objectFit: 'cover' }} unoptimized />
                               ) : (
                                 <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '10px' }}>No Image</div>
                               )}
                            </div>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                              <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{item.product_name}</div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 'x 16px', rowGap: '4px', fontSize: '13px', color: 'var(--muted)' }}>
                                <span>SKU:</span> <span style={{ color: 'var(--ink)' }}>{item.sku}</span>
                                <span>Variant:</span> <span style={{ color: 'var(--ink)' }}>{variantDetails.size || 'N/A'} / {variantDetails.colour || 'N/A'}</span>
                                <span>Qty:</span> <span style={{ color: 'var(--ink)' }}>{item.quantity}</span>
                                <span>Unit Price:</span> <span style={{ color: 'var(--ink)' }}>{money(Number(item.unit_price))}</span>
                              </div>
                            </div>
                            <div style={{ fontWeight: 600, fontSize: '16px', textAlign: 'right' }}>
                              {money(Number(item.total_price))}
                            </div>
                          </div>
                          
                          <AdminOrderFulfillmentForm 
                            item={item} 
                            isPlatformFulfillment={isPlatformFulfillment} 
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0, width: '100%', maxWidth: '100%' }}>
          
          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 24px' }}>Payment & Transaction</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                <span>{money(Number(order.subtotal_amount))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Shipping</span>
                <span>{money(Number(order.shipping_amount))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--muted)' }}>Discount</span>
                <span>{money(Number(order.discount_amount || 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px', fontWeight: 600, fontSize: '16px' }}>
                <span>Total</span>
                <span>{money(Number(order.total_amount))}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Razorpay Order ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', background: 'var(--surface-subtle)', padding: '8px 12px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'nowrap', flex: 1 }}>
                    {order.razorpay_order_id || '—'}
                  </div>
                  {order.razorpay_order_id && <CopyButton text={order.razorpay_order_id} label="Copy Order ID" />}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ color: 'var(--muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Razorpay Payment ID</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '13px', background: 'var(--surface-subtle)', padding: '8px 12px', borderRadius: '4px', overflowX: 'auto', whiteSpace: 'nowrap', flex: 1 }}>
                    {order.razorpay_payment_id || '—'}
                  </div>
                  {order.razorpay_payment_id && <CopyButton text={order.razorpay_payment_id} label="Copy Payment ID" />}
                </div>
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 24px' }}>Order Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ color: 'var(--muted)' }}>Order ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', textAlign: 'right' }}>{order.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ color: 'var(--muted)' }}>Created</span>
                <span style={{ textAlign: 'right' }}>{new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ color: 'var(--muted)' }}>Customer ID</span>
                <span style={{ fontFamily: 'monospace', fontSize: '13px', textAlign: 'right' }}>{order.customer_id}</span>
              </div>
            </div>
          </div>

        </aside>
      </div>
    </main>
  )
}
