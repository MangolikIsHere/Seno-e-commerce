'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Package,
  Plus,
  Search,
  ExternalLink,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  Eye,
  ChevronRight,
  Filter,
  X,
  Star
} from 'lucide-react'
import { money } from '@/lib/catalog'
import { toggleProductActive, toggleProductBestseller } from '@/lib/adminCatalog'
import { ProductApprovalForm } from '@/app/admin/products/ProductApprovalForm'
import { SenoImage } from '@/components/SenoImage'
import { ProductActions } from '@/components/admin/ProductActions'

interface ProductListClientProps {
  initialProducts: any[]
  categories: any[]
}

export function ProductListClient({ initialProducts, categories }: ProductListClientProps) {
  const searchParams = useSearchParams()
  const initialStatus = searchParams?.get('status') || 'all'

  const [products, setProducts] = useState(initialProducts)
  const [isPending, startTransition] = useTransition()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState(initialStatus)

  const [optimisticSoldOut, setOptimisticSoldOut] = useState<Record<string, boolean>>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Filter products locally
  const filteredProducts = products.filter(product => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchName = product.name?.toLowerCase().includes(q)
      const matchSlug = product.slug?.toLowerCase().includes(q)
      const matchCat = product.categories?.name?.toLowerCase().includes(q)
      const matchSku = product.variants?.some((v: any) => v.sku?.toLowerCase().includes(q))
      if (!matchName && !matchSlug && !matchCat && !matchSku) return false
    }

    if (selectedCategory !== 'all') {
      if (product.category_id !== selectedCategory) return false
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active' && !product.is_active) return false
      if (selectedStatus === 'inactive' && product.is_active) return false
      if (selectedStatus === 'sold_out' && !product.isSoldOut) return false
      if (selectedStatus === 'low_stock' && !product.isLowStock) return false
      if (selectedStatus === 'approved' && product.approval_status !== 'approved') return false
      if (selectedStatus === 'submitted' && product.approval_status !== 'submitted') return false
      if (selectedStatus === 'bestseller' && !product.is_bestseller) return false
    }

    return true
  })

  // KPI Calculations
  const totalCount = products.length
  const activeCount = products.filter(p => p.is_active).length
  const lowStockCount = products.filter(p => p.isLowStock || p.isSoldOut).length
  const pendingCount = products.filter(p => p.approval_status === 'submitted').length
  const bestsellerCount = products.filter(p => p.is_bestseller).length

  const handleToggleActive = (productId: string, currentActive: boolean) => {
    startTransition(async () => {
      try {
        const nextState = !currentActive
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_active: nextState } : p))
        await toggleProductActive(productId, nextState)
        setStatusMessage(`Product ${nextState ? 'activated and published on storefront' : 'deactivated and hidden from public'}`)
        setTimeout(() => setStatusMessage(null), 3000)
      } catch (err: any) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_active: currentActive } : p))
        alert(`Failed to update product state: ${err.message}`)
      }
    })
  }

  const handleToggleBestseller = (productId: string, currentBestseller: boolean) => {
    startTransition(async () => {
      try {
        const nextState = !currentBestseller
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_bestseller: nextState } : p))
        await toggleProductBestseller(productId, nextState)
        setStatusMessage(`Product ${nextState ? 'marked as Bestseller (live on homepage & bestsellers collection)' : 'removed from Bestsellers'}`)
        setTimeout(() => setStatusMessage(null), 3500)
      } catch (err: any) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_bestseller: currentBestseller } : p))
        alert(`Failed to update bestseller state: ${err.message}`)
      }
    })
  }

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'all' || selectedStatus !== 'all'

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedStatus('all')
  }

  return (
    <div className="admin-page-container">
      {/* Top Header Row */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">CATALOG GOVERNANCE</span>
          <h1 className="admin-page-title">Curated Products</h1>
          <p className="admin-page-subtitle">
            Manage pieces, pricing, inventory stock thresholds, and storefront publishing status.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="button button-primary"
          style={{ fontSize: '12px', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={15} />
          <span>Add New Product</span>
        </Link>
      </div>

      {statusMessage && (
        <div style={{
          padding: '12px 18px',
          background: 'var(--surface-subtle)',
          border: '1px solid var(--border)',
          fontSize: '13px',
          color: 'var(--ink)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderRadius: '2px'
        }}>
          <CheckCircle2 size={16} color="var(--ink)" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* KPI Overview Grid */}
      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => setSelectedStatus('all')} style={{ cursor: 'pointer', border: selectedStatus === 'all' ? '1px solid var(--ink)' : undefined }}>
          <div>
            <div className="kpi-label">
              <span>Total Pieces</span>
              <Package size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{totalCount}</div>
          </div>
          <div className="kpi-meta">Catalog items in database</div>
        </div>

        <div className="kpi-card" onClick={() => setSelectedStatus('active')} style={{ cursor: 'pointer', border: selectedStatus === 'active' ? '1px solid var(--ink)' : undefined }}>
          <div>
            <div className="kpi-label">
              <span>Active Online</span>
              <CheckCircle2 size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{activeCount}</div>
          </div>
          <div className="kpi-meta">Visible to customers</div>
        </div>

        <div className="kpi-card" onClick={() => setSelectedStatus('bestseller')} style={{ cursor: 'pointer', border: selectedStatus === 'bestseller' ? '1px solid #D7AE70' : undefined }}>
          <div>
            <div className="kpi-label">
              <span>Bestsellers</span>
              <Star size={15} color="#D7AE70" fill={bestsellerCount > 0 ? '#D7AE70' : 'none'} />
            </div>
            <div className="kpi-value" style={{ color: bestsellerCount > 0 ? '#B4782A' : 'inherit' }}>
              {bestsellerCount}
            </div>
          </div>
          <div className="kpi-meta">Featured in bestsellers row</div>
        </div>

        <div className="kpi-card" onClick={() => setSelectedStatus('submitted')} style={{ cursor: 'pointer', border: selectedStatus === 'submitted' ? '1px solid #2563eb' : undefined, background: pendingCount > 0 ? '#eff6ff' : undefined }}>
          <div>
            <div className="kpi-label">
              <span style={{ color: pendingCount > 0 ? '#1d4ed8' : 'inherit', fontWeight: pendingCount > 0 ? 600 : 'inherit' }}>Awaiting Review</span>
              <Filter size={15} color={pendingCount > 0 ? '#1d4ed8' : 'var(--muted)'} />
            </div>
            <div className="kpi-value" style={{ color: pendingCount > 0 ? '#1d4ed8' : 'inherit' }}>
              {pendingCount}
            </div>
          </div>
          <div className="kpi-meta">{pendingCount > 0 ? 'Click to inspect pending seller products' : 'All seller submissions reviewed'}</div>
        </div>
      </div>

      {/* Search & Filters Card */}
      <div className="admin-table-card" style={{ padding: '18px 20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
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
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--ink)'
              }}
            />
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--ink)'
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--ink)'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Online ({activeCount})</option>
              <option value="inactive">Inactive / Hidden</option>
              <option value="bestseller">⭐ Bestsellers ({bestsellerCount})</option>
              <option value="submitted">📝 Awaiting Review ({pendingCount})</option>
              <option value="approved">Approved</option>
              <option value="low_stock">Low Stock (≤5)</option>
              <option value="sold_out">Sold Out (0)</option>
            </select>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: '12px',
                color: '#b91c1c',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Catalog Items Section */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">
              Catalog Items ({filteredProducts.length})
            </h2>
            <p className="admin-card-subheading">
              Synchronized with live storefront catalog
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="admin-empty-card-inner">
            <Package size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
            <p style={{ margin: '0 0 6px', fontWeight: 500 }}>No products found</p>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>Try resetting the search or category filters.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="admin-desktop-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '320px' }}>Product</th>
                    <th>Seller / Category</th>
                    <th>Price</th>
                    <th>Inventory</th>
                    <th>Live Status</th>
                    <th>Bestseller</th>
                    <th>Curation</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => {
                    const isSoldOut = ((optimisticSoldOut[product.id] ?? product.isSoldOut) || (optimisticSoldOut[product.id] ?? product.is_sold_out))
                    return (
                      <tr key={product.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '48px',
                              height: '60px',
                              position: 'relative',
                              background: '#f5f5f4',
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
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500 }}>{product.categories?.name || 'Uncategorized'}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{product.sellers?.store_name || 'SENO Official'}</div>
                          <div style={{ fontSize: '11px', color: '#8a7356', marginTop: '3px' }}>
                            🚚 {product.expected_delivery_days ?? 7}d delivery
                          </div>
                        </td>

                        <td>
                          <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                            {money(Number(product.price))}
                          </div>
                          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
                            <div style={{ fontSize: '11px', color: 'var(--muted)', textDecoration: 'line-through' }}>
                              {money(Number(product.compare_at_price))}
                            </div>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className={`stock-dot ${isSoldOut ? 'empty' : product.isLowStock ? 'low' : 'healthy'}`} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: isSoldOut ? '#B4232D' : product.isLowStock ? '#946200' : 'inherit' }}>
                              {isSoldOut ? 'OUT OF STOCK' : `${product.totalStock} units`}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            {product.variants?.length || 0} variant{(product.variants?.length || 0) === 1 ? '' : 's'}
                          </div>
                        </td>

                        <td>
                          <button
                            onClick={() => handleToggleActive(product.id, product.is_active)}
                            disabled={isPending}
                            title={product.is_active ? 'Click to deactivate' : 'Click to activate'}
                            className={`status-pill ${product.is_active ? 'active' : 'draft'}`}
                            style={{
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '11px'
                            }}
                          >
                            {product.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                            <span>{product.is_active ? 'Active' : 'Hidden'}</span>
                          </button>
                        </td>

                        <td>
                          <button
                            type="button"
                            onClick={() => handleToggleBestseller(product.id, !!product.is_bestseller)}
                            disabled={isPending}
                            title={product.is_bestseller ? 'Click to remove from Bestsellers' : 'Click to tag as Bestseller'}
                            style={{
                              border: product.is_bestseller ? '1px solid #D7AE70' : '1px solid var(--border)',
                              background: product.is_bestseller ? '#fffbf2' : 'transparent',
                              color: product.is_bestseller ? '#92400e' : 'var(--muted)',
                              cursor: 'pointer',
                              padding: '5px 10px',
                              borderRadius: '14px',
                              fontSize: '11px',
                              fontWeight: product.is_bestseller ? 600 : 400,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            <Star size={12} fill={product.is_bestseller ? '#D7AE70' : 'none'} color={product.is_bestseller ? '#b45309' : 'currentColor'} />
                            <span>{product.is_bestseller ? 'Bestseller' : 'Standard'}</span>
                          </button>
                        </td>

                        <td>
                          <ProductApprovalForm
                            productId={product.id}
                            productName={product.name}
                            currentStatus={product.approval_status}
                            currentReason={product.rejection_reason}
                          />
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <Link
                              href={`/admin/products/${product.id}/edit`}
                              className="button button-outline"
                              style={{ fontSize: '11px', padding: '5px 12px' }}
                            >
                              Edit
                            </Link>
                            <ProductActions
                              product={{
                                ...product,
                                isSoldOut: isSoldOut,
                                is_sold_out: isSoldOut
                              }}
                              onOptimisticUpdate={(id, val) => setOptimisticSoldOut(prev => ({ ...prev, [id]: val }))}
                            />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Product Card List (No forced horizontal scroll) */}
            <div className="admin-mobile-card-list">
              {filteredProducts.map(product => {
                const isSoldOut = ((optimisticSoldOut[product.id] ?? product.isSoldOut) || (optimisticSoldOut[product.id] ?? product.is_sold_out))
                return (
                  <div key={product.id} className="admin-product-card-mobile">
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '70px',
                        height: '88px',
                        position: 'relative',
                        background: '#f5f5f4',
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                            {product.categories?.name || 'Collection'}
                          </span>
                          <span className={`status-pill ${product.is_active ? 'approved' : 'draft'}`} style={{ fontSize: '9px' }}>
                            {product.is_active ? 'LIVE' : 'DRAFT'}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: '2px 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {product.name}
                        </h3>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>
                          {money(Number(product.price))}
                        </div>
                        <div style={{ fontSize: '11px', color: isSoldOut ? '#ef4444' : 'var(--muted)', marginTop: '4px' }}>
                          {isSoldOut ? 'Out of Stock' : `${product.totalStock} in stock`} · {product.variants?.length || 0} variant(s) · 🚚 {product.expected_delivery_days ?? 7}d
                        </div>
                        <div style={{ marginTop: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleBestseller(product.id, !!product.is_bestseller)}
                            disabled={isPending}
                            style={{
                              border: product.is_bestseller ? '1px solid #D7AE70' : '1px solid var(--border)',
                              background: product.is_bestseller ? '#fffbf2' : '#fafaf9',
                              color: product.is_bestseller ? '#92400e' : 'var(--muted)',
                              cursor: 'pointer',
                              padding: '3px 8px',
                              borderRadius: '10px',
                              fontSize: '10.5px',
                              fontWeight: product.is_bestseller ? 600 : 400,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Star size={11} fill={product.is_bestseller ? '#D7AE70' : 'none'} color={product.is_bestseller ? '#b45309' : 'currentColor'} />
                            <span>{product.is_bestseller ? 'Bestseller' : 'Tag Bestseller'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="button button-primary"
                        style={{ fontSize: '12px', padding: '9px 0', textAlign: 'center', width: '100%' }}
                      >
                        Edit Piece
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(product.id, product.is_active)}
                        className="button button-outline"
                        style={{ fontSize: '12px', padding: '9px 0', textAlign: 'center', width: '100%' }}
                      >
                        {product.is_active ? 'Hide Online' : 'Publish Live'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
