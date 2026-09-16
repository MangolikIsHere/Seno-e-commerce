'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { 
  Package, 
  Plus, 
  Search, 
  SlidersHorizontal, 
  ExternalLink, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  EyeOff, 
  Eye, 
  ChevronRight,
  Filter
} from 'lucide-react'
import { money } from '@/lib/catalog'
import { toggleProductActive } from '@/lib/adminCatalog'
import { ProductApprovalForm } from '@/app/admin/products/ProductApprovalForm'
import { SenoImage } from '@/components/SenoImage'

interface ProductListClientProps {
  initialProducts: any[]
  categories: any[]
}

export function ProductListClient({ initialProducts, categories }: ProductListClientProps) {
  const [products, setProducts] = useState(initialProducts)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Filter products locally for instant responsive UI
  const filteredProducts = products.filter(product => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = product.name?.toLowerCase().includes(q)
      const matchSlug = product.slug?.toLowerCase().includes(q)
      const matchCat = product.categories?.name?.toLowerCase().includes(q)
      const matchSku = product.variants?.some((v: any) => v.sku?.toLowerCase().includes(q))
      if (!matchName && !matchSlug && !matchCat && !matchSku) return false
    }

    // Category match
    if (selectedCategory !== 'all') {
      if (product.category_id !== selectedCategory) return false
    }

    // Status match
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active' && !product.is_active) return false
      if (selectedStatus === 'inactive' && product.is_active) return false
      if (selectedStatus === 'sold_out' && !product.isSoldOut) return false
      if (selectedStatus === 'low_stock' && !product.isLowStock) return false
      if (selectedStatus === 'approved' && product.approval_status !== 'approved') return false
      if (selectedStatus === 'submitted' && product.approval_status !== 'submitted') return false
    }

    return true
  })

  // KPI Calculations
  const totalCount = products.length
  const activeCount = products.filter(p => p.is_active).length
  const lowStockCount = products.filter(p => p.isLowStock || p.isSoldOut).length
  const pendingCount = products.filter(p => p.approval_status === 'submitted').length

  const handleToggleActive = (productId: string, currentActive: boolean) => {
    startTransition(async () => {
      try {
        const nextState = !currentActive
        // Optimistic UI update
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_active: nextState } : p))
        await toggleProductActive(productId, nextState)
        setStatusMessage(`Product ${nextState ? 'activated and live on storefront' : 'deactivated and hidden from public'}`)
        setTimeout(() => setStatusMessage(null), 3000)
      } catch (err: any) {
        // Revert on error
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_active: currentActive } : p))
        alert(`Failed to update product state: ${err.message}`)
      }
    })
  }

  return (
    <div className="admin-catalog-container">
      {/* Top Header Row */}
      <div className="admin-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="admin-page-title">Catalog & Product Management</h1>
          <p className="admin-page-subtitle">
            Authoritative SENO luxury catalog control plane: create pieces, manage stock, and synchronize storefront
          </p>
        </div>
        <Link 
          href="/admin/products/new" 
          className="dark-btn"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 24px', 
            fontSize: '11px', 
            letterSpacing: '1.5px',
            textDecoration: 'none',
            borderRadius: '2px',
            fontWeight: 600
          }}
        >
          <Plus size={15} />
          <span>ADD NEW PRODUCT</span>
        </Link>
      </div>

      {statusMessage && (
        <div style={{ 
          padding: '12px 18px', 
          background: 'var(--soft)', 
          border: '1px solid var(--border)', 
          fontSize: '12px', 
          color: 'var(--ink)', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CheckCircle2 size={15} color="var(--ink)" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="kpi-grid" style={{ marginBottom: '28px' }}>
        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Total Pieces</span>
            <Package size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{totalCount}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Active Online</span>
            <CheckCircle2 size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{activeCount}</div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Stock Alerts</span>
            <AlertTriangle size={16} color={lowStockCount > 0 ? '#b45309' : 'var(--muted)'} />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: lowStockCount > 0 ? '#b45309' : 'var(--ink)' }}>
            {lowStockCount}
          </div>
        </div>

        <div className="kpi-card" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', fontWeight: 600 }}>Awaiting Review</span>
            <Filter size={16} color="var(--muted)" />
          </div>
          <div style={{ fontSize: '28px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>{pendingCount}</div>
        </div>
      </div>

      {/* Catalog Search & Filters Bar */}
      <div className="admin-table-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search by name, slug, or SKU..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                fontSize: '13px',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ink)',
                outline: 'none'
              }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ink)',
                outline: 'none'
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                color: 'var(--ink)',
                outline: 'none'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Online</option>
              <option value="inactive">Inactive / Hidden</option>
              <option value="low_stock">Low Stock (≤5)</option>
              <option value="sold_out">Sold Out (0)</option>
              <option value="approved">Approved</option>
              <option value="submitted">Submitted Review</option>
            </select>
          </div>

          {/* Clear Filters Button if any active */}
          {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('all')
                setSelectedStatus('all')
              }}
              style={{
                padding: '10px 14px',
                fontSize: '12px',
                color: 'var(--muted)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Data Table */}
      <div className="admin-table-card">
        <div className="admin-table-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>
              Catalog Items ({filteredProducts.length})
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Real-time synchronization with live SENO storefront database
            </div>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <Package size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--ink)', fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>No pieces match your filter</p>
            <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>Try clearing the search query or category filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: '320px' }}>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Publishing</th>
                  <th>Curation</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  return (
                    <tr key={product.id}>
                      {/* Product Thumbnail & Identity */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{
                            width: '46px',
                            height: '58px',
                            position: 'relative',
                            background: 'var(--surface-subtle)',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            flexShrink: 0,
                            border: '1px solid var(--border)'
                          }}>
                            <SenoImage
                              src={product.primaryImage}
                              alt={product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '13px' }}>
                              {product.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                              /{product.slug}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                              <Link
                                href={`/products/${product.slug}`}
                                target="_blank"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '11px',
                                  color: 'var(--muted)',
                                  textDecoration: 'none'
                                }}
                              >
                                <span>Preview</span>
                                <ExternalLink size={10} />
                              </Link>
                              <span style={{ color: 'var(--border)' }}>•</span>
                              <Link
                                href={`/admin/products/${product.id}/edit`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '11px',
                                  color: 'var(--ink)',
                                  fontWeight: 600,
                                  textDecoration: 'none'
                                }}
                              >
                                <span>Edit</span>
                                <ChevronRight size={11} />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>
                          {product.categories?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Price & Compare-At */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>
                          {money(Number(product.price))}
                        </div>
                        {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'line-through' }}>
                            {money(Number(product.compare_at_price))}
                          </div>
                        )}
                      </td>

                      {/* Inventory Stock */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: product.isSoldOut 
                              ? '#ef4444' 
                              : product.isLowStock 
                              ? '#f59e0b' 
                              : '#10b981'
                          }} />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>
                            {product.totalStock} in stock
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                          {product.variants?.length || 0} variant{(product.variants?.length || 0) === 1 ? '' : 's'}
                        </div>
                      </td>

                      {/* Active Status & Toggle */}
                      <td>
                        <button
                          onClick={() => handleToggleActive(product.id, product.is_active)}
                          disabled={isPending}
                          title={product.is_active ? 'Click to deactivate' : 'Click to activate'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            borderRadius: '12px',
                            border: 'none',
                            cursor: 'pointer',
                            background: product.is_active ? '#ecfdf5' : '#f3f4f6',
                            color: product.is_active ? '#065f46' : '#6b7280'
                          }}
                        >
                          {product.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{product.is_active ? 'Active' : 'Draft / Off'}</span>
                        </button>
                      </td>

                      {/* Curation Decision */}
                      <td>
                        <ProductApprovalForm 
                          productId={product.id} 
                          currentStatus={product.approval_status} 
                          currentReason={product.rejection_reason} 
                        />
                      </td>

                      {/* Row Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="outline-btn"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            textDecoration: 'none'
                          }}
                        >
                          <Edit3 size={12} />
                          <span>Edit</span>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
