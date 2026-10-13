'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { updateAdminOrderFulfillment, updateAdminSellerGroupFulfillment } from '@/lib/admin'
import { formatStateLabel } from '@/lib/utils'
import { Truck, ShieldCheck, Store, AlertTriangle } from 'lucide-react'

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

function SubmitButton({ label = 'Update', disabled }: { label?: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="button button-primary"
      style={{ padding: '0 16px', height: '38px', minWidth: '100px', fontSize: '12px' }}
      disabled={disabled || pending}
    >
      {pending ? 'Saving...' : label}
    </button>
  )
}

export function AdminOrderFulfillmentForm({
  item,
  isPlatformFulfillment = true
}: {
  item: any
  isPlatformFulfillment?: boolean
}) {
  const router = useRouter()
  const [status, setStatus] = useState(item.fulfillment_status || 'unfulfilled')
  const [carrier, setCarrier] = useState(item.carrier || '')
  const [trackingNumber, setTrackingNumber] = useState(item.tracking_number || '')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    item.estimated_delivery_date ? new Date(item.estimated_delivery_date).toISOString().split('T')[0] : ''
  )
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    setStatus(item.fulfillment_status || 'unfulfilled')
    setCarrier(item.carrier || '')
    setTrackingNumber(item.tracking_number || '')
    setEstimatedDeliveryDate(
      item.estimated_delivery_date ? new Date(item.estimated_delivery_date).toISOString().split('T')[0] : ''
    )
  }, [item.fulfillment_status, item.carrier, item.tracking_number, item.estimated_delivery_date])

  return (
    <div style={{ background: 'var(--surface-subtle)', padding: '14px 16px', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '12px' }}>
      <div style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <span>Item Fulfillment: <span style={{ fontWeight: 400 }}>{item.product_name}</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedMessage && <span style={{ color: '#059669', fontSize: '12px', fontWeight: 500 }}>{savedMessage}</span>}
          {isPlatformFulfillment ? (
            <span style={{ color: '#15803d', fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <ShieldCheck size={12} /> Platform Fulfillment
            </span>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Store size={12} /> {item.sellers?.store_name || 'Seller Direct'}
            </span>
          )}
        </div>
      </div>

      <form
        action={async (formData) => {
          try {
            await updateAdminOrderFulfillment(formData)
            setSavedMessage('Saved ✓')
            router.refresh()
            setTimeout(() => setSavedMessage(null), 3000)
          } catch (e: any) {
            alert('Unable to update fulfillment: ' + e.message)
          }
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', alignItems: 'end' }}
      >
        <input type="hidden" name="orderItemId" value={item.id} />

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
            style={{ fontSize: '12px', height: '36px' }}
          >
            {FULFILLMENT_OPTIONS.map(option => (
              <option key={option} value={option}>{formatStateLabel(option)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Carrier
          <input
            name="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="input-field"
            placeholder="e.g. Delhivery, Bluedart"
            style={{ fontSize: '12px', height: '36px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Tracking Number
          <input
            name="trackingNumber"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="input-field"
            placeholder="e.g. AW-19283921"
            style={{ fontSize: '12px', height: '36px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Estimated Delivery
          <input
            type="date"
            name="estimatedDeliveryDate"
            value={estimatedDeliveryDate}
            onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
            className="input-field"
            style={{ fontSize: '12px', height: '36px' }}
          />
        </label>

        <SubmitButton label="Update Item" />
      </form>
    </div>
  )
}

export function AdminSellerGroupFulfillmentForm({
  orderId,
  group
}: {
  orderId: string
  group: any
}) {
  const router = useRouter()
  const initialItem = group.items?.[0] || {}
  const [status, setStatus] = useState(group.fulfillmentStatusSummary === 'mixed' ? 'dispatched' : (group.fulfillmentStatusSummary || 'unfulfilled'))
  const [carrier, setCarrier] = useState(initialItem.carrier || '')
  const [trackingNumber, setTrackingNumber] = useState(initialItem.tracking_number || '')
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState(
    initialItem.estimated_delivery_date ? new Date(initialItem.estimated_delivery_date).toISOString().split('T')[0] : ''
  )
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  return (
    <div style={{ background: '#fff', padding: '16px', borderRadius: '4px', border: '1px solid #e2e8f0', marginTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Truck size={14} color="#0284c7" />
          <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
            Dispatch &amp; Fulfillment Controls for {group.sellerName}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            ({group.totalUnits} {group.totalUnits === 1 ? 'unit' : 'units'})
          </span>
        </div>
        {savedMessage && <span style={{ color: '#059669', fontSize: '12px', fontWeight: 600 }}>{savedMessage}</span>}
      </div>

      <form
        action={async (formData) => {
          try {
            await updateAdminSellerGroupFulfillment(formData)
            setSavedMessage('Seller shipment updated ✓')
            router.refresh()
            setTimeout(() => setSavedMessage(null), 3500)
          } catch (e: any) {
            alert('Unable to update seller shipment: ' + e.message)
          }
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', alignItems: 'end' }}
      >
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="sellerId" value={group.sellerId} />

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Fulfillment State
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
            style={{ fontSize: '12px', height: '36px' }}
          >
            {FULFILLMENT_OPTIONS.map(option => (
              <option key={option} value={option}>{formatStateLabel(option)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Logistics Carrier
          <input
            name="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="input-field"
            placeholder="e.g. Delhivery, Bluedart"
            style={{ fontSize: '12px', height: '36px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Waybill / Consignment
          <input
            name="trackingNumber"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="input-field"
            placeholder="e.g. 7819283741"
            style={{ fontSize: '12px', height: '36px' }}
          />
        </label>

        <label style={{ display: 'grid', gap: '4px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Delivery Date (ETA)
          <input
            type="date"
            name="estimatedDeliveryDate"
            value={estimatedDeliveryDate}
            onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
            className="input-field"
            style={{ fontSize: '12px', height: '36px' }}
          />
        </label>

        <SubmitButton label="Update Seller Shipment" />
      </form>
    </div>
  )
}
