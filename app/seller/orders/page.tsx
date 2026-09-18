import { redirect } from 'next/navigation'
import { getSellerOrders, getMySellerRecord } from '@/lib/sellers'
import { money } from '@/lib/catalog'
import { FulfillmentForm } from './FulfillmentForm'
import Link from 'next/link'
import { ArrowLeft, Truck, Package, ShieldCheck, MapPin } from 'lucide-react'

export default async function SellerOrdersPage() {
  const seller = await getMySellerRecord()
  
  if (!seller || seller.seller_status !== 'approved') {
    redirect('/seller/register')
  }

  const orders = await getSellerOrders()

  return (
    <div className="static-page-container" style={{ maxWidth: '1040px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link 
          href="/seller/dashboard" 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--muted)',
            textDecoration: 'none',
            letterSpacing: '0.5px'
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Seller Dashboard</span>
        </Link>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <span className="section-kicker">CONSIGNMENT DISPATCH</span>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: '30px',
          fontWeight: 400,
          letterSpacing: '-0.5px',
          margin: '4px 0 6px'
        }}>
          Fulfillment & Orders
        </h1>
        <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
          Process item dispatches, assign couriers, and update customer tracking numbers
        </p>
      </div>

      {orders.length === 0 ? (
        <div style={{ padding: '64px 24px', textAlign: 'center', border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
          <Truck size={36} color="var(--muted)" strokeWidth={1.3} style={{ margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            No customer consignments assigned to your store yet.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((item: any) => (
            <div key={item.id} style={{ border: '1px solid var(--border)', background: '#fff', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px 20px',
                background: 'var(--surface-subtle)',
                borderBottom: '1px solid var(--border)',
                fontSize: '12px'
              }}>
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Order Date</span>
                    <span style={{ fontWeight: 600 }}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Order #</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{item.orders.order_number}</span>
                      <span className="status-pill paid" style={{ fontSize: '10px', padding: '2px 8px', letterSpacing: '0.5px' }}>
                        PAID
                      </span>
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Ship To</span>
                    <span style={{ fontWeight: 500 }}>{item.orders.shipping_address?.recipient_name}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', fontSize: '10px' }}>Net Vendor Payout</span>
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--ink)' }}>{money(Number(item.seller_payout_amount))}</span>
                </div>
              </div>

              <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px', alignItems: 'start' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 10px', color: 'var(--ink)' }}>{item.product_name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px', marginBottom: '16px' }}>
                    <span>SKU:</span> <span style={{ fontFamily: 'monospace', color: 'var(--ink)' }}>{item.sku}</span>
                    <span>Quantity:</span> <span style={{ color: 'var(--ink)' }}>{item.quantity}</span>
                    <span>Variant:</span> <span style={{ color: 'var(--ink)' }}>{item.variant_details?.size || 'Default'} {item.variant_details?.colour ? `· ${item.variant_details.colour}` : ''}</span>
                    <span>Retail Unit Price:</span> <span style={{ color: 'var(--ink)' }}>{money(Number(item.unit_price))}</span>
                  </div>
                  
                  {item.orders.shipping_address && (
                    <div style={{ fontSize: '12px', padding: '14px 16px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px', lineHeight: 1.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                        <MapPin size={13} />
                        <span>Destination Address</span>
                      </div>
                      <div>{item.orders.shipping_address.address_line1}, {item.orders.shipping_address.city}, {item.orders.shipping_address.state} {item.orders.shipping_address.postal_code}</div>
                      <div style={{ color: 'var(--muted)', marginTop: '4px' }}>Phone: {item.orders.shipping_address.phone}</div>
                    </div>
                  )}
                </div>

                <div style={{ padding: '18px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <h4 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 14px', fontWeight: 600, color: 'var(--ink)' }}>
                    Fulfillment Status
                  </h4>
                  <FulfillmentForm
                    orderItemId={item.id}
                    initialStatus={item.fulfillment_status}
                    initialTracking={item.tracking_number || ''}
                    initialCarrier={item.carrier || ''}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

