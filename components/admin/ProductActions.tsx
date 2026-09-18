'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Edit, AlertTriangle, PackageX, PackageCheck, Trash2 } from 'lucide-react'
import { setProductSoldOutAction, deleteProductAction } from '@/lib/sellers'

interface ProductActionsProps {
  product: {
    id: string
    isSoldOut?: boolean
    is_sold_out?: boolean
    slug: string
  }
}

export function ProductActions({ product }: ProductActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const isSoldOut = product.isSoldOut || product.is_sold_out || false

  const handleToggleSoldOut = async () => {
    startTransition(async () => {
      try {
        await setProductSoldOutAction(product.id, !isSoldOut)
        setIsOpen(false)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  const handleDelete = async () => {
    startTransition(async () => {
      try {
        const res = await deleteProductAction(product.id)
        if (res.archived) {
          alert('This product cannot be permanently deleted because it is referenced by historical commerce records. It has been removed from the active storefront.')
        }
        setShowDeleteConfirm(false)
        setIsOpen(false)
      } catch (err: any) {
        alert(err.message)
      }
    })
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="button button-outline"
        style={{ padding: '6px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        aria-label="Product actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 40 }} 
            onClick={() => setIsOpen(false)}
          />
          <div style={{ 
            position: 'absolute', 
            right: 0, 
            top: 'calc(100% + 4px)', 
            background: 'var(--surface)', 
            border: '1px solid var(--border)', 
            borderRadius: '4px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '200px',
            zIndex: 50,
            overflow: 'hidden'
          }}>
            <Link 
              href={`/seller/products/${product.id}`}
              className="dropdown-item"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', fontSize: '13px', color: 'var(--ink)', textDecoration: 'none', borderBottom: '1px solid var(--border)' }}
            >
              <Edit size={14} /> Edit product
            </Link>

            <button 
              type="button"
              disabled={isPending}
              onClick={handleToggleSoldOut}
              className="dropdown-item"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', fontSize: '13px', color: 'var(--ink)', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
            >
              {isSoldOut ? <PackageCheck size={14} /> : <PackageX size={14} />} 
              {isSoldOut ? 'Mark in stock' : 'Mark out of stock'}
            </button>

            <button 
              type="button"
              disabled={isPending}
              onClick={() => setShowDeleteConfirm(true)}
              className="dropdown-item"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', fontSize: '13px', color: 'var(--error)', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <Trash2 size={14} /> Delete product
            </button>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '4px', maxWidth: '400px', width: '90%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', marginBottom: '16px' }}>
              <AlertTriangle size={20} />
              <h3 style={{ margin: 0, fontSize: '16px' }}>Delete product?</h3>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              This will remove this product from the active catalog. 
              If the product has historical orders, it will be archived instead to preserve commerce history.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="button button-outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isPending}
              >
                CANCEL
              </button>
              <button 
                type="button"
                className="button button-primary"
                style={{ background: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? 'PROCESSING...' : 'DELETE PRODUCT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
