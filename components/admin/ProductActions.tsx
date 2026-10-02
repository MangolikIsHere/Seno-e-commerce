'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { MoreHorizontal, Edit, AlertTriangle, PackageX, PackageCheck, Trash2 } from 'lucide-react'
import { setProductSoldOutAction, deleteProductAction } from '@/lib/sellers'

interface ProductActionsProps {
  product: {
    id: string
    isSoldOut?: boolean
    is_sold_out?: boolean
    slug: string
  }
  onOptimisticUpdate?: (productId: string, isSoldOut: boolean) => void
}

export function ProductActions({ product, onOptimisticUpdate }: ProductActionsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const isSeller = pathname?.startsWith('/seller')
  const editHref = isSeller ? `/seller/products/${product.id}/edit` : `/admin/products/${product.id}/edit`

  const [isOpen, setIsOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const isSoldOut = product.isSoldOut || product.is_sold_out || false

  const handleToggleSoldOut = async () => {
    // Fire optimistic update immediately
    if (onOptimisticUpdate) {
      onOptimisticUpdate(product.id, !isSoldOut)
    }
    
    startTransition(async () => {
      try {
        await setProductSoldOutAction(product.id, !isSoldOut)
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        // Revert optimistic update on failure
        if (onOptimisticUpdate) {
          onOptimisticUpdate(product.id, isSoldOut)
        }
        alert(err.message)
      }
    })
  }

  const handleDelete = async () => {
    setDeleteError(null)
    startTransition(async () => {
      try {
        const res = await deleteProductAction(product.id)
        if (res.archived) {
          alert('This product cannot be permanently deleted because it is referenced by historical commerce records. It has been archived and removed from the active storefront.')
        }
        setShowDeleteConfirm(false)
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        setDeleteError(err.message || 'Failed to delete product.')
      }
    })
  }

  const openDeleteModal = () => {
    setDeleteError(null)
    setShowDeleteConfirm(true)
  }

  const closeDeleteModal = () => {
    if (!isPending) {
      setDeleteError(null)
      setShowDeleteConfirm(false)
    }
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
              href={editHref}
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
              onClick={openDeleteModal}
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

            {deleteError && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                color: '#991b1b',
                fontSize: '13px',
                lineHeight: 1.4,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{deleteError}</span>
              </div>
            )}

            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', lineHeight: 1.5 }}>
              This will remove this product from the active catalog. 
              If the product has historical orders, it will be archived instead to preserve commerce history.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                className="button button-outline"
                onClick={closeDeleteModal}
                disabled={isPending}
              >
                CANCEL
              </button>
              <button
                type="button"
                className="button button-primary"
                style={{ background: '#e53e3e', borderColor: '#e53e3e', color: 'white' }}
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
