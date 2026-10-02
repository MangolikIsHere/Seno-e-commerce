'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useFormStatus } from 'react-dom'
import { updateAdminOrderFulfillment } from '@/lib/admin'
import { formatStateLabel } from '@/lib/utils'

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

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      className="button button-primary"
      style={{ padding: '0 16px', height: '40px', minWidth: '100px' }}
      disabled={disabled || pending}
    >
      {pending ? 'Saving...' : 'Update'}
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
    <div style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '16px' }}>
      <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <span>Update Fulfillment: <span style={{ fontWeight: 400 }}>{item.product_name}</span></span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {savedMessage && <span style={{ color: '#059669', fontSize: '12px', fontWeight: 500 }}>{savedMessage}</span>}
          {!isPlatformFulfillment && <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 400 }}>(Managed by {item.sellers?.store_name})</span>}
        </div>
      </div>

      <form
        action={async (formData) => {
          try {
            await updateAdminOrderFulfillment(formData)
            setSavedMessage('Updated successfully ✓')
            router.refresh()
            setTimeout(() => setSavedMessage(null), 3000)
          } catch (e: any) {
            alert('Unable to update: ' + e.message)
          }
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', alignItems: 'end' }}
      >
        <input type="hidden" name="orderItemId" value={item.id} />

        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Status
          <select
            name="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field"
            style={{ fontSize: '12px' }}
            disabled={!isPlatformFulfillment}
          >
            {FULFILLMENT_OPTIONS.map(option => (
              <option key={option} value={option}>{formatStateLabel(option)}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Carrier
          <input
            name="carrier"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            className="input-field"
            placeholder="e.g. ddc / Delhivery"
            disabled={!isPlatformFulfillment}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Tracking Number
          <input
            name="trackingNumber"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            className="input-field"
            placeholder="e.g. 515416565"
            disabled={!isPlatformFulfillment}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Estimated Delivery
          <input
            type="date"
            name="estimatedDeliveryDate"
            value={estimatedDeliveryDate}
            onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
            className="input-field"
            disabled={!isPlatformFulfillment}
          />
        </label>

        <SubmitButton disabled={!isPlatformFulfillment} />
      </form>
    </div>
  )
}
