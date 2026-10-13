'use client'

import React, { useState, useTransition } from 'react'
import {
  X,
  Package,
  Plus,
  Trash2,
  Check,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react'
import { SenoImage } from '@/components/SenoImage'
import { quickUpdateProductInventory } from '@/lib/sellers'
import { money } from '@/lib/catalog'

interface VariantItem {
  id?: string
  size: string
  colour: string
  sku: string
  quantity: number
  is_active: boolean
}

interface QuickInventoryModalProps {
  product: {
    id: string
    name: string
    slug: string
    price: number
    primary_image?: string
    approval_status?: string
    product_variants?: any[]
  }
  onClose: () => void
  onSuccess?: (totalStock: number, isSoldOut: boolean) => void
}

export function QuickInventoryModal({ product, onClose, onSuccess }: QuickInventoryModalProps) {
  // Extract initial variants
  const initialVariants: VariantItem[] = (product.product_variants || [])
    .filter((v: any) => v.is_active !== false)
    .map((v: any) => {
      let qty = 0
      if (v.inventory) {
        if (Array.isArray(v.inventory) && v.inventory.length > 0) {
          qty = Number(v.inventory[0]?.quantity ?? 0)
        } else if (v.inventory.quantity !== undefined) {
          qty = Number(v.inventory.quantity ?? 0)
        }
      }
      return {
        id: v.id,
        size: v.size || 'Standard',
        colour: v.colour || 'Default',
        sku: v.sku || '',
        quantity: isNaN(qty) ? 0 : qty,
        is_active: true
      }
    })

  const [variants, setVariants] = useState<VariantItem[]>(initialVariants)
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // New variant state
  const [showAddVariant, setShowAddVariant] = useState(false)
  const [newSize, setNewSize] = useState('')
  const [newColour, setNewColour] = useState('')
  const [newQuantity, setNewQuantity] = useState('10')

  // Check dirty state
  const isDirty = (() => {
    if (variants.length !== initialVariants.length) return true
    for (let i = 0; i < variants.length; i++) {
      const curr = variants[i]
      const orig = initialVariants.find(v => v.id && v.id === curr.id)
      if (!orig) return true
      if (Number(curr.quantity) !== Number(orig.quantity)) return true
    }
    return false
  })()

  // Stepper handlers
  const handleQuantityChange = (index: number, val: number) => {
    const nextQty = Math.max(0, val)
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, quantity: nextQty } : v))
  }

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      setErrorMessage('Every product must retain at least one configured variant.')
      return
    }
    setErrorMessage(null)
    setVariants(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddNewVariant = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    const cleanSize = (newSize || '').trim()
    const cleanColour = (newColour || '').trim()
    const cleanQty = Math.max(0, parseInt(newQuantity, 10) || 0)

    if (!cleanSize) {
      setErrorMessage('Please specify a size (e.g. S, M, L, XL, Free Size).')
      return
    }
    if (!cleanColour) {
      setErrorMessage('Please specify a colour (e.g. Noir, Ivory, Rose).')
      return
    }

    // Check duplicate
    const exists = variants.some(
      v => v.size.toLowerCase() === cleanSize.toLowerCase() && v.colour.toLowerCase() === cleanColour.toLowerCase()
    )
    if (exists) {
      setErrorMessage(`The combination "${cleanSize}" / "${cleanColour}" already exists in this list.`)
      return
    }

    const baseSlug = (product.slug || 'seno').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    const genSku = `SENO-${baseSlug.slice(0, 4)}-${cleanSize.toUpperCase().slice(0, 3)}-${cleanColour.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-3)}`

    setVariants(prev => [
      ...prev,
      {
        size: cleanSize,
        colour: cleanColour,
        sku: genSku,
        quantity: cleanQty,
        is_active: true
      }
    ])

    setNewSize('')
    setNewColour('')
    setNewQuantity('10')
    setShowAddVariant(false)
  }

  const handleSaveInventory = () => {
    setErrorMessage(null)
    setSuccessMessage(null)

    if (variants.length === 0) {
      setErrorMessage('Please configure at least one variant with stock.')
      return
    }

    startTransition(async () => {
      try {
        const payload = variants.map(v => ({
          id: v.id,
          size: v.size,
          colour: v.colour,
          sku: v.sku,
          quantity: v.quantity,
          is_active: true
        }))

        const result = await quickUpdateProductInventory(product.id, payload)
        setSuccessMessage('Inventory successfully updated and synced with storefront!')

        if (onSuccess) {
          onSuccess(result.totalStock, result.isSoldOut)
        }

        setTimeout(() => {
          onClose()
        }, 1200)
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to update inventory. Please try again.')
      }
    })
  }

  const totalCalculatedStock = variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-inv-title"
      className="quick-inv-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPending) onClose()
      }}
    >
      <div
        className="quick-inv-card"
        style={{
          background: '#ffffff',
          borderRadius: '4px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '3px',
                overflow: 'hidden',
                background: '#fff',
                border: '1px solid var(--border)',
                flexShrink: 0
              }}
            >
              <SenoImage
                src={product.primary_image || '/placeholder.png'}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div>
              <h2
                id="quick-inv-title"
                style={{
                  margin: 0,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  letterSpacing: '-0.2px'
                }}
              >
                Quick Stock Management
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {product.name} · {money(Number(product.price))}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close dialog"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              cursor: 'pointer',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '2px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Variant List */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Total Stock Banner */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '3px',
              background: totalCalculatedStock === 0 ? '#fef2f2' : totalCalculatedStock <= 5 ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${totalCalculatedStock === 0 ? '#fecaca' : totalCalculatedStock <= 5 ? '#fde68a' : '#bbf7d0'}`,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12.5px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Package size={16} color={totalCalculatedStock === 0 ? '#b91c1c' : totalCalculatedStock <= 5 ? '#b45309' : '#15803d'} />
              <span style={{ fontWeight: 600, color: totalCalculatedStock === 0 ? '#991b1b' : totalCalculatedStock <= 5 ? '#92400e' : '#166534' }}>
                {totalCalculatedStock === 0 ? 'Out of Stock (Zero Units)' : totalCalculatedStock <= 5 ? `Low Stock Alert (${totalCalculatedStock} units remaining)` : `Total Available Stock: ${totalCalculatedStock} units`}
              </span>
            </div>
            {isDirty && (
              <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                Unsaved Changes
              </span>
            )}
          </div>

          {/* Error & Success Alerts */}
          {errorMessage && (
            <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '12px', borderRadius: '3px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontSize: '12px', borderRadius: '3px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={15} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Variants List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              ACTIVE COLOURS & SIZES ({variants.length})
            </span>

            {variants.map((v, idx) => {
              const qty = Number(v.quantity) || 0
              const isOut = qty === 0
              const isLow = qty > 0 && qty <= 5

              return (
                <div
                  key={v.id || `${v.size}-${v.colour}-${idx}`}
                  style={{
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: '3px',
                    background: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  {/* Variant identifiers */}
                  <div style={{ minWidth: '140px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                        {v.size}
                      </span>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                        {v.colour}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--muted)', background: 'var(--surface-subtle)', padding: '1px 6px', borderRadius: '2px', fontFamily: 'monospace' }}>
                        {v.sku || 'SKU Auto'}
                      </span>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          color: isOut ? '#b91c1c' : isLow ? '#b45309' : '#15803d'
                        }}
                      >
                        {isOut ? 'Out of stock' : isLow ? 'Low stock' : 'Available'}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Stepper Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid var(--border)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, qty - 1)}
                        disabled={qty <= 0 || isPending}
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'var(--surface-subtle)',
                          border: 'none',
                          borderRight: '1px solid var(--border)',
                          cursor: qty <= 0 ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--ink)'
                        }}
                      >
                        -
                      </button>

                      <input
                        type="number"
                        min="0"
                        value={v.quantity}
                        onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value, 10) || 0)}
                        disabled={isPending}
                        style={{
                          width: '56px',
                          height: '32px',
                          border: 'none',
                          textAlign: 'center',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: 'var(--ink)',
                          outline: 'none',
                          MozAppearance: 'textfield'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => handleQuantityChange(idx, qty + 1)}
                        disabled={isPending}
                        style={{
                          width: '32px',
                          height: '32px',
                          background: 'var(--surface-subtle)',
                          border: 'none',
                          borderLeft: '1px solid var(--border)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--ink)'
                        }}
                      >
                        +
                      </button>
                    </div>

                    {/* Remove variant button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      disabled={isPending}
                      title="Deactivate this variant combination"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: 'transparent',
                        border: '1px solid transparent',
                        borderRadius: '3px',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick Add Variant Accordion */}
          <div style={{ marginTop: '16px' }}>
            {!showAddVariant ? (
              <button
                type="button"
                onClick={() => setShowAddVariant(true)}
                disabled={isPending}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px dashed var(--border)',
                  background: 'transparent',
                  borderRadius: '3px',
                  fontSize: '12px',
                  color: 'var(--ink)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={14} />
                <span>Add Another Colour or Size Variant</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddNewVariant}
                style={{
                  padding: '14px',
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  background: 'var(--surface-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  New Variant Combination
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', marginBottom: '3px' }}>Size</label>
                    <input
                      placeholder="e.g. M, L, XL"
                      value={newSize}
                      onChange={e => setNewSize(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '12px', height: '32px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', marginBottom: '3px' }}>Colour</label>
                    <input
                      placeholder="e.g. Royal Blue"
                      value={newColour}
                      onChange={e => setNewColour(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '12px', height: '32px' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', marginBottom: '3px' }}>Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={newQuantity}
                      onChange={e => setNewQuantity(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '12px', height: '32px' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAddVariant(false)}
                    className="button button-outline"
                    style={{ fontSize: '11px', padding: '5px 10px', height: '30px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="button button-primary"
                    style={{ fontSize: '11px', padding: '5px 12px', height: '30px' }}
                  >
                    Add Combination
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="button button-outline"
            style={{ fontSize: '12px', padding: '8px 16px' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveInventory}
            disabled={isPending}
            className="button button-primary"
            style={{
              fontSize: '12px',
              padding: '8px 20px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Saving Inventory...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Save Stock Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
