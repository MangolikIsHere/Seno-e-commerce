'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, Circle, PackageCheck, Truck } from 'lucide-react'
import { getCustomerOrderById, Order } from '@/lib/orders'
import { money } from '@/lib/catalog'

const states = [
  'unfulfilled',
  'processing',
  'dispatched',
  'in_transit',
  'out_for_delivery',
  'delivered'
] as const

const labelMap: Record<string, string> = {
  unfulfilled: 'Order Placed',
  processing: 'Processing',
  dispatched: 'Dispatched',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered'
}

export default function TrackingPage() {
  const params = useParams()
  const orderId = params?.id as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return
    getCustomerOrderById(orderId).then(({ order: loadedOrder, error }) => {
      if (!error) setOrder(loadedOrder)
      setLoading(false)
    })
  }, [orderId])

  const currentStatus = useMemo(() => {
    if (!order?.order_items?.[0]) return 'unfulfilled'
    return order.order_items[0].fulfillment_status || 'unfulfilled'
  }, [order])

  const statusIndex = states.indexOf((currentStatus as any) || 'unfulfilled')

  if (loading) {
    return <main className="static-page-container" style={{ textAlign: 'center', padding: '80px 20px' }}>Loading tracking…</main>
  }

  if (!order) {
    return <main className="static-page-container" style={{ maxWidth: '600px', padding: '80px 20px' }}><h1>Order not found</h1><Link href="/account" className="button button-primary">Return to account</Link></main>
  }

  const trackedItem = order.order_items?.[0]

  return (
    <main className="static-page-container" style={{ maxWidth: '980px', paddingBottom: '96px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link href="/account/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--muted)', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to orders
        </Link>
      </div>

      <div className="admin-table-card" style={{ padding: '28px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="section-kicker">ORDER TRACKING</span>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '30px', margin: '8px 0 8px', fontWeight: 400 }}>#{order.order_number}</h1>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className="status-pill paid">Payment: {order.payment_status}</span>
            <span className="status-pill processing">Status: {labelMap[currentStatus] || 'Processing'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '24px' }}>
        <section className="admin-table-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px' }}>Fulfillment timeline</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {states.map((state, index) => {
              const isComplete = index <= statusIndex
              const isCurrent = index === statusIndex
              const showText = labelMap[state] || state
              return (
                <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: isComplete ? '#111827' : '#f3f4f6', border: `1px solid ${isComplete ? '#111827' : '#d1d5db'}` }}>
                    {isComplete ? <Check size={16} color="#fff" /> : <Circle size={10} color={isCurrent ? '#111827' : '#9ca3af'} fill={isCurrent ? '#111827' : 'none'} />}
                  </div>
                  <div style={{ flex: 1, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                    <div style={{ fontWeight: isCurrent ? 700 : 500, color: isComplete ? 'var(--ink)' : 'var(--muted)' }}>{showText}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <aside style={{ display: 'grid', gap: '24px' }}>
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px' }}>Shipment details</h2>
            <div style={{ display: 'grid', gap: '12px', fontSize: '13px' }}>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Item</div><div style={{ fontWeight: 600 }}>{trackedItem?.product_name || '—'}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Qty</div><div>{trackedItem?.quantity || 1}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Seller</div><div>{trackedItem?.seller_id ? 'SENO Official' : '—'}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Estimated delivery</div><div>{trackedItem?.estimated_delivery_date ? new Date(trackedItem.estimated_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Carrier</div><div>{trackedItem?.carrier || '—'}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '11px', textTransform: 'uppercase' }}>Tracking</div><div>{trackedItem?.tracking_number || '—'}</div></div>
            </div>
          </div>

          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', margin: '0 0 20px' }}>Shipping destination</h2>
            <div style={{ lineHeight: 1.75, fontSize: '13px' }}>
              <div>{order.shipping_address.recipient_name}</div>
              <div>{order.shipping_address.address_line1}</div>
              {order.shipping_address.address_line2 ? <div>{order.shipping_address.address_line2}</div> : null}
              <div>{order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}</div>
              <div>{order.shipping_address.country}</div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  )
}
