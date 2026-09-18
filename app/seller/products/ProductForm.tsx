'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  ImagePlus, 
  Loader2, 
  Plus, 
  Star, 
  Trash2, 
  X, 
  Sparkles, 
  AlertCircle, 
  Package, 
  Tag, 
  Truck,
  ShieldCheck,
  CheckCircle2,
  RotateCcw
} from 'lucide-react'
import { submitSellerProduct } from '@/lib/sellers'
import { createClient } from '@/utils/supabase/client'
import { money, parseReturnPolicy } from '@/lib/catalog'

type Step = 1 | 2 | 3 | 4 | 5
type ImageItem = { url: string; display_order?: number; is_primary?: boolean }
type VariantItem = { size: string; colour: string; sku: string; quantity: string; id?: string }

const slugify = (value: string) => 
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

export function ProductForm({ 
  categories, 
  collections = [], 
  initialData = null 
}: { 
  categories: any[]
  collections?: any[]
  initialData?: any 
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  
  // Basic Info
  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const categoryOptions = initialData?.categories?.id && !categories.some(category => category.id === initialData.categories.id)
    ? [...categories, { ...initialData.categories, isLegacy: true }]
    : categories
  const [collectionIds, setCollectionIds] = useState<string[]>(initialData?.collection_ids || [])
  
  // Pricing & Logistics
  const [price, setPrice] = useState(String(initialData?.price || ''))
  const [compareAtPrice, setCompareAtPrice] = useState(String(initialData?.compare_at_price || ''))
  const [weight, setWeight] = useState(String(initialData?.default_weight_grams || '500'))
  const [shippingMethod, setShippingMethod] = useState<'weight_based' | 'custom'>(
    initialData?.shipping_method === 'custom' ? 'custom' : 'weight_based'
  )
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState(String(initialData?.custom_delivery_charge || ''))
  
  // Return & Exchange Policy
  const initialRp = parseReturnPolicy(initialData?.details)
  const [isReturnable, setIsReturnable] = useState<boolean>(initialRp.isReturnable)
  const [returnWindowDays, setReturnWindowDays] = useState<string>(String(initialRp.returnWindowDays || 14))
  const [returnPolicyNotes, setReturnPolicyNotes] = useState<string>(initialRp.returnPolicyNotes || '')

  // Dynamic Image Ratio State
  const [previewRatio, setPreviewRatio] = useState<number | null>(null)
  
  // Media & Variants
  const [images, setImages] = useState<ImageItem[]>(initialData?.product_images || [])
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [variants, setVariants] = useState<VariantItem[]>(
    (initialData?.variants || []).map((variant: any) => ({
      ...variant,
      quantity: String(variant.quantity || 0)
    }))
  )
  const [uploading, setUploading] = useState(false)

  const selectedCategory = categories.find(c => c.id === categoryId)
  const totalStock = variants.reduce((sum, v) => sum + Math.max(0, Number(v.quantity || 0)), 0)
  
  const duplicateSku = variants.some((v, idx) => 
    v.sku.trim() && variants.findIndex(other => other.sku.trim().toLowerCase() === v.sku.trim().toLowerCase()) !== idx
  )
  const duplicateCombination = variants.some((v, idx) => 
    variants.findIndex(other => 
      other.size.trim().toLowerCase() === v.size.trim().toLowerCase() && 
      other.colour.trim().toLowerCase() === v.colour.trim().toLowerCase()
    ) !== idx
  )

  const validate = (target: Step): boolean => {
    setError('')
    if (target >= 2 && (!name.trim() || !slug.trim() || !categoryId)) {
      setError('Please complete the product name, URL slug, and select a category.')
      return false
    }
    if (target >= 3 && (!images.length || !images.some(img => img.is_primary))) {
      setError('Please upload at least one image and designate a primary cover photo.')
      return false
    }
    if (target >= 4) {
      if (!Number.isFinite(Number(price)) || Number(price) < 0 || !price) {
        setError('Please specify a valid selling price.')
        return false
      }
      if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
        setError('Please enter a valid product weight in grams.')
        return false
      }
      if (shippingMethod === 'custom' && (!Number.isFinite(Number(customDeliveryCharge)) || Number(customDeliveryCharge) < 0 || !customDeliveryCharge)) {
        setError('Please provide a valid custom delivery charge.')
        return false
      }
    }
    if (target >= 5) {
      if (!variants.length) {
        setError('Please add at least one product variant (size and colour).')
        return false
      }
      if (duplicateSku) {
        setError('Each variant must have a unique SKU code.')
        return false
      }
      if (duplicateCombination) {
        setError('Each variant must have a unique size and colour combination.')
        return false
      }
      if (variants.some(v => !v.size.trim() || !v.colour.trim() || !v.sku.trim() || !Number.isInteger(Number(v.quantity)) || Number(v.quantity) < 0)) {
        setError('Please complete size, colour, SKU, and a valid quantity for all variants.')
        return false
      }
    }
    return true
  }

  const goTo = (target: Step) => {
    if (target > step && !validate(target)) return
    setStep(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAutoSlug = () => {
    if (name.trim()) {
      setSlug(slugify(name))
    }
  }

  const handleAddStandardSizes = () => {
    const standardSizes = ['XS', 'S', 'M', 'L', 'XL']
    const baseSlug = (slug || slugify(name) || 'ITEM').toUpperCase().slice(0, 8)
    const baseColour = variants[0]?.colour || 'Black'

    const newVariants: VariantItem[] = standardSizes.map(size => ({
      size,
      colour: baseColour,
      sku: `${baseSlug}-${baseColour.toUpperCase().slice(0, 3)}-${size}`,
      quantity: '10'
    }))

    setVariants(newVariants)
  }

  const handleAutoSkus = () => {
    const basePrefix = (slug || slugify(name) || 'SNO').toUpperCase().slice(0, 6)
    setVariants(curr => curr.map(v => {
      const col = (v.colour || 'STD').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
      const sz = (v.size || 'OS').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
      return {
        ...v,
        sku: `${basePrefix}-${col}-${sz}`
      }
    }))
  }

  const updateVariant = (index: number, field: keyof VariantItem, value: string) => {
    setVariants(current => current.map((v, idx) => idx === index ? { ...v, [field]: value } : v))
  }

  const moveImage = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const next = [...images]
    ;[next[index], next[target]] = [next[target], next[index]]
    setImages(next.map((img, display_order) => ({ ...img, display_order })))
  }

  const removeImage = (index: number) => {
    const next = images.filter((_, idx) => idx !== index)
    if (next.length && !next.some(img => img.is_primary)) {
      next[0].is_primary = true
    }
    setImages(next)
  }

  const uploadImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading(true)
    setError('')
    try {
      const supabase = createClient()
      const uploaded: ImageItem[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
          throw new Error('Images must be valid image files (JPEG, PNG, WebP) under 5MB.')
        }
        const extension = file.name.split('.').pop() || 'jpg'
        const path = `seller/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        const result = await supabase.storage.from('product-images').upload(path, file)
        if (result.error) throw new Error(result.error.message)
        uploaded.push({
          url: supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl,
          is_primary: images.length === 0 && uploaded.length === 0
        })
      }
      setImages(curr => [...curr, ...uploaded].map((img, display_order) => ({ ...img, display_order })))
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const submit = (submitForReview: boolean) => {
    if (!validate(5)) return
    startTransition(async () => {
      try {
        const formData = new FormData()
        ;[
          ['name', name.trim()],
          ['slug', slug.trim()],
          ['description', description],
          ['category_id', categoryId],
          ['collection_ids', JSON.stringify(collectionIds)],
          ['price', price],
          ['compare_at_price', compareAtPrice],
          ['weight', weight],
          ['shipping_method', shippingMethod],
          ['custom_delivery_charge', customDeliveryCharge],
          ['is_returnable', isReturnable ? 'true' : 'false'],
          ['return_window_days', isReturnable ? returnWindowDays : '0'],
          ['return_policy_notes', returnPolicyNotes],
          ['details', JSON.stringify(initialData?.details || [])],
          ['approval_status', submitForReview ? (initialData?.approval_status === 'approved' ? 'unchanged' : 'submitted') : 'draft']
        ].forEach(([key, value]) => formData.set(key, value))

        await submitSellerProduct(formData, images, variants, initialData?.id)
        router.push('/seller/products')
        router.refresh()
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : 'Unable to save product.')
      }
    })
  }

  const stepsList = [
    { title: 'Basic Information', desc: 'Title, URL & Category' },
    { title: 'Media', desc: 'Photos & Cover' },
    { title: 'Pricing & Delivery', desc: 'Price & Shipping' },
    { title: 'Variants & Stock', desc: 'Sizes, SKUs & Qty' },
    { title: 'Review & Submit', desc: 'Preview & Verification' }
  ]

  // Calculate discount percentage if compareAtPrice is provided
  const numPrice = Number(price || 0)
  const numCompare = Number(compareAtPrice || 0)
  const discountPercent = numCompare > numPrice && numPrice > 0 
    ? Math.round(((numCompare - numPrice) / numCompare) * 100) 
    : 0

  return (
    <form onSubmit={event => event.preventDefault()} style={{ display: 'grid', gap: '24px' }}>
      {/* Top Breadcrumb & Studio Header */}
      <div>
        <div style={{ marginBottom: '16px' }}>
          <Link 
            href="/seller/products" 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--muted)',
              textDecoration: 'none',
              letterSpacing: '0.5px'
            }}
          >
            <ArrowLeft size={13} />
            <span>Back to Products Library</span>
          </Link>
        </div>

        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="section-kicker">SELLER STUDIO</span>
            <h1 className="static-page-title" style={{ margin: '4px 0 6px', fontSize: '28px' }}>
              {initialData ? 'Edit Product Listing' : 'Create New Product'}
            </h1>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: '13px' }}>
              Your listing will be reviewed by SENO before becoming visible on the marketplace.
            </p>
          </div>

          <button 
            type="button" 
            className="button button-outline" 
            onClick={() => router.back()}
            style={{ fontSize: '11px', padding: '9px 16px', gap: '6px' }}
          >
            <X size={13} />
            <span>Exit Studio</span>
          </button>
        </header>
      </div>

      {/* 5-Step Stepper */}
      <div className="seller-stepper-container" style={{ borderRadius: '2px', border: '1px solid var(--border)' }}>
        <div className="seller-stepper">
          {stepsList.map((item, index) => {
            const stepNum = (index + 1) as Step
            const isActive = step === stepNum
            const isCompleted = step > stepNum

            return (
              <button
                type="button"
                key={item.title}
                onClick={() => goTo(stepNum)}
                className={`seller-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              >
                <span className="seller-step-badge">
                  {isCompleted ? <Check size={13} strokeWidth={2.5} /> : stepNum}
                </span>
                <div>
                  <div className="seller-step-text" style={{ fontWeight: isActive ? 600 : 500 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div 
          role="alert" 
          style={{ 
            padding: '14px 18px', 
            background: '#fff7ed', 
            border: '1px solid #fed7aa', 
            color: '#9a3412', 
            fontSize: '13px',
            borderRadius: '2px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: BASIC INFORMATION */}
      {step === 1 && (
        <section className="admin-table-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Piece Identification & Narrative</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Set the customer-facing title, clean permalink slug, and detailed craftsmanship notes.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '22px' }}>
            <div>
              <label className="form-label" htmlFor="product-name">
                Product Name <span className="form-label-required">*</span>
              </label>
              <input
                id="product-name"
                type="text"
                className="input-field"
                required
                placeholder="e.g. Minimalist Oversized Linen Shirt"
                value={name}
                onChange={event => {
                  setName(event.target.value)
                  if (!initialData) {
                    setSlug(slugify(event.target.value))
                  }
                }}
              />
              <div className="form-helper-text">
                The primary title shown in SENO storefront catalogs and search results.
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                <label className="form-label" htmlFor="product-slug" style={{ margin: 0 }}>
                  Product URL Slug <span className="form-label-required">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoSlug}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--muted)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  <Sparkles size={12} /> Auto-generate from Name
                </button>
              </div>
              <input
                id="product-slug"
                type="text"
                className="input-field"
                required
                placeholder="e.g. minimalist-oversized-linen-shirt"
                value={slug}
                onChange={event => setSlug(slugify(event.target.value))}
                style={{ fontFamily: 'monospace', letterSpacing: '0.2px' }}
              />
              <div className="form-helper-text">
                Live URL: <code style={{ background: 'var(--surface-subtle)', padding: '2px 6px', borderRadius: '2px' }}>senostore.com/products/{slug || 'your-slug'}</code>
              </div>
            </div>

            <div>
              <label className="form-label" htmlFor="product-description">
                Editorial Craftsmanship Description <span className="form-label-required">*</span>
              </label>
              <textarea
                id="product-description"
                className="input-field"
                rows={5}
                required
                placeholder="Describe the silhouette, fabric weave, tailoring details, fit recommendations, tactile drape, and care recommendations..."
                value={description}
                onChange={event => setDescription(event.target.value)}
              />
              <div className="form-helper-text">
                Provide rich garment storytelling, fabric weight, and styling advice for customers.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div>
                <label className="form-label" htmlFor="product-category">
                  Department / Category <span className="form-label-required">*</span>
                </label>
                <select
                  id="product-category"
                  className="input-field"
                  required
                  value={categoryId}
                  onChange={event => setCategoryId(event.target.value)}
                >
                  <option value="">Select a category...</option>
                  {categoryOptions.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.isLegacy ? ' (Legacy - review)' : ''}
                    </option>
                  ))}
                </select>
                <div className="form-helper-text">Defines store navigation hierarchy.</div>
              </div>

              <div>
                <label className="form-label" htmlFor="product-collection">
                  Curated Collection (Optional)
                </label>
                <select
                  id="product-collection"
                  className="input-field"
                  value={collectionIds[0] || ''}
                  onChange={event => setCollectionIds(event.target.value ? [event.target.value] : [])}
                >
                  <option value="">None (Standard Catalog)</option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </select>
                <div className="form-helper-text">Group into seasonal or thematic drops.</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STEP 2: MEDIA & PHOTOGRAPHY */}
      {step === 2 && (
        <section className="admin-table-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Product Photography & Imagery</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              High-resolution imagery reflecting SENO studio aesthetic. First image will serve as primary catalog cover.
            </p>
          </div>

          <div className="media-dropzone" style={{ marginBottom: '28px' }}>
            <ImagePlus size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} strokeWidth={1.4} />
            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>
              Upload High-Resolution Product Imagery
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '0 0 16px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
              Recommended: 3:4 portrait aspect ratio (min. 1200×1600px). Supported formats: JPG, PNG, WebP up to 5MB each.
            </p>
            <label className="button button-primary" style={{ padding: '10px 22px', fontSize: '11px' }}>
              {uploading ? (
                <>
                  <Loader2 size={14} className="spin" /> Uploading Photography...
                </>
              ) : (
                <>
                  <Plus size={14} /> Select & Upload Images
                </>
              )}
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={uploadImages}
                hidden
                disabled={uploading}
              />
            </label>

            <div style={{ display: 'flex', gap: '8px', maxWidth: '460px', margin: '16px auto 0' }}>
              <input
                id="seller-image-url-input"
                type="url"
                className="input-field"
                placeholder="Or paste direct image URL (https://...)"
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
                style={{ fontSize: '12px', padding: '8px 12px' }}
              />
              <button
                id="seller-image-add-url-btn"
                type="button"
                className="button button-outline"
                style={{ fontSize: '11px', whiteSpace: 'nowrap', padding: '8px 14px' }}
                onClick={() => {
                  if (imageUrlInput.trim()) {
                    setImages(curr => [...curr, { url: imageUrlInput.trim(), display_order: curr.length, is_primary: curr.length === 0 }])
                    setImageUrlInput('')
                  }
                }}
              >
                Add URL
              </button>
            </div>
          </div>

          {images.length > 0 ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--muted)' }}>
                  Uploaded Media Gallery ({images.length})
                </span>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  ★ Indicates primary catalog thumbnail
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px' }}>
                {images.map((image, index) => (
                  <div key={`${image.url}-${index}`} className={`product-image-card ${image.is_primary ? 'is-primary' : ''}`}>
                    <div style={{ aspectRatio: '3/4', position: 'relative', background: '#f0f0ee' }}>
                      <img
                        src={image.url}
                        alt={`${name} preview ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {image.is_primary && (
                        <span
                          style={{
                            position: 'absolute',
                            left: '8px',
                            top: '8px',
                            background: 'var(--ink)',
                            color: '#fff',
                            padding: '3px 8px',
                            fontSize: '9px',
                            letterSpacing: '0.8px',
                            fontWeight: 700,
                            borderRadius: '2px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Star size={10} fill="#fff" /> PRIMARY COVER
                        </span>
                      )}
                    </div>

                    <div className="product-image-actions">
                      <button
                        type="button"
                        title={image.is_primary ? 'Primary cover image' : 'Set as primary cover image'}
                        className="image-icon-btn"
                        onClick={() =>
                          setImages(curr =>
                            curr.map((item, itemIdx) => ({
                              ...item,
                              is_primary: itemIdx === index
                            }))
                          )
                        }
                        style={{ color: image.is_primary ? '#eab308' : 'var(--muted)' }}
                      >
                        <Star size={14} fill={image.is_primary ? 'currentColor' : 'none'} />
                      </button>

                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          type="button"
                          title="Move left"
                          className="image-icon-btn"
                          disabled={index === 0}
                          onClick={() => moveImage(index, -1)}
                          style={{ opacity: index === 0 ? 0.3 : 1 }}
                        >
                          <ChevronLeft size={14} />
                        </button>

                        <button
                          type="button"
                          title="Move right"
                          className="image-icon-btn"
                          disabled={index === images.length - 1}
                          onClick={() => moveImage(index, 1)}
                          style={{ opacity: index === images.length - 1 ? 0.3 : 1 }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      <button
                        type="button"
                        title="Remove image"
                        className="image-icon-btn danger"
                        onClick={() => removeImage(index)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', border: '1px solid var(--border)', background: '#fff', borderRadius: '2px' }}>
              <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
                No images added yet. Upload at least one high quality portrait image to proceed.
              </p>
            </div>
          )}
        </section>
      )}

      {/* STEP 3: PRICING & DELIVERY */}
      {step === 3 && (
        <section className="admin-table-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Commercial Terms & Logistics</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              Configure product retail pricing, promotional strike-through, and fulfillment parameters.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '26px' }}>
            {/* Price Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              <div>
                <label className="form-label" htmlFor="selling-price">
                  Selling Price (INR) <span className="form-label-required">*</span>
                </label>
                <div className="form-prefix-wrapper">
                  <span className="form-prefix-addon">₹</span>
                  <input
                    id="selling-price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    required
                    placeholder="3490"
                    value={price}
                    onChange={event => setPrice(event.target.value)}
                  />
                </div>
                <div className="form-helper-text">The final retail price charged to customers.</div>
              </div>

              <div>
                <label className="form-label" htmlFor="compare-price">
                  Compare-at Price (Optional)
                </label>
                <div className="form-prefix-wrapper">
                  <span className="form-prefix-addon">₹</span>
                  <input
                    id="compare-price"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    placeholder="4490"
                    value={compareAtPrice}
                    onChange={event => setCompareAtPrice(event.target.value)}
                  />
                </div>
                <div className="form-helper-text">Original price displayed as strike-through MSRP.</div>
              </div>
            </div>

            {/* Live Discount Callout */}
            {discountPercent > 0 && (
              <div 
                style={{ 
                  padding: '12px 16px', 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '2px', 
                  fontSize: '12px', 
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Tag size={14} />
                <span>
                  <strong>{discountPercent}% Discount</strong> displayed to shoppers. Customers save ₹{(numCompare - numPrice).toLocaleString('en-IN')}.
                </span>
              </div>
            )}

            {/* Shipping Method Selector */}
            <div>
              <label className="form-label">
                Fulfillment & Logistics Method <span className="form-label-required">*</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '6px' }}>
                <div
                  className={`shipping-card ${shippingMethod === 'weight_based' ? 'selected' : ''}`}
                  onClick={() => setShippingMethod('weight_based')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={16} />
                    <strong style={{ fontSize: '13px' }}>Weight-Based Calculation</strong>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '11.5px', lineHeight: 1.4 }}>
                    Uses SENO standardized volumetric shipping matrix based on actual packed garment grams.
                  </small>
                </div>

                <div
                  className={`shipping-card ${shippingMethod === 'custom' ? 'selected' : ''}`}
                  onClick={() => setShippingMethod('custom')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Package size={16} />
                    <strong style={{ fontSize: '13px' }}>Custom Flat Delivery Fee</strong>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '11.5px', lineHeight: 1.4 }}>
                    Charge a bespoke flat consignment shipping fee directly for this specific item.
                  </small>
                </div>
              </div>
            </div>

            {/* Conditional Delivery Inputs */}
            {shippingMethod === 'weight_based' ? (
              <div>
                <label className="form-label" htmlFor="product-weight">
                  Packaged Garment Weight (Grams) <span className="form-label-required">*</span>
                </label>
                <div className="form-prefix-wrapper">
                  <input
                    id="product-weight"
                    type="number"
                    min="1"
                    className="input-field"
                    required
                    placeholder="500"
                    value={weight}
                    onChange={event => setWeight(event.target.value)}
                  />
                  <span style={{ position: 'absolute', right: '14px', color: 'var(--muted)', fontSize: '12px', pointerEvents: 'none' }}>
                    grams
                  </span>
                </div>
                
                {/* Weight Presets Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Presets:</span>
                  {[
                    ['300g (Tee / Top)', '300'],
                    ['500g (Shirt / Trousers)', '500'],
                    ['800g (Knit / Denim)', '800'],
                    ['1200g (Outerwear)', '1200']
                  ].map(([label, grams]) => (
                    <button
                      key={grams}
                      type="button"
                      onClick={() => setWeight(grams)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        border: weight === grams ? '1px solid var(--ink)' : '1px solid var(--border)',
                        background: weight === grams ? 'var(--surface-subtle)' : '#fff',
                        borderRadius: '2px',
                        color: weight === grams ? 'var(--ink)' : 'var(--muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="form-label" htmlFor="custom-charge">
                  Custom Shipping Fee Per Order Line (INR) <span className="form-label-required">*</span>
                </label>
                <div className="form-prefix-wrapper">
                  <span className="form-prefix-addon">₹</span>
                  <input
                    id="custom-charge"
                    type="number"
                    min="0"
                    step="0.01"
                    className="input-field"
                    required
                    placeholder="150"
                    value={customDeliveryCharge}
                    onChange={event => setCustomDeliveryCharge(event.target.value)}
                  />
                </div>
                <div className="form-helper-text">Customer will be billed this fixed amount for shipping this product.</div>
              </div>
            )}

            {/* Return & Exchange Policy */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <RotateCcw size={16} color="var(--ink)" />
                <label className="form-label" style={{ margin: 0 }}>
                  Return & Exchange Policy <span className="form-label-required">*</span>
                </label>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
                Specify whether this garment is eligible for customer return or replacement, and define the validity window.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                <div
                  className={`shipping-card ${isReturnable ? 'selected' : ''}`}
                  onClick={() => setIsReturnable(true)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RotateCcw size={16} />
                    <strong style={{ fontSize: '13px' }}>Eligible for Return & Exchange</strong>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '11.5px', lineHeight: 1.4 }}>
                    Customers can request returns or size exchanges within your custom policy window.
                  </small>
                </div>

                <div
                  className={`shipping-card ${!isReturnable ? 'selected' : ''}`}
                  onClick={() => setIsReturnable(false)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} />
                    <strong style={{ fontSize: '13px' }}>Final Sale (Non-Returnable)</strong>
                  </div>
                  <small style={{ color: 'var(--muted)', fontSize: '11.5px', lineHeight: 1.4 }}>
                    Intimates, custom couture, or promotional items not eligible for return once delivered.
                  </small>
                </div>
              </div>

              {isReturnable && (
                <div style={{ padding: '18px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px', display: 'grid', gap: '16px' }}>
                  <div>
                    <label className="form-label" htmlFor="return-window-days">
                      Return Period Window (Days) <span className="form-label-required">*</span>
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Presets:</span>
                      {['7', '10', '14', '30'].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setReturnWindowDays(days)}
                          style={{
                            padding: '4px 12px',
                            fontSize: '11px',
                            border: returnWindowDays === days ? '1px solid var(--ink)' : '1px solid var(--border)',
                            background: returnWindowDays === days ? 'var(--ink)' : '#fff',
                            color: returnWindowDays === days ? '#fff' : 'var(--ink)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          {days} Days
                        </button>
                      ))}
                    </div>
                    <div className="form-prefix-wrapper" style={{ maxWidth: '240px' }}>
                      <input
                        id="return-window-days"
                        type="number"
                        min="1"
                        max="90"
                        className="input-field"
                        required
                        placeholder="14"
                        value={returnWindowDays}
                        onChange={event => setReturnWindowDays(event.target.value)}
                      />
                      <span style={{ position: 'absolute', right: '14px', color: 'var(--muted)', fontSize: '12px', pointerEvents: 'none' }}>
                        days
                      </span>
                    </div>
                    <div className="form-helper-text">Shoppers see &ldquo;{returnWindowDays || 14}-Day Returns &amp; Exchanges&rdquo; on the product page.</div>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="return-policy-notes">
                      Return Conditions / Notes (Optional)
                    </label>
                    <input
                      id="return-policy-notes"
                      type="text"
                      className="input-field"
                      placeholder="e.g. Unworn with original tags attached and security seals intact."
                      value={returnPolicyNotes}
                      onChange={event => setReturnPolicyNotes(event.target.value)}
                    />
                    <div className="form-helper-text">Specific care or return requirements communicated to customers during unboxing.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* STEP 4: VARIANTS & INVENTORY */}
      {step === 4 && (
        <section className="admin-table-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Variants & Inventory Matrix</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                Every combination of size and colour must have a unique SKU and initial stock allocation.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="button button-outline"
                onClick={handleAddStandardSizes}
                style={{ fontSize: '11px', padding: '8px 14px' }}
              >
                <Sparkles size={13} /> Quick Add XS–XL
              </button>

              <button
                type="button"
                className="button button-outline"
                onClick={handleAutoSkus}
                style={{ fontSize: '11px', padding: '8px 14px' }}
              >
                Auto-fill SKUs
              </button>

              <button
                type="button"
                className="button button-primary"
                onClick={() => setVariants(curr => [...curr, { size: '', colour: '', sku: '', quantity: '10' }])}
                style={{ fontSize: '11px', padding: '8px 14px' }}
              >
                <Plus size={13} /> Add Variant
              </button>
            </div>
          </div>

          {/* Validation Warnings */}
          {duplicateSku && (
            <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', fontSize: '12px', borderRadius: '2px', marginBottom: '16px' }}>
              Duplicate SKU detected. Each variant row requires an exclusive SKU.
            </div>
          )}
          {duplicateCombination && (
            <div style={{ padding: '10px 14px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#9f1239', fontSize: '12px', borderRadius: '2px', marginBottom: '16px' }}>
              Duplicate size and colour combination detected. Please consolidate identical variations.
            </div>
          )}

          {/* Variants Table */}
          {variants.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="variant-table admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Size *</th>
                    <th style={{ width: '160px' }}>Colour *</th>
                    <th>SKU Identifier *</th>
                    <th style={{ width: '130px' }}>Stock Quantity *</th>
                    <th style={{ width: '50px', textAlign: 'center' }}>Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className="input-field"
                          required
                          placeholder="e.g. M"
                          value={variant.size}
                          onChange={event => updateVariant(index, 'size', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input-field"
                          required
                          placeholder="e.g. Charcoal"
                          value={variant.colour}
                          onChange={event => updateVariant(index, 'colour', event.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input-field"
                          required
                          placeholder="e.g. SNO-LNN-CHR-M"
                          value={variant.sku}
                          onChange={event => updateVariant(index, 'sku', event.target.value)}
                          style={{ fontFamily: 'monospace' }}
                        />
                      </td>
                      <td>
                        <input
                          className="input-field"
                          type="number"
                          min="0"
                          step="1"
                          required
                          placeholder="10"
                          value={variant.quantity}
                          onChange={event => updateVariant(index, 'quantity', event.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          title="Remove variant"
                          onClick={() => setVariants(curr => curr.filter((_, idx) => idx !== index))}
                          className="image-icon-btn danger"
                          style={{ margin: '0 auto' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--muted)', padding: '12px 14px', background: 'var(--surface-subtle)', borderRadius: '2px' }}>
                <span>{variants.length} total variant rows</span>
                <span>
                  Total Available Inventory: <strong style={{ color: 'var(--ink)' }}>{totalStock} units</strong>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface-subtle)', border: '1px dashed var(--border)', borderRadius: '2px' }}>
              <Package size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} strokeWidth={1.3} />
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>No Variations Created Yet</h3>
              <p style={{ color: 'var(--muted)', fontSize: '12px', margin: '0 0 18px' }}>
                Generate standard sizing options or add custom tailored variations.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={handleAddStandardSizes}
                  style={{ fontSize: '11px', padding: '8px 16px' }}
                >
                  <Sparkles size={13} /> Add Standard Sizes (XS-XL)
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setVariants([{ size: 'M', colour: 'Black', sku: `${slug.toUpperCase() || 'PROD'}-BLK-M`, quantity: '10' }])}
                  style={{ fontSize: '11px', padding: '8px 16px' }}
                >
                  <Plus size={13} /> Add Single Row
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* STEP 5: REVIEW & PUBLISH */}
      {step === 5 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
          {/* Left: Storefront Preview Card */}
          <section className="admin-table-card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <span className="section-kicker" style={{ margin: 0 }}>STOREFRONT LIVE PREVIEW</span>
              <span className="status-pill pending" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                Pending Review
              </span>
            </div>

            <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '26px', margin: '6px 0 10px', letterSpacing: '-0.3px' }}>
              {name || 'Untitled Piece'}
            </h2>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
              <span style={{ fontSize: '11px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '2px' }}>
                {selectedCategory?.name || 'Uncategorized'}
              </span>
              <span style={{ fontSize: '11px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '2px' }}>
                {shippingMethod === 'custom' ? `Custom Shipping ${money(Number(customDeliveryCharge || 0))}` : `${weight}g Standard Weight`}
              </span>
            </div>

            {/* Return Policy Badge in Preview */}
            <div style={{ marginBottom: '18px' }}>
              <span className={`product-trust-badge ${isReturnable ? 'returnable' : 'non-returnable'}`} style={{ display: 'inline-flex', padding: '5px 12px', fontSize: '11.5px' }}>
                <RotateCcw size={13} />
                <span>
                  {isReturnable
                    ? `${returnWindowDays}-Day Returns & Exchanges`
                    : 'Final Sale — Non-Returnable'}
                </span>
              </span>
              {isReturnable && returnPolicyNotes && (
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px', fontStyle: 'italic' }}>
                  Note: {returnPolicyNotes}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', marginBottom: '20px' }}>
              <strong style={{ fontSize: '24px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>
                {money(Number(price || 0))}
              </strong>
              {compareAtPrice && Number(compareAtPrice) > Number(price) && (
                <>
                  <del style={{ color: 'var(--muted)', fontSize: '15px' }}>
                    {money(Number(compareAtPrice))}
                  </del>
                  <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                    ({discountPercent}% OFF)
                  </span>
                </>
              )}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', margin: '0 0 6px' }}>
                Editorial Description
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                {description || 'No description added.'}
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)', margin: '0 0 10px' }}>
                Variants & Inventory Allocation ({variants.length})
              </h3>
              <div style={{ display: 'grid', gap: '6px', borderTop: '1px solid var(--border)' }}>
                {variants.map(variant => (
                  <div
                    key={`${variant.sku}-${variant.size}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid var(--border)',
                      padding: '8px 0',
                      fontSize: '12px'
                    }}
                  >
                    <span>
                      <strong>{variant.size}</strong> &middot; {variant.colour} <span style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>({variant.sku})</span>
                    </span>
                    <strong>{variant.quantity} in stock</strong>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right: Verification & Imagery Reel with Dynamic Aspect Ratio */}
          <div style={{ display: 'grid', gap: '20px' }}>
            <section className="admin-table-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="section-kicker" style={{ margin: 0 }}>PICTURE OVERVIEW</span>
                {previewRatio && (
                  <span style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.5px' }}>
                    Ratio: {previewRatio > 1.2 ? 'Landscape' : previewRatio < 0.85 ? 'Portrait' : 'Square'} ({previewRatio.toFixed(2)})
                  </span>
                )}
              </div>

              {images[0] ? (
                <div style={{
                  aspectRatio: previewRatio ? `${previewRatio}` : '3/4',
                  maxHeight: '520px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: '#f8f8f8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'aspect-ratio 0.3s ease',
                  borderRadius: '2px',
                  border: '1px solid var(--border)'
                }}>
                  <img
                    src={images[0].url}
                    alt={`${name} cover preview`}
                    onLoad={e => {
                      const img = e.currentTarget
                      if (img.naturalWidth && img.naturalHeight) {
                        setPreviewRatio(img.naturalWidth / img.naturalHeight)
                      }
                    }}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      right: '8px',
                      background: 'rgba(0,0,0,0.65)',
                      backdropFilter: 'blur(4px)',
                      color: '#fff',
                      padding: '6px 10px',
                      fontSize: '10px',
                      borderRadius: '2px',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span>Primary Photo</span>
                    <span>{images.length} total images</span>
                  </div>
                </div>
              ) : (
                <div style={{ aspectRatio: '3/4', background: 'var(--surface-subtle)', display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: '12px' }}>
                  No cover image uploaded
                </div>
              )}
            </section>

            {/* Submission Readiness Checklist */}
            <section className="admin-table-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={16} color="var(--ink)" />
                <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Readiness Checklist</h3>
              </div>

              <div style={{ display: 'grid', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: name && slug ? '#15803d' : '#9a3412' }}>
                  <CheckCircle2 size={13} /> Name & URL configured
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: categoryId ? '#15803d' : '#9a3412' }}>
                  <CheckCircle2 size={13} /> Department assigned
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: images.length > 0 ? '#15803d' : '#9a3412' }}>
                  <CheckCircle2 size={13} /> {images.length} photography assets ready
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: numPrice > 0 ? '#15803d' : '#9a3412' }}>
                  <CheckCircle2 size={13} /> Selling price set ({money(numPrice)})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: variants.length > 0 ? '#15803d' : '#9a3412' }}>
                  <CheckCircle2 size={13} /> {variants.length} variations ({totalStock} total units)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d' }}>
                  <CheckCircle2 size={13} /> Return Policy: {isReturnable ? `${returnWindowDays}-Day Returns` : 'Final Sale'}
                </div>
              </div>

              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.45, borderRadius: '2px' }}>
                Submissions are reviewed by SENO quality team within 24–48 hours. Once approved, the piece goes live immediately.
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Sticky Bottom Navigation Footer */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          gap: '12px', 
          flexWrap: 'wrap', 
          position: 'sticky', 
          bottom: 0, 
          padding: '16px 20px', 
          background: 'var(--surface)', 
          borderTop: '1px solid var(--border)',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
          zIndex: 10
        }}
      >
        <button 
          type="button" 
          className="button button-outline" 
          disabled={step === 1} 
          onClick={() => setStep((step - 1) as Step)}
          style={{ padding: '10px 18px', fontSize: '11px', opacity: step === 1 ? 0.4 : 1 }}
        >
          <ArrowLeft size={13} /> Back
        </button>

        <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '0.5px' }}>
          Step {step} of 5 &middot; <strong style={{ color: 'var(--ink)' }}>{stepsList[step - 1].title}</strong>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {step < 5 ? (
            <button 
              type="button" 
              className="button button-primary" 
              onClick={() => goTo((step + 1) as Step)}
              style={{ padding: '10px 22px', fontSize: '11px' }}
            >
              Continue <ArrowRight size={13} />
            </button>
          ) : (
            <>
              <button 
                type="button" 
                className="button button-outline" 
                disabled={pending} 
                onClick={() => submit(false)}
                style={{ padding: '10px 20px', fontSize: '11px' }}
              >
                {pending ? <Loader2 size={13} className="spin" /> : 'Save as Draft'}
              </button>
              
              <button 
                type="button" 
                className="button button-primary" 
                disabled={pending} 
                onClick={() => submit(true)}
                style={{ padding: '10px 24px', fontSize: '11px' }}
              >
                {pending ? (
                  <>
                    <Loader2 size={13} className="spin" /> {initialData?.approval_status === 'approved' ? 'Saving...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Check size={13} /> {initialData?.approval_status === 'approved' ? 'Save Changes' : 'Submit for Review'}
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
