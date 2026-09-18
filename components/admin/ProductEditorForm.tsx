'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Upload, 
  Star, 
  Check, 
  AlertCircle, 
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Package,
  RotateCcw,
  ShieldCheck
} from 'lucide-react'
import { 
  createAdminProduct, 
  updateAdminProduct, 
  generateUniqueSlug,
  AdminProductImage,
  AdminProductVariant 
} from '@/lib/adminCatalog'
import { parseReturnPolicy } from '@/lib/catalog'

function toClientSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface ProductEditorFormProps {
  initialData?: any
  categories: any[]
  collections: any[]
  mode: 'create' | 'edit'
}

export function ProductEditorForm({ initialData, categories, collections, mode }: ProductEditorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'pricing' | 'media' | 'variants'>('details')
  const categoryOptions = initialData?.categories?.id && !categories.some(category => category.id === initialData.categories.id)
    ? [...categories, { ...initialData.categories, isLegacy: true }]
    : categories

  // Product Basic Information
  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [details, setDetails] = useState<string[]>(
    Array.isArray(initialData?.details) && initialData.details.length > 0 
      ? initialData.details.filter((d: any) => typeof d === 'string' && !d.toLowerCase().startsWith('return policy:'))
      : ['100% Premium Cotton', 'Pre-shrunk finish', 'Dry clean or gentle hand wash']
  )
  const [newDetailText, setNewDetailText] = useState('')

  // Classification & Logistics
  const [categoryId, setCategoryId] = useState(initialData?.category_id || categoryOptions[0]?.id || '')
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    initialData?.collection_ids || []
  )
  const [defaultWeightGrams, setDefaultWeightGrams] = useState<number>(
    initialData?.default_weight_grams || 500
  )
  const [shippingMethod, setShippingMethod] = useState<'weight_based' | 'custom'>(initialData?.shipping_method === 'custom' ? 'custom' : 'weight_based')
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState<number | string>(initialData?.custom_delivery_charge ?? '')

  // Return & Exchange Policy
  const initialRp = parseReturnPolicy(initialData?.details)
  const [isReturnable, setIsReturnable] = useState<boolean>(initialRp.isReturnable)
  const [returnWindowDays, setReturnWindowDays] = useState<number>(initialRp.returnWindowDays || 14)
  const [returnPolicyNotes, setReturnPolicyNotes] = useState<string>(initialRp.returnPolicyNotes || '')

  // Pricing & Merchandising
  const [price, setPrice] = useState<number | string>(initialData?.price ?? '')
  const [compareAtPrice, setCompareAtPrice] = useState<number | string>(initialData?.compare_at_price ?? '')
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active !== undefined ? initialData.is_active : true)
  const [isNew, setIsNew] = useState<boolean>(initialData?.is_new !== undefined ? initialData.is_new : true)
  const [isBestseller, setIsBestseller] = useState<boolean>(initialData?.is_bestseller || false)
  const [isFeatured, setIsFeatured] = useState<boolean>(initialData?.is_featured || false)

  // Media
  const [images, setImages] = useState<AdminProductImage[]>(
    initialData?.images && initialData.images.length > 0 
      ? initialData.images 
      : [
          {
            url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=1000&q=85',
            alt_text: '',
            display_order: 0,
            is_primary: true
          }
        ]
  )
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Variants & Matrix
  const [variants, setVariants] = useState<AdminProductVariant[]>(
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants
      : [
          { size: 'S', colour: 'Black', sku: '', quantity: 10, is_active: true },
          { size: 'M', colour: 'Black', sku: '', quantity: 10, is_active: true },
          { size: 'L', colour: 'Black', sku: '', quantity: 10, is_active: true },
          { size: 'XL', colour: 'Black', sku: '', quantity: 10, is_active: true }
        ]
  )

  // Matrix Generator State
  const [matrixSizes, setMatrixSizes] = useState('S, M, L, XL')
  const [matrixColours, setMatrixColours] = useState('Black, Washed Navy')
  const [matrixInitialStock, setMatrixInitialStock] = useState(10)

  // Slug Auto-generation
  const handleAutoSlug = async () => {
    if (!name.trim()) return
    const generated = await generateUniqueSlug(name, initialData?.id)
    setSlug(generated)
  }

  // Detail points helpers
  const handleAddDetail = () => {
    if (newDetailText.trim()) {
      setDetails([...details, newDetailText.trim()])
      setNewDetailText('')
    }
  }

  const handleRemoveDetail = (index: number) => {
    setDetails(details.filter((_, idx) => idx !== index))
  }

  // Image Upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingImage(true)
    setError(null)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fd = new FormData()
        fd.append('file', file)

        const res = await fetch('/api/admin/upload-image', {
          method: 'POST',
          body: fd
        })

        const data = await res.json()
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Image upload failed')
        }

        const newImg: AdminProductImage = {
          url: data.url,
          alt_text: name,
          display_order: images.length,
          is_primary: images.length === 0
        }

        setImages(prev => [...prev, newImg])
      }
    } catch (err: any) {
      setError(`Upload error: ${err.message}`)
    } finally {
      setUploadingImage(false)
      // reset file input
      e.target.value = ''
    }
  }

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return
    const newImg: AdminProductImage = {
      url: imageUrlInput.trim(),
      alt_text: name,
      display_order: images.length,
      is_primary: images.length === 0
    }
    setImages([...images, newImg])
    setImageUrlInput('')
  }

  const handleSetPrimaryImage = (index: number) => {
    setImages(images.map((img, idx) => ({
      ...img,
      is_primary: idx === index
    })))
  }

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === images.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const copy = [...images]
    const temp = copy[index]
    copy[index] = copy[targetIndex]
    copy[targetIndex] = temp

    // re-assign display orders
    const updated = copy.map((img, idx) => ({ ...img, display_order: idx }))
    setImages(updated)
  }

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index).map((img, idx) => ({
      ...img,
      display_order: idx,
      is_primary: img.is_primary && idx === 0 ? true : img.is_primary
    }))
    // If the removed image was primary, set the first image as primary
    if (updated.length > 0 && !updated.some(img => img.is_primary)) {
      updated[0].is_primary = true
    }
    setImages(updated)
  }

  // Variant Matrix Generator
  const handleGenerateMatrix = () => {
    const sizeList = matrixSizes.split(',').map(s => s.trim()).filter(Boolean)
    const colorList = matrixColours.split(',').map(c => c.trim()).filter(Boolean)

    if (sizeList.length === 0 && colorList.length === 0) return

    const effectiveSizes = sizeList.length > 0 ? sizeList : ['Standard']
    const effectiveColors = colorList.length > 0 ? colorList : ['Default']

    const currentBaseSlug = toClientSlug(slug || name || 'prod').toUpperCase()
    const newVariants: AdminProductVariant[] = []

    for (const c of effectiveColors) {
      for (const s of effectiveSizes) {
        const sku = `SENO-${currentBaseSlug.slice(0, 4)}-${toClientSlug(s).toUpperCase()}-${toClientSlug(c).toUpperCase().slice(0, 3)}`
        newVariants.push({
          size: s,
          colour: c,
          sku,
          quantity: matrixInitialStock,
          is_active: true
        })
      }
    }

    setVariants(newVariants)
  }

  const handleAddSingleVariant = () => {
    const currentBaseSlug = toClientSlug(slug || name || 'prod').toUpperCase()
    const sku = `SENO-${currentBaseSlug.slice(0, 4)}-VAR-${variants.length + 1}`
    setVariants([
      ...variants,
      {
        size: 'M',
        colour: 'Black',
        sku,
        quantity: 10,
        is_active: true
      }
    ])
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index))
  }

  const handleVariantChange = (index: number, field: keyof AdminProductVariant, value: any) => {
    setVariants(variants.map((v, idx) => {
      if (idx !== index) return v
      return { ...v, [field]: value }
    }))
  }

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!name.trim()) {
      setError('Please provide a product title.')
      return
    }

    if (price === '' || Number(price) < 0) {
      setError('Please provide a valid price.')
      return
    }

    if (images.length === 0) {
      setError('Please add at least one product image.')
      return
    }

    if (variants.length === 0) {
      setError('Please configure at least one variant.')
      return
    }

    startTransition(async () => {
      try {
        const payload: any = {
          name: name.trim(),
          slug: slug.trim() || toClientSlug(name),
          description,
          details,
          price: Number(price),
          compare_at_price: compareAtPrice !== '' ? Number(compareAtPrice) : null,
          category_id: categoryId || null,
          collection_ids: selectedCollectionIds,
          default_weight_grams: Number(defaultWeightGrams || 500),
          shipping_method: shippingMethod,
          custom_delivery_charge: shippingMethod === 'custom' ? Number(customDeliveryCharge) : null,
          return_policy: {
            is_returnable: isReturnable,
            return_window_days: isReturnable ? Number(returnWindowDays) : 0,
            notes: returnPolicyNotes
          },
          is_featured: isFeatured,
          is_new: isNew,
          is_bestseller: isBestseller,
          is_active: isActive,
          images,
          variants
        }

        if (mode === 'create') {
          const res = await createAdminProduct(payload)
          setSuccess(`Product "${name}" successfully published to live catalog!`)
          setIsDirty(false)
          setTimeout(() => {
            router.push('/admin/products')
          }, 1500)
        } else {
          await updateAdminProduct(initialData.id, { ...payload, id: initialData.id })
          setIsDirty(false)
          setSuccess(`Product "${name}" successfully updated! Storefront cache synchronized.`)
          setTimeout(() => {
            router.refresh()
          }, 1000)
        }
      } catch (err: any) {
        console.error('Submit error:', err)
        setError(err.message || 'An error occurred while saving the product.')
      }
    })
  }

  return (
    <div className="product-editor-page" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '80px' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link 
            href="/admin/products" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '12px', 
              color: 'var(--muted)', 
              textDecoration: 'none',
              marginBottom: '12px' 
            }}
          >
            <ArrowLeft size={14} /> Back to Catalog
          </Link>
          <h1 className="admin-page-title" style={{ margin: 0 }}>
            {mode === 'create' ? 'Create New Luxury Piece' : `Edit Piece: ${initialData?.name}`}
          </h1>
          <p className="admin-page-subtitle" style={{ margin: '4px 0 0' }}>
            Configure product metadata, luxury gallery, size variants, and synchronized database inventory
          </p>
        </div>

        {initialData?.slug && (
          <Link
            href={`/products/${initialData.slug}`}
            target="_blank"
            className="outline-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', textDecoration: 'none' }}
          >
            <span>View on Storefront</span>
            <ExternalLink size={12} />
          </Link>
        )}
      </div>

      {error && (
        <div style={{ 
          padding: '14px 18px', 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '4px',
          color: '#991b1b', 
          fontSize: '13px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{ 
          padding: '14px 18px', 
          background: '#ecfdf5', 
          border: '1px solid #a7f3d0', 
          borderRadius: '4px',
          color: '#065f46', 
          fontSize: '13px', 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Check size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        {[
          { id: 'details', label: '1. Basic Details', icon: Package },
          { id: 'pricing', label: '2. Pricing & Logistics', icon: DollarSign },
          { id: 'media', label: `3. Gallery (${images.length})`, icon: ImageIcon },
          { id: 'variants', label: `4. Variants & Stock (${variants.length})`, icon: Layers }
        ].map(tab => {
          const Icon = tab.icon
          const isActiveTab = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                fontSize: '12px',
                fontWeight: 600,
                letterSpacing: '0.5px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActiveTab ? '2px solid var(--ink)' : '2px solid transparent',
                color: isActiveTab ? 'var(--ink)' : 'var(--muted)',
                cursor: 'pointer'
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} onChange={() => setIsDirty(true)}>
        {/* TAB 1: BASIC DETAILS */}
        {activeTab === 'details' && (
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Piece Identification</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                  Product Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minimalist Wool Overcoat"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => { if (!slug) handleAutoSlug() }}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)',
                    color: 'var(--ink)'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--ink)' }}>
                    URL Slug *
                  </label>
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. minimalist-wool-overcoat"
                  value={slug}
                  onChange={e => setSlug(toClientSlug(e.target.value))}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)',
                    fontFamily: 'monospace',
                    color: 'var(--ink)'
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                Editorial Description
              </label>
              <textarea
                rows={4}
                placeholder="Narrative craft notes, tailoring silhouette, provenance, and material composition..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  background: 'var(--surface-subtle)',
                  color: 'var(--ink)',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                Garment Details & Specifications (Bullet Points)
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="e.g. 100% Japanese Selvedge Wool, horn buttons, custom cupro lining..."
                  value={newDetailText}
                  onChange={e => setNewDetailText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDetail() } }}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    fontSize: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddDetail}
                  className="outline-btn"
                  style={{ padding: '8px 16px', fontSize: '11px' }}
                >
                  <Plus size={13} /> Add
                </button>
              </div>

              {details.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {details.map((point, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface-subtle)', borderRadius: '2px', fontSize: '12px' }}>
                      <span>• {point}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDetail(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRICING & CLASSIFICATION */}
        {activeTab === 'pricing' && (
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Commercial & Logistics Pricing</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                  Retail Price (₹ INR) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12900"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min={0}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                  Compare-at Price (₹ INR Original/Markdown)
                </label>
                <input
                  type="number"
                  placeholder="Optional crossed-out price e.g. 14500"
                  value={compareAtPrice}
                  onChange={e => setCompareAtPrice(e.target.value)}
                  min={0}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                  Primary Department / Category *
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)'
                  }}
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}{c.isLegacy ? ' (Legacy - review)' : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                  Default Shipping Weight (Grams) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={defaultWeightGrams}
                  onChange={e => setDefaultWeightGrams(Number(e.target.value))}
                  min={50}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '13px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: 'var(--surface-subtle)'
                  }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '10px' }}>Delivery & Logistics</label>
              <div style={{ display: 'grid', gap: '10px' }}>
                <label><input type="radio" name="shipping-method" checked={shippingMethod === 'weight_based'} onChange={() => setShippingMethod('weight_based')} /> Weight Based</label>
                <label><input type="radio" name="shipping-method" checked={shippingMethod === 'custom'} onChange={() => setShippingMethod('custom')} /> Custom Delivery Charge</label>
                {shippingMethod === 'custom' && <input type="number" min="0" step="0.01" value={customDeliveryCharge} onChange={e => setCustomDeliveryCharge(e.target.value)} placeholder="Delivery charge in ₹" required />}
              </div>
            </div>

            {/* Return & Exchange Policy */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <RotateCcw size={15} color="var(--ink)" />
                <label style={{ margin: 0, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--ink)' }}>
                  Customer Return & Exchange Policy
                </label>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--muted)' }}>
                Define if this piece is eligible for customer returns and configure the return window shown on the product page.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    border: isReturnable ? '2px solid var(--ink)' : '1px solid var(--border)',
                    borderRadius: '2px',
                    background: isReturnable ? 'var(--surface-subtle)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="admin-return-eligibility"
                    checked={isReturnable}
                    onChange={() => setIsReturnable(true)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Eligible for Return & Exchange</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      Customers can initiate returns within the specified policy window.
                    </div>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px',
                    border: !isReturnable ? '2px solid var(--ink)' : '1px solid var(--border)',
                    borderRadius: '2px',
                    background: !isReturnable ? 'var(--surface-subtle)' : '#fff',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="radio"
                    name="admin-return-eligibility"
                    checked={!isReturnable}
                    onChange={() => setIsReturnable(false)}
                    style={{ marginTop: '3px' }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>Final Sale — Non-Returnable</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      Item cannot be returned or exchanged once dispatched. Marked on product page.
                    </div>
                  </div>
                </label>
              </div>

              {isReturnable && (
                <div style={{ padding: '16px', background: 'var(--surface-subtle)', borderRadius: '2px', border: '1px solid var(--border)', display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--ink)' }}>
                      Return Window Duration (Days)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[7, 10, 14, 30].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setReturnWindowDays(days)}
                          style={{
                            padding: '5px 12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: returnWindowDays === days ? '1px solid var(--ink)' : '1px solid var(--border)',
                            background: returnWindowDays === days ? 'var(--ink)' : '#fff',
                            color: returnWindowDays === days ? '#fff' : 'var(--ink)',
                            borderRadius: '2px',
                            cursor: 'pointer'
                          }}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={returnWindowDays}
                      onChange={e => setReturnWindowDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{
                        maxWidth: '180px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        border: '1px solid var(--border)',
                        borderRadius: '2px',
                        background: '#fff'
                      }}
                      placeholder="e.g. 14"
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      Shoppers will see &ldquo;{returnWindowDays}-Day Returns & Exchanges&rdquo; prominently on this product page.
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '6px', color: 'var(--muted)' }}>
                      Custom Policy Terms / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={returnPolicyNotes}
                      onChange={e => setReturnPolicyNotes(e.target.value)}
                      placeholder="e.g. Must be in pristine condition with original tags and protective packaging."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '12px',
                        border: '1px solid var(--border)',
                        borderRadius: '2px',
                        background: '#fff'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px', color: 'var(--ink)' }}>
                Curated Collections
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {collections.map((coll: any) => {
                  const checked = selectedCollectionIds.includes(coll.id)
                  return (
                    <label 
                      key={coll.id} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        fontSize: '13px', 
                        cursor: 'pointer',
                        padding: '6px 12px',
                        background: checked ? 'var(--ink)' : 'var(--surface-subtle)',
                        color: checked ? '#ffffff' : 'var(--ink)',
                        borderRadius: '2px'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (checked) {
                            setSelectedCollectionIds(selectedCollectionIds.filter(id => id !== coll.id))
                          } else {
                            setSelectedCollectionIds([...selectedCollectionIds, coll.id])
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <span>{coll.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '12px', color: 'var(--ink)' }}>
                Storefront Merchandising Badges & Availability
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  <strong>Active Online (Live Storefront)</strong>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={e => setIsNew(e.target.checked)}
                  />
                  <span>New Arrival Badge</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={e => setIsBestseller(e.target.checked)}
                  />
                  <span>Bestseller Badge</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                  />
                  <span>Featured Collection</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MEDIA & GALLERY */}
        {activeTab === 'media' && (
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Luxury Media Gallery</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Upload high-resolution photography. The first image marked Primary will represent the piece across catalog cards and search results.
                </p>
              </div>
            </div>

            {/* Upload Box */}
            <div style={{
              border: '2px dashed var(--border)',
              padding: '30px',
              textAlign: 'center',
              borderRadius: '4px',
              background: 'var(--surface-subtle)',
              marginBottom: '24px'
            }}>
              <Upload size={28} color="var(--muted)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
                {uploadingImage ? 'Uploading image to Supabase Storage...' : 'Upload Piece Photography'}
              </div>
              <p style={{ fontSize: '11px', color: 'var(--muted)', margin: '0 0 14px' }}>
                PNG, JPG, WEBP, or AVIF up to 5MB. Stored directly in Supabase Storage.
              </p>
              <label className="dark-btn" style={{ padding: '8px 18px', fontSize: '11px', cursor: 'pointer', display: 'inline-block' }}>
                Browse Files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>

              <div style={{ margin: '16px auto', fontSize: '11px', color: 'var(--muted)' }}>— OR PASTE IMAGE URL —</div>

              <div style={{ display: 'flex', gap: '8px', maxWidth: '500px', margin: '0 auto' }}>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '2px',
                    background: '#ffffff'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="outline-btn"
                  style={{ padding: '8px 14px', fontSize: '11px' }}
                >
                  Add URL
                </button>
              </div>
            </div>

            {/* Gallery Preview List */}
            {images.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)', fontSize: '13px' }}>
                No imagery added yet. Upload photography above to activate gallery.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: img.is_primary ? '2px solid var(--ink)' : '1px solid var(--border)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      background: 'var(--surface-subtle)',
                      position: 'relative'
                    }}
                  >
                    <div style={{ height: '220px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1c1c' }}>
                      <img
                        src={img.url}
                        alt={`Photo ${idx + 1}`}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      />
                      {img.is_primary && (
                        <span style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'var(--ink)',
                          color: '#ffffff',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          padding: '3px 8px',
                          borderRadius: '2px'
                        }}>
                          PRIMARY
                        </span>
                      )}
                    </div>

                    <div style={{ padding: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', borderTop: '1px solid var(--border)' }}>
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        disabled={img.is_primary}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: img.is_primary ? 'default' : 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: img.is_primary ? 'var(--ink)' : 'var(--muted)',
                          fontWeight: img.is_primary ? 600 : 400
                        }}
                      >
                        <Star size={13} fill={img.is_primary ? 'currentColor' : 'none'} />
                        <span>{img.is_primary ? 'Primary' : 'Make Primary'}</span>
                      </button>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'up')}
                          disabled={idx === 0}
                          title="Move left"
                          style={{ background: 'none', border: 'none', color: idx === 0 ? 'var(--border)' : 'var(--ink)', cursor: 'pointer' }}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(idx, 'down')}
                          disabled={idx === images.length - 1}
                          title="Move right"
                          style={{ background: 'none', border: 'none', color: idx === images.length - 1 ? 'var(--border)' : 'var(--ink)', cursor: 'pointer' }}
                        >
                          <ChevronDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove image"
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '4px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VARIANTS & INVENTORY */}
        {activeTab === 'variants' && (
          <div className="admin-table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Variant Combinations & Database Stock</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Manage individual sizes, colours, unique SKUs, and authoritative inventory quantities.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddSingleVariant}
                className="outline-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}
              >
                <Plus size={13} /> Add Single Variant
              </button>
            </div>

            {/* Quick Matrix Generator Accordion */}
            <div style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              padding: '16px',
              borderRadius: '4px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px', fontWeight: 600 }}>
                <Sparkles size={15} color="var(--ink)" />
                <span>Matrix Combination Generator</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                    Sizes (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={matrixSizes}
                    onChange={e => setMatrixSizes(e.target.value)}
                    placeholder="XS, S, M, L, XL"
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                    Colours (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={matrixColours}
                    onChange={e => setMatrixColours(e.target.value)}
                    placeholder="Black, White, Raw Indigo"
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--muted)', marginBottom: '4px' }}>
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={matrixInitialStock}
                    onChange={e => setMatrixInitialStock(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGenerateMatrix}
                  className="dark-btn"
                  style={{ padding: '9px 16px', fontSize: '11px', letterSpacing: '1px' }}
                >
                  Generate All
                </button>
              </div>
            </div>

            {/* Variants Table */}
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Colour</th>
                    <th>SKU (Unique)</th>
                    <th>Stock Quantity</th>
                    <th>Price Override</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          value={v.size}
                          onChange={e => handleVariantChange(idx, 'size', e.target.value)}
                          placeholder="e.g. M"
                          style={{ width: '70px', padding: '6px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={v.colour}
                          onChange={e => handleVariantChange(idx, 'colour', e.target.value)}
                          placeholder="e.g. Washed Black"
                          style={{ width: '120px', padding: '6px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={v.sku}
                          onChange={e => handleVariantChange(idx, 'sku', e.target.value)}
                          placeholder="SENO-SKU"
                          style={{ width: '160px', padding: '6px 8px', fontSize: '11px', fontFamily: 'monospace', border: '1px solid var(--border)', borderRadius: '2px' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={v.quantity}
                          onChange={e => handleVariantChange(idx, 'quantity', Number(e.target.value))}
                          style={{
                            width: '80px',
                            padding: '6px 8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: v.quantity === 0 ? '1px solid #ef4444' : '1px solid var(--border)',
                            borderRadius: '2px',
                            background: v.quantity === 0 ? '#fef2f2' : '#ffffff',
                            color: v.quantity === 0 ? '#b91c1c' : 'var(--ink)'
                          }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          value={v.price_override ?? ''}
                          onChange={e => handleVariantChange(idx, 'price_override', e.target.value ? Number(e.target.value) : null)}
                          placeholder="Default"
                          style={{ width: '90px', padding: '6px 8px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                        />
                      </td>
                      <td>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={v.is_active}
                            onChange={e => handleVariantChange(idx, 'is_active', e.target.checked)}
                          />
                          <span>{v.is_active ? 'Active' : 'Off'}</span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Form Action Controls */}
        <div style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
          marginTop: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border)',
          padding: '14px 0',
          background: 'var(--background)'
        }}>
          <span style={{ fontSize: '12px', color: isDirty ? '#9a3412' : 'var(--muted)', fontWeight: 600 }}>{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <Link href="/admin/products" className="outline-btn" style={{ padding: '12px 20px', fontSize: '11px', textDecoration: 'none' }}>
            Cancel
          </Link>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="submit"
              disabled={isPending}
              className="dark-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                fontSize: '11px',
                letterSpacing: '1.5px',
                fontWeight: 600,
                borderRadius: '2px',
                opacity: isPending ? 0.7 : 1
              }}
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>SYNCHRONIZING WITH SUPABASE...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{mode === 'create' ? 'CREATE & PUBLISH PIECE' : 'SAVE CHANGES TO DATABASE'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
