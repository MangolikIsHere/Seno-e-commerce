import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, redirect } from 'next/navigation'
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Tag, 
  PackageCheck, 
  AlertCircle, 
  AlertTriangle,
  Video, 
  Store, 
  Layers, 
  Truck, 
  Package 
} from 'lucide-react'
import { getAdminOrderById, checkIsAdmin } from '@/lib/admin'
import { money } from '@/lib/catalog'
import { formatStateLabel } from '@/lib/utils'
import { CopyButton } from './CopyButton'
import { AdminOrderFulfillmentForm, AdminSellerGroupFulfillmentForm } from './AdminOrderFulfillmentForm'
import { AdminOrderActions } from '@/components/admin/AdminOrderActions'
import { OrderStatusTimeline } from '@/components/admin/OrderStatusTimeline'
import { groupOrderItemsBySeller } from '@/lib/sellerOrderHelpers'

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

  // Authoritative grouping by seller
  const sellerGroups = groupOrderItemsBySeller(order.order_items || [])
  const isMultiSeller = sellerGroups.length > 1
  const totalItemsCount = sellerGroups.reduce((acc, g) => acc + g.totalUnits, 0)

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="admin-kicker">ORDER DOSSIER</span>
              {isMultiSeller && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  padding: '2px 8px',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  <Layers size={11} />
                  <span>Multi-Seller Order ({sellerGroups.length} Vendors)</span>
                </span>
              )}
            </div>

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
              <span className={`status-pill ${['cancelled', 'returned', 'delivery_failed'].includes(order.status) ? 'rejected' : order.status === 'delivered' ? 'approved' : ['shipped', 'dispatched', 'in_transit'].includes(order.status) ? 'shipped' : 'processing'}`}>
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
          {/* Purchased Items Card Grouped by Seller */}
          <div className="admin-table-card">
            <div className="admin-table-header-row">
              <div>
                <h2 className="admin-card-heading">Purchased Items ({totalItemsCount})</h2>
                <p className="admin-card-subheading">
                  {isMultiSeller 
                    ? `Grouped across ${sellerGroups.length} distinct sellers` 
                    : 'Authoritative seller attribution and inventory items'}
                </p>
              </div>
            </div>

            {isMultiSeller && (
              <div style={{ margin: '0 24px 16px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', fontSize: '12.5px', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={14} color="#0284c7" />
                <span>
                  This parent order contains products from multiple sellers. Each seller group is displayed separately below with its respective items, fulfillment state, and financial settlement.
                </span>
              </div>
            )}

            <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sellerGroups.map((group, gIdx) => (
                <div
                  key={group.sellerId + gIdx}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#fff'
                  }}
                >
                  {/* Seller Header */}
                  <div
                    style={{
                      background: group.isPlatform ? '#f0fdf4' : group.isMissing ? '#fffbeb' : '#f8fafc',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      flexWrap: 'wrap',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {group.isPlatform ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 700 }}>
                          <ShieldCheck size={13} />
                          SENO Platform
                        </span>
                      ) : group.isMissing ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 700 }}>
                          <AlertTriangle size={13} />
                          Seller information unavailable [Investigation Required]
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#e2e8f0', color: '#1e293b', padding: '3px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 700 }}>
                          <Store size={13} />
                          {group.sellerName}
                        </span>
                      )}

                      {!group.isPlatform && group.slug && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Store slug: <code style={{ fontFamily: 'monospace' }}>{group.slug}</code>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                      <span style={{ color: 'var(--muted)' }}>
                        Items: <strong style={{ color: 'var(--ink)' }}>{group.totalUnits}</strong>
                      </span>
                      <span style={{ color: 'var(--muted)' }}>
                        Subtotal: <strong style={{ color: 'var(--ink)' }}>{money(group.subtotal)}</strong>
                      </span>
                      <span className={`status-pill ${group.fulfillmentStatusSummary === 'delivered' ? 'approved' : group.fulfillmentStatusSummary === 'cancelled' ? 'rejected' : 'processing'}`} style={{ fontSize: '10px' }}>
                        {formatStateLabel(group.fulfillmentStatusSummary)}
                      </span>
                    </div>
                  </div>

                  {/* Seller Items List */}
                  <div style={{ padding: '0 16px' }}>
                    {group.items.map((item: any, itmIdx: number) => {
                      const primaryImage = item.products?.product_images?.find((img: any) => img.is_primary)?.url || item.products?.product_images?.[0]?.url
                      const variantColour = item.variant_details?.colour
                      const variantSize = item.variant_details?.size

                      return (
                        <div
                          key={item.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            padding: '16px 0',
                            borderBottom: itmIdx < group.items.length - 1 ? '1px solid #f1f5f9' : 'none',
                            gap: '16px'
                          }}
                        >
                          <div style={{ width: '60px', height: '76px', position: 'relative', flexShrink: 0, background: '#f5f5f4', borderRadius: '2px', overflow: 'hidden' }}>
                            {primaryImage ? (
                              <Image src={primaryImage} alt={item.product_name} fill style={{ objectFit: 'cover' }} sizes="60px" />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Package size={20} color="var(--muted)" />
                              </div>
                            )}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14.5px', fontWeight: 600, color: 'var(--ink)', marginBottom: '3px' }}>
                              {item.product_name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '6px' }}>
                              SKU: <span style={{ fontFamily: 'monospace' }}>{item.sku}</span>
                              {variantSize ? ` · Size: ${variantSize}` : ''}
                              {variantColour && variantColour !== 'Default' ? ` · Colour: ${variantColour}` : ''}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '11px', color: 'var(--muted)' }}>
                              <span>Fulfillment: <strong style={{ textTransform: 'capitalize', color: 'var(--ink)' }}>{formatStateLabel(item.fulfillment_status)}</strong></span>
                              {item.carrier && (
                                <>
                                  <span>·</span>
                                  <span>Carrier: <strong>{item.carrier}</strong></span>
                                </>
                              )}
                              {item.tracking_number && (
                                <>
                                  <span>·</span>
                                  <span>Waybill: <code style={{ fontFamily: 'monospace' }}>{item.tracking_number}</code></span>
                                </>
                              )}
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

                  {/* Seller Group Financial Breakdown Strip */}
                  <div style={{ background: '#f8fafc', padding: '10px 16px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', color: '#475569' }}>
                    <div>
                      <span>Seller Subtotal: <strong>{money(group.subtotal)}</strong></span>
                    </div>
                    {group.isPlatform ? (
                      <span style={{ color: '#166534', fontWeight: 500 }}>
                        Platform-Owned Product (Direct Inventory)
                      </span>
                    ) : (
                      <div style={{ display: 'flex', gap: '14px' }}>
                        <span>
                          Commission: <strong style={{ color: '#059669' }}>{money(group.commissionAmount)}</strong>
                        </span>
                        <span>
                          Seller Payout: <strong style={{ color: '#0f172a' }}>{money(group.sellerPayoutAmount)}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Tracking & Carrier Controls */}
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 className="admin-card-heading" style={{ marginBottom: '4px' }}>Fulfillment &amp; Logistics Controls</h2>
            <p className="admin-card-subheading" style={{ marginBottom: '20px' }}>
              Update logistics dispatch, consignment numbers, and delivery progression per seller shipment
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {sellerGroups.map((group, gi) => (
                <div key={group.sellerId + gi} style={{ background: 'var(--surface-subtle)', padding: '18px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Store size={15} color="var(--muted)" />
                      <span>{group.sellerName}</span>
                      <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--muted)' }}>
                        ({group.totalUnits} items)
                      </span>
                    </div>
                    <span className={`status-pill ${group.fulfillmentStatusSummary === 'delivered' ? 'approved' : 'processing'}`} style={{ fontSize: '10px' }}>
                      {formatStateLabel(group.fulfillmentStatusSummary)}
                    </span>
                  </div>

                  {/* Bulk shipment updater for this seller */}
                  <AdminSellerGroupFulfillmentForm orderId={order.id} group={group} />

                  {/* Individual item override toggles if multi-item */}
                  {group.items.length > 1 && (
                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
                        Individual Item Overrides ({group.items.length} items)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {group.items.map((item: any) => (
                          <AdminOrderFulfillmentForm
                            key={item.id}
                            item={item}
                            isPlatformFulfillment={group.isPlatform}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer Info & Financial Settlement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Customer & Shipping Address Card */}
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="admin-card-heading" style={{ margin: 0 }}>Customer &amp; Destination</h2>
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
                  Contact Email &amp; Phone
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

          {/* Financial Settlement Card */}
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
                <span style={{ color: 'var(--muted)' }}>Shipping &amp; Freight</span>
                <span>{Number(order.shipping_amount) === 0 ? 'Complimentary' : money(Number(order.shipping_amount))}</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
                <span>Total Settled</span>
                <span>{money(Number(order.total_amount || 0))}</span>
              </div>
            </div>

            {/* Seller-Wise Financial Breakdown Box */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', fontWeight: 600, marginBottom: '10px' }}>
                Seller-Wise Financial Attribution
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sellerGroups.map((group, sIdx) => (
                  <div
                    key={group.sellerId + sIdx}
                    style={{
                      padding: '10px 12px',
                      background: '#f8fafc',
                      borderRadius: '4px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '4px' }}>
                      <span>{group.sellerName}</span>
                      <span>{money(group.subtotal)}</span>
                    </div>

                    {group.isPlatform ? (
                      <div style={{ color: '#166534', fontSize: '11px' }}>
                        Platform direct inventory — 100% platform revenue
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '11px' }}>
                        <span>Commission: {money(group.commissionAmount)}</span>
                        <span>Payable to Seller: <strong style={{ color: '#0f172a' }}>{money(group.sellerPayoutAmount)}</strong></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Operational Settlement Status */}
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

            {/* Return & Refund Verification Policy Reference Card */}
            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: '2px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                <Video size={14} />
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.8px', fontSize: '11px' }}>Return &amp; Refund Policy Reference</span>
              </div>
              <p style={{ margin: '0 0 10px', color: 'var(--muted)', lineHeight: 1.5 }}>
                Customers are advised to provide continuous unboxing video footage for claims of transit damage, manufacturing defects, or missing items within 7 days of delivery.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11.5px' }}>
                <div style={{ color: 'var(--muted)' }}>
                  • <strong>Statutory Terms:</strong> Claims must be assessed individually. A missing video is not sole grounds for automatic refusal where statutory rights apply.
                </div>
                <div style={{ color: 'var(--muted)' }}>
                  • <strong>Customer Support Line:</strong> +91 8617648031 (WhatsApp Business)
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link
                  href="/return-refund-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--ink)', textDecoration: 'underline', fontWeight: 600, fontSize: '11px' }}
                >
                  View Customer Policy ↗
                </Link>
                <a
                  href={`https://wa.me/918617648031?text=${encodeURIComponent(`Hello SENO support, inquiring regarding order #${order.order_number}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--ink)', textDecoration: 'underline', fontSize: '11px' }}
                >
                  Open WhatsApp ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
