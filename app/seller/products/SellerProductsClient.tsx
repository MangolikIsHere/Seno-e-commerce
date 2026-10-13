'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Filter,
  Package,
  Plus,
  Search,
  AlertCircle,
  ShieldCheck,
  Clock,
  Boxes,
  Edit,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { money } from '@/lib/catalog'
import { SenoImage } from '@/components/SenoImage'
import { ProductActions } from '@/components/admin/ProductActions'
import { QuickInventoryModal } from '@/components/seller/QuickInventoryModal'

export function SellerProductsClient({ products, categories }: { products: any[]; categories: any[] }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [stock, setStock] = useState('all')
  const [sort, setSort] = useState('newest')
  
  const [optimisticSoldOut, setOptimisticSoldOut] = useState<Record<string, boolean>>({})
  const [inventoryModalProduct, setInventoryModalProduct] = useState<any | null>(null)

  const filteredProducts = useMemo(() => products.filter(product => {
    const text = query.trim().toLowerCase()
    if (text && !product.name.toLowerCase().includes(text) && !product.slug.toLowerCase().includes(text) && !(product.product_variants || []).some((variant: any) => variant.sku?.toLowerCase().includes(text))) return false
    if (status !== 'all' && product.approval_status !== status) return false
    if (category !== 'all' && product.category_id !== category) return false
    if (stock === 'low' && !product.low_stock) return false
    if (stock === 'out' && product.total_stock !== 0) return false
    if (stock === 'available' && product.total_stock === 0) return false
    return true
  }).sort((a, b) => {
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    if (sort === 'price_low') return Number(a.price) - Number(b.price)
    if (sort === 'price_high') return Number(b.price) - Number(a.price)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }), [products, query, status, category, stock, sort])

  const hasActiveFilters = query.trim() !== '' || status !== 'all' || category !== 'all' || stock !== 'all' || sort !== 'newest'

  return (
    <section className="seller-products-container">
      {/* Top Breadcrumb & Header */}
      <div className="seller-products-header-strip">
        <div style={{ minWidth: 0, flex: '1 1 240px' }}>
          <span className="section-kicker">SELLER STUDIO / CATALOG</span>
          <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: 'clamp(22px, 4vw, 28px)' }}>
            My Products
          </h1>
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
            Manage pricing, stock quantities, approval status, and storefront visibility.
          </p>
        </div>

        <Link href="/seller/products/new" className="button button-primary" style={{ padding: '10px 18px', fontSize: '12px', gap: '6px' }}>
          <Plus size={15} />
          <span>Add New Product</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="admin-table-card seller-filter-card" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="seller-filter-grid">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--muted)', pointerEvents: 'none' }} />
            <input 
              aria-label="Search products" 
              value={query} 
              onChange={event => setQuery(event.target.value)} 
              placeholder="Search by name, slug, or SKU..." 
              className="input-field" 
              style={{ paddingLeft: '36px' }} 
            />
          </div>

          <select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="input-field">
            <option value="all">All Approval Statuses</option>
            <option value="approved">Approved & Live</option>
            <option value="submitted">Pending Admin Review</option>
            <option value="rejected">Needs Changes / Rejected</option>
            <option value="draft">Saved as Draft</option>
          </select>

          <select aria-label="Filter by category" value={category} onChange={event => setCategory(event.target.value)} className="input-field">
            <option value="all">All Categories</option>
            {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>

          <select aria-label="Filter by stock" value={stock} onChange={event => setStock(event.target.value)} className="input-field">
            <option value="all">All Stock Levels</option>
            <option value="available">In Stock (&gt; 5)</option>
            <option value="low">Low Stock (&le; 5 units)</option>
            <option value="out">Out of Stock (0 units)</option>
          </select>

          <select aria-label="Sort products" value={sort} onChange={event => setSort(event.target.value)} className="input-field">
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="price_low">Sort: Price Low to High</option>
            <option value="price_high">Sort: Price High to Low</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)' }}>
            <span>Filtered: Showing {filteredProducts.length} of {products.length} products</span>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setStatus('all')
                setCategory('all')
                setStock('all')
                setSort('newest')
              }}
              style={{ color: 'var(--ink)', textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', fontSize: '11px' }}
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="admin-table-card" style={{ padding: '64px 24px', textAlign: 'center' }}>
          <Filter size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} strokeWidth={1.3} />
          <h2 style={{ fontSize: '17px', fontWeight: 600, margin: '0 0 6px' }}>No products match your criteria</h2>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px', maxWidth: '380px', marginLeft: 'auto', marginRight: 'auto' }}>
            Try resetting your search query or filters to view all catalog items.
          </p>
          <Link href="/seller/products/new" className="button button-outline" style={{ padding: '10px 20px', fontSize: '11px' }}>
            <Plus size={14} /> Add New Product
          </Link>
        </div>
      ) : (
        <>
          {/* MOBILE CARD VIEW (< 768px) - Easy touch & zero horizontal overflow */}
          <div className="seller-mobile-product-cards-list">
            {filteredProducts.map(product => {
              const isOverriddenSoldOut = optimisticSoldOut[product.id] ?? product.is_sold_out
              const isEffectiveOutOfStock = isOverriddenSoldOut || product.total_stock === 0
              const isRejected = product.approval_status === 'rejected'
              const isApproved = product.approval_status === 'approved'
              const isSubmitted = product.approval_status === 'submitted'

              return (
                <div key={product.id} className="seller-product-card-mobile">
                  <div className="seller-card-top-row">
                    <div className="seller-card-thumb">
                      <SenoImage src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <div className="seller-card-main-meta">
                      <div className="seller-card-cat-badge">
                        {product.categories?.name || 'Uncategorized'}
                      </div>
                      <h3 className="seller-card-title">{product.name}</h3>
                      <div className="seller-card-price-row">
                        <strong className="seller-card-price">{money(Number(product.price))}</strong>
                        <span className={`seller-card-stock-pill ${isEffectiveOutOfStock ? 'pill-out' : product.low_stock ? 'pill-low' : 'pill-in'}`}>
                          {isEffectiveOutOfStock ? 'Out of stock' : product.low_stock ? `Low stock (${product.total_stock})` : `${product.total_stock} in stock`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Strip */}
                  <div className="seller-card-status-bar">
                    <span className="seller-card-status-label">Review Status:</span>
                    <span className={`status-pill ${isApproved ? 'approved' : isRejected ? 'rejected' : 'pending'}`}>
                      {isSubmitted ? 'Pending Review' : isRejected ? 'Changes Requested' : product.approval_status}
                    </span>
                  </div>

                  {/* Rejection / Action Note Callout */}
                  {isRejected && product.rejection_reason && (
                    <div className="seller-card-rejection-callout">
                      <div className="callout-header">
                        <AlertCircle size={14} color="#e11d48" />
                        <strong>Admin Feedback</strong>
                      </div>
                      <p className="callout-text">{product.rejection_reason}</p>
                    </div>
                  )}

                  {/* Mobile Quick Action Buttons */}
                  <div className="seller-card-actions-row">
                    <button
                      type="button"
                      onClick={() => setInventoryModalProduct(product)}
                      className="button button-outline seller-card-action-btn"
                      style={{ gap: '5px' }}
                    >
                      <Boxes size={13} />
                      <span>Stock ({product.total_stock})</span>
                    </button>

                    <Link
                      href={`/seller/products/${product.id}/edit`}
                      className="button button-outline seller-card-action-btn"
                    >
                      <Edit size={13} />
                      <span>{isRejected ? 'Fix' : 'Edit'}</span>
                    </Link>

                    <ProductActions
                      product={{
                        ...product,
                        is_sold_out: isOverriddenSoldOut
                      }}
                      onOptimisticUpdate={(id, val) => setOptimisticSoldOut(prev => ({ ...prev, [id]: val }))}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP TABLE VIEW (>= 768px) */}
          <div className="admin-table-card seller-desktop-table-wrapper">
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', fontSize: '12px' }}>
              <span>Showing {filteredProducts.length} products</span>
              <span style={{ fontSize: '11px' }}>Authoritative database state</span>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '260px' }}>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Quantity</th>
                  <th>Approval Status</th>
                  <th>Last Modified</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => {
                  const isOverriddenSoldOut = optimisticSoldOut[product.id] ?? product.is_sold_out
                  const isEffectiveOutOfStock = isOverriddenSoldOut || product.total_stock === 0
                  const isRejected = product.approval_status === 'rejected'

                  return (
                    <tr key={product.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '46px', height: '60px', overflow: 'hidden', background: 'var(--surface-subtle)', flexShrink: 0, borderRadius: '2px', border: '1px solid var(--border)' }}>
                            <SenoImage src={product.primary_image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                          <div>
                            <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>{product.name}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace', marginTop: '2px' }}>
                              /{product.slug}
                            </div>
                            {isRejected && product.rejection_reason && (
                              <div style={{ marginTop: '4px', fontSize: '11px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <AlertCircle size={12} />
                                <span>{product.rejection_reason}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', background: 'var(--surface-subtle)', padding: '2px 8px', borderRadius: '2px', border: '1px solid var(--border)' }}>
                          {product.categories?.name || 'Uncategorized'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '13px' }}>{money(Number(product.price))}</strong>
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontWeight: 600,
                            color: isEffectiveOutOfStock ? '#9f1239' : product.low_stock ? '#9a3412' : '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {isOverriddenSoldOut ? (
                            <>
                              OUT OF STOCK
                              <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>
                                (Override)
                              </span>
                            </>
                          ) : (
                            <>
                              {product.total_stock}
                              <span style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 400 }}>
                                {product.total_stock === 0 ? '(Out of stock)' : product.low_stock ? '(Low stock)' : 'units'}
                              </span>
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${product.approval_status === 'approved' ? 'approved' : product.approval_status === 'rejected' ? 'rejected' : 'pending'}`}>
                          {product.approval_status === 'submitted' ? 'Pending Review' : product.approval_status === 'rejected' ? 'Needs Changes' : product.approval_status}
                        </span>
                      </td>
                      <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '12px' }}>
                        {new Date(product.updated_at || product.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setInventoryModalProduct(product)}
                            className="button button-outline"
                            style={{ padding: '6px 10px', fontSize: '11px', minHeight: '32px', gap: '4px' }}
                            title="Manage Variants and Stock"
                          >
                            <Boxes size={12} />
                            <span>Stock</span>
                          </button>

                          <Link
                            href={`/seller/products/${product.id}/edit`}
                            className="button button-outline"
                            style={{ padding: '6px 10px', fontSize: '11px', minHeight: '32px' }}
                            title="Edit Product"
                          >
                            <Edit size={12} />
                            <span>Edit</span>
                          </Link>
                          <ProductActions 
                            product={{
                              ...product,
                              is_sold_out: isOverriddenSoldOut
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
        </>
      )}

      {/* Quick Inventory Management Modal */}
      {inventoryModalProduct && (
        <QuickInventoryModal
          product={inventoryModalProduct}
          onClose={() => setInventoryModalProduct(null)}
          onSuccess={(totalStock, isSoldOut) => {
            setOptimisticSoldOut(prev => ({ ...prev, [inventoryModalProduct.id]: isSoldOut }))
          }}
        />
      )}
    </section>
  )
}
