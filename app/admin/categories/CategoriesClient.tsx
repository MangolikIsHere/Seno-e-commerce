'use client'

import React, { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Eye, 
  EyeOff, 
  Upload, 
  ImageIcon, 
  Layers, 
  Check, 
  X, 
  ExternalLink, 
  AlertTriangle, 
  HelpCircle,
  Loader2,
  Sparkles
} from 'lucide-react'
import { 
  CategoryRecord, 
  saveCategory, 
  toggleCategoryActive, 
  reorderCategories, 
  deleteCategorySafely
} from '@/lib/categories'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

interface CategoriesClientProps {
  initialCategories: CategoryRecord[]
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<CategoryRecord[]>(initialCategories)
  const [editingCategory, setEditingCategory] = useState<Partial<CategoryRecord> | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<CategoryRecord | null>(null)
  const [reassignTargetId, setReassignTargetId] = useState<string>('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [bannerPreview, setBannerPreview] = useState<string>('')
  const [showSeoFields, setShowSeoFields] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Derived KPI metrics
  const activeCount = categories.filter(c => c.is_active).length
  const inactiveCount = categories.length - activeCount
  const totalProducts = categories.reduce((sum, c) => sum + (c.products?.[0]?.count ?? 0), 0)

  // Handle opening editor for Create
  const handleAddNew = () => {
    const nextOrder = categories.length > 0 ? Math.max(...categories.map(c => c.display_order)) + 1 : 1
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      display_order: nextOrder,
      is_active: true,
      meta_title: '',
      meta_description: ''
    })
    setBannerPreview('')
    setError(null)
    setShowSeoFields(false)
  }

  // Handle opening editor for Edit
  const handleEdit = (cat: CategoryRecord) => {
    setEditingCategory({ ...cat })
    setBannerPreview(cat.image_url || '')
    setError(null)
    setShowSeoFields(!!(cat.meta_title || cat.meta_description))
  }

  // Live Auto-Slug helper
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setEditingCategory(prev => {
      if (!prev) return null
      // Auto-update slug if it was empty or matches previous slugified name
      const wasAutoSlug = !prev.slug || prev.slug === slugify(prev.name || '')
      return {
        ...prev,
        name: val,
        slug: wasAutoSlug ? slugify(val) : prev.slug
      }
    })
  }

  // Handle Image Upload to /api/admin/upload-image
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setBannerPreview(data.url)
      setEditingCategory(prev => prev ? { ...prev, image_url: data.url } : null)
    } catch (err: any) {
      setError(err?.message || 'Error uploading image')
    } finally {
      setUploadingImage(false)
    }
  }

  // Save Category submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCategory?.name?.trim()) {
      setError('Category name is required.')
      return
    }

    setError(null)
    startTransition(async () => {
      try {
        await saveCategory({
          id: editingCategory.id,
          name: editingCategory.name!.trim(),
          slug: editingCategory.slug?.trim() || slugify(editingCategory.name!),
          description: editingCategory.description || undefined,
          image_url: bannerPreview || editingCategory.image_url || undefined,
          display_order: Number(editingCategory.display_order || 0),
          is_active: editingCategory.is_active !== false,
          meta_title: editingCategory.meta_title || undefined,
          meta_description: editingCategory.meta_description || undefined
        })

        setEditingCategory(null)
        window.location.reload()
      } catch (err: any) {
        setError(err?.message || 'Failed to save category.')
      }
    })
  }

  // Toggle active/inactive
  const handleToggleActive = (cat: CategoryRecord) => {
    startTransition(async () => {
      try {
        await toggleCategoryActive(cat.id, !cat.is_active)
        setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: !c.is_active } : c))
      } catch (err: any) {
        alert('Unable to toggle status: ' + err.message)
      }
    })
  }

  // Move priority up
  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...categories]
    const temp = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = temp

    setCategories(newItems)
    startTransition(async () => {
      try {
        await reorderCategories(newItems.map(c => c.id))
      } catch (err: any) {
        alert('Reordering failed: ' + err.message)
      }
    })
  }

  // Move priority down
  const handleMoveDown = (index: number) => {
    if (index === categories.length - 1) return
    const newItems = [...categories]
    const temp = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = temp

    setCategories(newItems)
    startTransition(async () => {
      try {
        await reorderCategories(newItems.map(c => c.id))
      } catch (err: any) {
        alert('Reordering failed: ' + err.message)
      }
    })
  }

  // Safe delete execution
  const executeSafeDelete = (options?: { reassignToCategoryId?: string }) => {
    if (!deletingCategory) return

    startTransition(async () => {
      try {
        await deleteCategorySafely(deletingCategory.id, options)
        setDeletingCategory(null)
        setReassignTargetId('')
        window.location.reload()
      } catch (err: any) {
        alert('Delete failed: ' + err.message)
      }
    })
  }

  return (
    <div className="admin-page-container">
      {/* Top Bar */}
      <div className="admin-top-bar">
        <div>
          <span className="admin-kicker">TAXONOMY CONTROL</span>
          <h1 className="admin-page-title">Departments &amp; Categories</h1>
          <p className="admin-page-subtitle">
            Manage storefront taxonomy, luxury editorial banners, navigation hierarchy, and SEO descriptions.
          </p>
        </div>
        {!editingCategory && (
          <button
            type="button"
            className="button button-primary"
            style={{ fontSize: '12px', padding: '10px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleAddNew}
          >
            <Plus size={15} />
            <span>Add Category</span>
          </button>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>All Categories</span>
              <Layers size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{categories.length}</div>
          </div>
          <div className="kpi-meta">Configured taxonomy groups</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Active in Navigation</span>
              <Eye size={15} color="#15803d" />
            </div>
            <div className="kpi-value" style={{ color: '#15803d' }}>{activeCount}</div>
          </div>
          <div className="kpi-meta">Publicly browsable on storefront</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Inactive / Archived</span>
              <EyeOff size={15} color="var(--muted)" />
            </div>
            <div className="kpi-value">{inactiveCount}</div>
          </div>
          <div className="kpi-meta">Hidden from customer navigation</div>
        </div>

        <div className="kpi-card">
          <div>
            <div className="kpi-label">
              <span>Cataloged Products</span>
              <Sparkles size={15} color="#0284c7" />
            </div>
            <div className="kpi-value">{totalProducts}</div>
          </div>
          <div className="kpi-meta">Pieces assigned to categories</div>
        </div>
      </div>

      {/* Category Editor Drawer/Card */}
      {editingCategory && (
        <form onSubmit={handleSave} className="admin-table-card" style={{ padding: '28px', marginBottom: '28px', background: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '14px' }}>
            <div>
              <h2 className="admin-card-heading">
                {editingCategory.id ? `Edit Category: ${editingCategory.name || 'Untitled'}` : 'Create New Category'}
              </h2>
              <p className="admin-card-subheading">Configure storefront taxonomy, banner poster, and SEO tags</p>
            </div>
            <button
              type="button"
              onClick={() => setEditingCategory(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Category Name *
              </label>
              <input
                required
                value={editingCategory.name || ''}
                onChange={handleNameChange}
                placeholder="e.g. Accessories, Western, Ethnic"
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                URL Slug *
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                <span style={{ padding: '0 10px', fontSize: '12px', color: 'var(--muted)', fontFamily: 'monospace' }}>/collections/</span>
                <input
                  required
                  value={editingCategory.slug || ''}
                  onChange={e => setEditingCategory(prev => prev ? { ...prev, slug: slugify(e.target.value) } : null)}
                  placeholder="accessories"
                  style={{ flex: 1, padding: '10px 10px', fontSize: '13px', border: 'none', background: 'transparent', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
              Curatorial Description
            </label>
            <textarea
              value={editingCategory.description || ''}
              onChange={e => setEditingCategory(prev => prev ? { ...prev, description: e.target.value } : null)}
              placeholder="Editorial description displayed on collection landing pages and SEO tags..."
              rows={2}
              className="input-field"
              style={{ width: '100%', fontSize: '13px' }}
            />
          </div>

          {/* Banner Image Upload & Preview Section */}
          <div style={{ marginBottom: '20px', padding: '18px', background: '#fafafa', borderRadius: '4px', border: '1px solid #e5e5e5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', fontWeight: 600, display: 'block' }}>
                  Editorial Category Banner
                </span>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Wide landscape banner (16:9 ratio recommended). Used across homepage and collection headers.
                </span>
              </div>
              {bannerPreview && (
                <button
                  type="button"
                  onClick={() => { setBannerPreview(''); setEditingCategory(prev => prev ? { ...prev, image_url: '' } : null) }}
                  style={{ background: 'none', border: 'none', color: '#b91c1c', fontSize: '11px', cursor: 'pointer' }}
                >
                  Remove Image
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: bannerPreview ? '220px 1fr' : '1fr', gap: '16px', alignItems: 'center' }}>
              {bannerPreview && (
                <div style={{ width: '100%', height: '120px', position: 'relative', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border)', background: '#eee' }}>
                  <Image src={bannerPreview} alt="Category Banner Preview" fill style={{ objectFit: 'cover' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    style={{ fontSize: '12px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    {uploadingImage ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Banner Image'}</span>
                  </button>

                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>JPG, PNG, WEBP, or AVIF (Max 5MB)</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Or URL:</span>
                  <input
                    type="url"
                    value={bannerPreview}
                    onChange={e => { setBannerPreview(e.target.value); setEditingCategory(prev => prev ? { ...prev, image_url: e.target.value } : null) }}
                    placeholder="https://.../banner.jpg"
                    className="input-field"
                    style={{ flex: 1, fontSize: '12px', padding: '6px 10px', height: '32px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Display Order & Active Toggle */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '140px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', marginBottom: '6px', fontWeight: 600 }}>
                Display Priority
              </label>
              <input
                type="number"
                min="0"
                value={editingCategory.display_order ?? 0}
                onChange={e => setEditingCategory(prev => prev ? { ...prev, display_order: Number(e.target.value) } : null)}
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', marginTop: '16px' }}>
              <input
                type="checkbox"
                checked={editingCategory.is_active !== false}
                onChange={e => setEditingCategory(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ fontWeight: 500 }}>Active and visible in storefront navigation</span>
            </label>

            <button
              type="button"
              onClick={() => setShowSeoFields(!showSeoFields)}
              style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', marginTop: '16px' }}
            >
              {showSeoFields ? 'Hide SEO Metadata' : 'Configure SEO Metadata ▾'}
            </button>
          </div>

          {/* SEO Metadata Drawer */}
          {showSeoFields && (
            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#475569', fontWeight: 600, display: 'block', marginBottom: '10px' }}>
                Search Engine Optimization (SEO)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Meta Title</label>
                  <input
                    value={editingCategory.meta_title || ''}
                    onChange={e => setEditingCategory(prev => prev ? { ...prev, meta_title: e.target.value } : null)}
                    placeholder="e.g. Gold-Plated Jewellery & Accessories — SENO"
                    className="input-field"
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Meta Description</label>
                  <input
                    value={editingCategory.meta_description || ''}
                    onChange={e => setEditingCategory(prev => prev ? { ...prev, meta_description: e.target.value } : null)}
                    placeholder="e.g. Discover elegant gold-plated necklaces, rings, and everyday accessories."
                    className="input-field"
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                </div>
              </div>
            </div>
          )}

          {error && <p style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={isPending}
              className="button button-primary"
              style={{ fontSize: '12px', padding: '10px 22px' }}
            >
              {isPending ? 'Saving...' : 'Save Category'}
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setEditingCategory(null)}
              style={{ fontSize: '12px', padding: '10px 18px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Safe Deletion & Reassignment Modal */}
      {deletingCategory && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '6px', maxWidth: '480px', width: '100%', padding: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#b91c1c' }}>
              <AlertTriangle size={22} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                Delete Category: {deletingCategory.name}
              </h3>
            </div>

            {(deletingCategory.products?.[0]?.count ?? 0) > 0 ? (
              <div>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: '0 0 16px' }}>
                  There are currently <strong>{deletingCategory.products?.[0]?.count} product(s)</strong> assigned to this category.
                  To protect catalog integrity, please select one of the following safe actions:
                </p>

                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '4px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--ink)', marginBottom: '6px' }}>
                    Option 1: Reassign Products to Another Category
                  </label>
                  <select
                    value={reassignTargetId}
                    onChange={e => setReassignTargetId(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontSize: '12.5px', marginBottom: '8px' }}
                  >
                    <option value="">Select target category...</option>
                    {categories.filter(c => c.id !== deletingCategory.id && c.is_active).map(c => (
                      <option key={c.id} value={c.id}>{c.name} (/{c.slug})</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!reassignTargetId || isPending}
                    onClick={() => executeSafeDelete({ reassignToCategoryId: reassignTargetId })}
                    className="button button-primary"
                    style={{ fontSize: '11.5px', padding: '6px 14px', width: '100%' }}
                  >
                    {isPending ? 'Reassigning & Deleting...' : `Reassign ${deletingCategory.products?.[0]?.count} Products & Delete`}
                  </button>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '4px', border: '1px solid #fed7aa', background: '#fffbeb', marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#9a3412', marginBottom: '4px' }}>
                    Option 2: Deactivate Instead (Recommended)
                  </label>
                  <p style={{ fontSize: '11.5px', color: '#7c2d12', margin: '0 0 8px' }}>
                    Hides the category from storefront menus while keeping existing product relationships intact.
                  </p>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => { handleToggleActive(deletingCategory); setDeletingCategory(null) }}
                    className="button button-outline"
                    style={{ fontSize: '11.5px', padding: '6px 14px', width: '100%' }}
                  >
                    Deactivate Category
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 18px' }}>
                  This category has <strong>0 linked products</strong>. It can be safely and permanently removed from the database.
                </p>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setDeletingCategory(null)}
                    style={{ fontSize: '12px', padding: '8px 16px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => executeSafeDelete()}
                    className="button button-primary"
                    style={{ fontSize: '12px', padding: '8px 16px', background: '#b91c1c', borderColor: '#b91c1c' }}
                  >
                    {isPending ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            )}

            {(deletingCategory.products?.[0]?.count ?? 0) > 0 && (
              <div style={{ textAlign: 'right', marginTop: '12px' }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setDeletingCategory(null)}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Categories Card List & Table */}
      <div className="admin-table-card">
        <div className="admin-table-header-row">
          <div>
            <h2 className="admin-card-heading">Configured Categories ({categories.length})</h2>
            <p className="admin-card-subheading">Public catalog navigation structure, ordering, and posters</p>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="admin-desktop-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>Order</th>
                <th style={{ width: '90px' }}>Banner</th>
                <th>Category &amp; URL</th>
                <th>Description</th>
                <th style={{ width: '110px' }}>Products</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ textAlign: 'right', width: '150px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category, idx) => (
                <tr key={category.id}>
                  {/* Reordering Controls */}
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                      <button
                        type="button"
                        disabled={idx === 0 || isPending}
                        onClick={() => handleMoveUp(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: idx === 0 ? 'not-allowed' : 'pointer',
                          color: idx === 0 ? '#cbd5e1' : '#475569',
                          padding: '1px'
                        }}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)' }}>
                        #{category.display_order}
                      </span>
                      <button
                        type="button"
                        disabled={idx === categories.length - 1 || isPending}
                        onClick={() => handleMoveDown(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: idx === categories.length - 1 ? 'not-allowed' : 'pointer',
                          color: idx === categories.length - 1 ? '#cbd5e1' : '#475569',
                          padding: '1px'
                        }}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </td>

                  {/* Banner Preview Thumbnail */}
                  <td>
                    <div style={{ width: '70px', height: '44px', position: 'relative', borderRadius: '3px', overflow: 'hidden', background: '#f5f5f4', border: '1px solid var(--border)' }}>
                      {category.image_url ? (
                        <Image src={category.image_url} alt={category.name} fill style={{ objectFit: 'cover' }} sizes="70px" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ImageIcon size={16} color="var(--muted)" />
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Name and Slug */}
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{category.name}</div>
                    <Link
                      href={`/collections/${category.slug}`}
                      target="_blank"
                      style={{ fontSize: '11px', color: '#0284c7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
                    >
                      <span>/{category.slug}</span>
                      <ExternalLink size={10} />
                    </Link>
                  </td>

                  {/* Description */}
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {category.description || '—'}
                    </div>
                  </td>

                  {/* Product Count */}
                  <td>
                    <span style={{ fontWeight: 500, fontSize: '12.5px' }}>
                      {category.products?.[0]?.count ?? 0} pieces
                    </span>
                  </td>

                  {/* Status */}
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(category)}
                      className={`status-pill ${category.is_active ? 'approved' : 'draft'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                      title="Click to toggle visibility"
                    >
                      {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="button button-outline"
                        onClick={() => handleEdit(category)}
                        style={{ fontSize: '11px', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => setDeletingCategory(category)}
                        style={{ fontSize: '11px', padding: '5px 8px', color: '#b91c1c' }}
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Card View */}
        <div className="admin-mobile-card-list">
          {categories.map((category, idx) => (
            <div key={category.id} className="admin-order-card-mobile">
              <div className="admin-order-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '48px', height: '32px', position: 'relative', borderRadius: '3px', overflow: 'hidden', background: '#f5f5f4', border: '1px solid var(--border)', flexShrink: 0 }}>
                    {category.image_url ? (
                      <Image src={category.image_url} alt={category.name} fill style={{ objectFit: 'cover' }} sizes="48px" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={14} color="var(--muted)" />
                      </div>
                    )}
                  </div>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{category.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', fontFamily: 'monospace' }}>
                      /{category.slug}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(category)}
                  className={`status-pill ${category.is_active ? 'approved' : 'draft'}`}
                  style={{ border: 'none', cursor: 'pointer', fontSize: '10px' }}
                >
                  {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                </button>
              </div>

              <div style={{ padding: '0 16px 12px', fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{category.products?.[0]?.count ?? 0} pieces cataloged</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px' }}>Order: #{category.display_order}</span>
                  <button
                    type="button"
                    disabled={idx === 0 || isPending}
                    onClick={() => handleMoveUp(idx)}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '3px 6px', cursor: 'pointer' }}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === categories.length - 1 || isPending}
                    onClick={() => handleMoveDown(idx)}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '3px', padding: '3px 6px', cursor: 'pointer' }}
                  >
                    <ArrowDown size={12} />
                  </button>
                </div>
              </div>

              <div className="admin-order-card-footer" style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => handleEdit(category)}
                  style={{ flex: 1, fontSize: '12px', padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setDeletingCategory(category)}
                  style={{ padding: '8px 14px', color: '#b91c1c', border: '1px solid var(--border)' }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
