'use client'

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
  isPlatformFulfillment 
}: { 
  item: any
  isPlatformFulfillment: boolean 
}) {
  return (
    <div style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '16px' }}>
      <div style={{ marginBottom: '16px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <span>Update Fulfillment: <span style={{ fontWeight: 400 }}>{item.product_name}</span></span>
        {!isPlatformFulfillment && <span style={{ color: 'var(--muted)', fontSize: '11px', fontWeight: 400 }}>(Managed by {item.sellers?.store_name})</span>}
      </div>

      <form 
        action={async (formData) => {
          try {
            await updateAdminOrderFulfillment(formData)
            // Show a simple success toast or just let the revalidatePath do its job
          } catch (e: any) {
            alert('Unable to update: ' + e.message)
          }
        }} 
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', alignItems: 'end' }}
      >
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
          <input name="carrier" defaultValue={item.carrier || ''} className="input-field" placeholder="e.g. Delhivery" disabled={!isPlatformFulfillment} />
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Tracking Number
          <input name="trackingNumber" defaultValue={item.tracking_number || ''} className="input-field" placeholder="e.g. ABC12345" disabled={!isPlatformFulfillment} />
        </label>

        <label style={{ display: 'grid', gap: '6px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>
          Estimated Delivery
          <input type="date" name="estimatedDeliveryDate" defaultValue={item.estimated_delivery_date ? new Date(item.estimated_delivery_date).toISOString().split('T')[0] : ''} className="input-field" disabled={!isPlatformFulfillment} />
        </label>

        <SubmitButton disabled={!isPlatformFulfillment} />
      </form>
    </div>
  )
}
