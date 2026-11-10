'use client'

import React, { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  ArrowRight,
  Plus, 
  Trash2, 
  Upload, 
  Star, 
  Check, 
  AlertCircle, 
  AlertTriangle,
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
  ShieldCheck,
  CheckCircle2,
  Truck,
  X
} from 'lucide-react'
import { 
  createAdminProduct, 
  updateAdminProduct, 
  generateUniqueSlug,
  AdminProductImage,
  AdminProductVariant 
} from '@/lib/adminCatalog'
import { money, parseReturnPolicy } from '@/lib/catalog'
import { extractColourImagesFromDetails } from '@/lib/colours'
import { ProductColoursManager } from '@/components/ProductColoursManager'
import { 
  FREE_SIZE_CANONICAL, 
  FREE_SIZE_UPPER, 
  STANDARD_SIZES, 
  isFreeSize, 
  formatSizeDisplay, 
  getSizeSkuSegment 
} from '@/lib/variants-shared'
import { normalizeDeliveryDays, calculateExpectedDeliveryDate, formatDeliveryByDate } from '@/lib/deliveryDate'

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

type StepTab = 'basics' | 'media' | 'pricing' | 'variants' | 'delivery' | 'review'

interface ProductEditorFormProps {
  initialData?: any
  categories: any[]
  collections: any[]
  mode: 'create' | 'edit'
}

export function ProductEditorForm({ initialData, categories, collections, mode }: ProductEditorFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const isSubmittingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [activeTab, setActiveTab] = useState<StepTab>('basics')

  // Auto-dismiss toast after 5 seconds
  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      setToast(null)
    }, 5000)
    return () => clearTimeout(timer)
  }, [toast])

  const categoryOptions = initialData?.categories?.id && !categories.some(category => category.id === initialData.categories.id)
    ? [...categories, { ...initialData.categories, isLegacy: true }]
    : categories

  // Step 1: Product Basic Information
  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [details, setDetails] = useState<string[]>(
    Array.isArray(initialData?.details) && initialData.details.length > 0 
      ? initialData.details.filter((d: any) => typeof d === 'string' && !d.toLowerCase().startsWith('return policy:'))
      : ['100% Premium Cotton', 'Pre-shrunk finish', 'Dry clean or gentle hand wash']
  )
  const [newDetailText, setNewDetailText] = useState('')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || categoryOptions[0]?.id || '')
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(
    initialData?.collection_ids || []
  )

  // Step 2: Media
  const [images, setImages] = useState<AdminProductImage[]>(
    initialData?.images && initialData.images.length > 0 
      ? initialData.images 
      : []
  )
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Step 3: Pricing & Return Policy
  const [price, setPrice] = useState<number | string>(initialData?.price ?? '')
  const [compareAtPrice, setCompareAtPrice] = useState<number | string>(initialData?.compare_at_price ?? '')
  const initialRp = parseReturnPolicy(initialData?.details)
  const [isReturnable, setIsReturnable] = useState<boolean>(initialRp.isReturnable)
  const [returnWindowDays, setReturnWindowDays] = useState<number>(initialRp.returnWindowDays || 14)
  const [returnPolicyNotes, setReturnPolicyNotes] = useState<string>(initialRp.returnPolicyNotes || '')

  // Step 4: Colours & Variants
  const initialColourHexes = initialData?.colour_hexes || extractColourImagesFromDetails(initialData?.details).colourHexes || {}
  const [colourHexes, setColourHexes] = useState<Record<string, string>>(initialColourHexes)
  const [variants, setVariants] = useState<AdminProductVariant[]>(
    initialData?.variants && initialData.variants.length > 0
      ? initialData.variants
      : []
  )
  const [matrixSizes, setMatrixSizes] = useState('S, M, L, XL')
  const [matrixColours, setMatrixColours] = useState('')
  const [matrixInitialStock, setMatrixInitialStock] = useState(10)

  // Step 5: Shipping & Merchandising Attributes
  const [defaultWeightGrams, setDefaultWeightGrams] = useState<number>(
    initialData?.default_weight_grams || 500
  )
  const [shippingMethod, setShippingMethod] = useState<'weight_based' | 'custom'>(initialData?.shipping_method === 'custom' ? 'custom' : 'weight_based')
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState<number | string>(initialData?.custom_delivery_charge ?? '')
  const [expectedDeliveryDays, setExpectedDeliveryDays] = useState<number | string>(
    initialData?.expected_delivery_days ?? 7
  )
  const [isActive, setIsActive] = useState<boolean>(initialData?.is_active !== undefined ? initialData.is_active : true)
  const [isNew, setIsNew] = useState<boolean>(initialData?.is_new !== undefined ? initialData.is_new : true)
  const [isBestseller, setIsBestseller] = useState<boolean>(initialData?.is_bestseller || false)
  const [isFeatured, setIsFeatured] = useState<boolean>(initialData?.is_featured || false)

  // Derived Calculations
  const numPrice = Number(price) || 0
  const numCompareAt = Number(compareAtPrice) || 0
  const hasValidDiscount = numCompareAt > numPrice && numPrice > 0
  const discountAmount = hasValidDiscount ? numCompareAt - numPrice : 0
  const discountPercentage = hasValidDiscount ? Math.round((discountAmount / numCompareAt) * 100) : 0
  const totalStock = variants.reduce((sum, v) => sum + (Number(v.quantity) || 0), 0)
  const selectedCategory = categoryOptions.find((c: any) => c.id === categoryId)

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
      setIsDirty(true)
    } catch (err: any) {
      setError(`Upload error: ${err.message}`)
    } finally {
      setUploadingImage(false)
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
    setIsDirty(true)
  }

  const handleSetPrimaryImage = (index: number) => {
    setImages(images.map((img, idx) => ({
      ...img,
      is_primary: idx === index
    })))
    setIsDirty(true)
  }

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === images.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const copy = [...images]
    const temp = copy[index]
    copy[index] = copy[targetIndex]
    copy[targetIndex] = temp

    const updated = copy.map((img, idx) => ({ ...img, display_order: idx }))
    setImages(updated)
    setIsDirty(true)
  }

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, idx) => idx !== index).map((img, idx) => ({
      ...img,
      display_order: idx,
      is_primary: img.is_primary && idx === 0 ? true : img.is_primary
    }))
    if (updated.length > 0 && !updated.some(img => img.is_primary)) {
      updated[0].is_primary = true
    }
    setImages(updated)
    setIsDirty(true)
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
        const existing = variants.find(v =>
          (v.size || '').trim().toLowerCase() === s.toLowerCase() &&
          (v.colour || '').trim().toLowerCase() === c.toLowerCase()
        )
        const sizeSkuSeg = getSizeSkuSegment(s)
        const colourSkuSeg = toClientSlug(c).toUpperCase().slice(0, 3) || 'COL'
        const sku = existing?.sku || `SENO-${currentBaseSlug.slice(0, 4)}-${sizeSkuSeg}-${colourSkuSeg}`
        newVariants.push({
          id: existing?.id,
          size: isFreeSize(s) ? FREE_SIZE_CANONICAL : s,
          colour: c,
          sku,
          quantity: existing ? existing.quantity : matrixInitialStock,
          is_active: true
        })
      }
    }

    setVariants(newVariants)
    setIsDirty(true)
  }

  const handleAddSingleVariant = () => {
    const currentBaseSlug = toClientSlug(slug || name || 'prod').toUpperCase()
    const sku = `SENO-${currentBaseSlug.slice(0, 4)}-VAR-${variants.length + 1}`
    const existingColours = Array.from(new Set(variants.map(v => (v.colour || '').trim()).filter(Boolean)))
    const activeCol = existingColours[0] || ''
    setVariants([
      ...variants,
      {
        size: 'M',
        colour: activeCol,
        sku,
        quantity: 10,
        is_active: true
      }
    ])
    setIsDirty(true)
  }

  const handleAddFreeSizeVariant = () => {
    const currentBaseSlug = toClientSlug(slug || name || 'prod').toUpperCase()
    const sku = `SENO-${currentBaseSlug.slice(0, 4)}-FS-01`
    const existingColours = Array.from(new Set(variants.map(v => (v.colour || '').trim()).filter(Boolean)))
    const activeCol = existingColours[0] || ''
    setVariants([
      ...variants,
      {
        size: FREE_SIZE_CANONICAL,
        colour: activeCol,
        sku,
        quantity: 10,
        is_active: true
      }
    ])
    setIsDirty(true)
  }

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, idx) => idx !== index))
    setIsDirty(true)
  }

  const handleVariantChange = (index: number, field: keyof AdminProductVariant, value: any) => {
    setVariants(variants.map((v, idx) => {
      if (idx !== index) return v
      return { ...v, [field]: value }
    }))
    setIsDirty(true)
  }

  // Tab Validation Helper
  const validateCurrentTab = (tab = activeTab): boolean => {
    setError(null)
    setSuccess(null)
    if (tab === 'basics') {
      if (!name.trim()) {
        setError('Please provide a product title.')
        return false
      }
      if (!slug.trim()) {
        setError('Please provide a URL slug.')
        return false
      }
      if (!categoryId) {
        setError('Please select a primary department/category.')
        return false
      }
    } else if (tab === 'pricing') {
      if (price === '' || Number(price) < 0 || isNaN(Number(price))) {
        setError('Please provide a valid retail price.')
        return false
      }
    } else if (tab === 'variants') {
      if (variants.length === 0) {
        setError('Please configure at least one variant.')
        return false
      }
      const seenSkus = new Set<string>()
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i]
        const cleanSku = (v.sku || '').trim().toUpperCase()
        if (!cleanSku) {
          setError(`Variant #${i + 1} (${v.size || 'Size'} / ${v.colour || 'Colour'}) is missing an SKU.`)
          return false
        }
        if (seenSkus.has(cleanSku)) {
          setError(`Duplicate SKU "${cleanSku}" found. Every variant must have a unique SKU.`)
          return false
        }
        seenSkus.add(cleanSku)
        if (v.quantity === undefined || v.quantity === null || isNaN(Number(v.quantity)) || Number(v.quantity) < 0) {
          setError(`Variant #${i + 1} (${cleanSku}) must have a valid non-negative stock quantity.`)
          return false
        }
      }
    } else if (tab === 'delivery') {
      if (!defaultWeightGrams || Number(defaultWeightGrams) <= 0 || isNaN(Number(defaultWeightGrams))) {
        setError('Please provide a valid default shipping weight.')
        return false
      }
      if (shippingMethod === 'custom' && (customDeliveryCharge === '' || Number(customDeliveryCharge) < 0 || isNaN(Number(customDeliveryCharge)))) {
        setError('Please provide a valid custom delivery charge.')
        return false
      }
    }
    return true
  }

  // Pre-flight checks for Step 6 Review & Publish
  const preflightChecks = [
    {
      id: 'name_slug',
      step: 'basics' as StepTab,
      label: 'Piece title and URL slug',
      passed: Boolean(name.trim() && slug.trim()),
      fixLabel: 'Edit Basics'
    },
    {
      id: 'category',
      step: 'basics' as StepTab,
      label: 'Primary department assigned',
      passed: Boolean(categoryId),
      fixLabel: 'Select Category'
    },
    {
      id: 'images',
      step: 'media' as StepTab,
      label: images.length > 0 ? `${images.length} product photos ready` : 'Product photography added',
      passed: images.length > 0,
      fixLabel: 'Add Images'
    },
    {
      id: 'price',
      step: 'pricing' as StepTab,
      label: price !== '' && Number(price) > 0 ? `Retail price set to ₹${price}` : 'Valid retail price set',
      passed: price !== '' && Number(price) > 0 && !isNaN(Number(price)),
      fixLabel: 'Set Price'
    },
    {
      id: 'variants',
      step: 'variants' as StepTab,
      label: variants.length > 0 ? `${variants.length} variant combinations` : 'At least 1 variant configured',
      passed: variants.length > 0,
      fixLabel: 'Add Variants'
    },
    {
      id: 'skus',
      step: 'variants' as StepTab,
      label: 'Unique SKUs assigned',
      passed: variants.length > 0 && variants.every(v => (v.sku || '').trim().length > 0) && new Set(variants.map(v => (v.sku || '').trim().toUpperCase())).size === variants.length,
      fixLabel: 'Fix SKUs'
    },
    {
      id: 'stock',
      step: 'variants' as StepTab,
      label: 'Stock quantities non-negative',
      passed: variants.length > 0 && variants.every(v => v.quantity !== undefined && v.quantity !== null && !isNaN(Number(v.quantity)) && Number(v.quantity) >= 0),
      fixLabel: 'Review Stock'
    },
    {
      id: 'delivery',
      step: 'delivery' as StepTab,
      label: 'Shipping weight configured',
      passed: Boolean(defaultWeightGrams && Number(defaultWeightGrams) > 0 && (shippingMethod !== 'custom' || (customDeliveryCharge !== '' && Number(customDeliveryCharge) >= 0))),
      fixLabel: 'Configure Shipping'
    }
  ]

  // Explicit Final Save Action (Only trigger for persisting product)
  const handleExplicitSave = async (overrideActive?: boolean) => {
    if (isSubmittingRef.current || isPending) return
    isSubmittingRef.current = true
    setError(null)
    setSuccess(null)

    // 1. Validate Basic details
    if (!name.trim()) {
      setActiveTab('basics')
      setError('Please provide a product title.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    if (!slug.trim()) {
      setActiveTab('basics')
      setError('Please provide a URL slug.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    if (!categoryId) {
      setActiveTab('basics')
      setError('Please select a primary department/category.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    // 2. Validate Pricing
    if (price === '' || Number(price) < 0 || isNaN(Number(price))) {
      setActiveTab('pricing')
      setError('Please provide a valid retail price.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    // 3. Validate Variants & Stock
    if (variants.length === 0) {
      setActiveTab('variants')
      setError('Please configure at least one variant.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    const seenSkus = new Set<string>()
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      const cleanSku = (v.sku || '').trim().toUpperCase()
      if (!cleanSku) {
        setActiveTab('variants')
        setError(`Variant #${i + 1} (${v.size || 'Size'} / ${v.colour || 'Colour'}) is missing an SKU.`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        isSubmittingRef.current = false
        return
      }
      if (seenSkus.has(cleanSku)) {
        setActiveTab('variants')
        setError(`Duplicate SKU "${cleanSku}" found. Every variant must have a unique SKU.`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        isSubmittingRef.current = false
        return
      }
      seenSkus.add(cleanSku)

      if (v.quantity === undefined || v.quantity === null || isNaN(Number(v.quantity)) || Number(v.quantity) < 0) {
        setActiveTab('variants')
        setError(`Variant #${i + 1} (${cleanSku}) must have a valid non-negative stock quantity.`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        isSubmittingRef.current = false
        return
      }
    }

    // 4. Validate Delivery
    if (!defaultWeightGrams || Number(defaultWeightGrams) <= 0 || isNaN(Number(defaultWeightGrams))) {
      setActiveTab('delivery')
      setError('Please provide a valid default shipping weight.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    if (shippingMethod === 'custom' && (customDeliveryCharge === '' || Number(customDeliveryCharge) < 0 || isNaN(Number(customDeliveryCharge)))) {
      setActiveTab('delivery')
      setError('Please provide a valid custom delivery charge.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      isSubmittingRef.current = false
      return
    }

    const effectiveActive = overrideActive !== undefined ? overrideActive : isActive

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
          expected_delivery_days: normalizeDeliveryDays(expectedDeliveryDays),
          return_policy: {
            is_returnable: isReturnable,
            return_window_days: isReturnable ? Number(returnWindowDays) : 0,
            notes: returnPolicyNotes
          },
          is_featured: isFeatured,
          is_new: isNew,
          is_bestseller: isBestseller,
          is_active: effectiveActive,
          colour_hexes: colourHexes,
          images,
          variants
        }

        if (mode === 'create') {
          const res = await createAdminProduct(payload)
          setIsDirty(false)
          setSuccess(`Product "${name}" successfully created!`)
          setToast({
            type: 'success',
            message: 'Product changes saved successfully.',
            details: `"${name}" published with ${variants.length} variant${variants.length === 1 ? '' : 's'}.`
          })
          if (res?.product?.id) {
            router.push(`/admin/products/${res.product.id}/edit`)
          } else {
            setTimeout(() => {
              router.push('/admin/products')
            }, 1200)
          }
        } else {
          await updateAdminProduct(initialData.id, { ...payload, id: initialData.id })
          setIsDirty(false)
          setSuccess('Product changes saved successfully.')
          setToast({
            type: 'success',
            message: 'Product changes saved successfully.',
            details: 'Colour variants, photos, and inventory synchronized with database.'
          })
          router.refresh()
        }
      } catch (err: any) {
        console.error('Submit error:', err)
        const errMsg = err.message || 'An error occurred while saving the product.'
        setError(errMsg)
        setToast({
          type: 'error',
          message: 'Unable to save product changes.',
          details: errMsg
        })
      } finally {
        isSubmittingRef.current = false
      }
    })
  }

  const tabOrder: StepTab[] = ['basics', 'media', 'pricing', 'variants', 'delivery', 'review']
  const currentStepIndex = tabOrder.indexOf(activeTab)

  const goToNextTab = () => {
    if (!validateCurrentTab()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (currentStepIndex < tabOrder.length - 1) {
      setActiveTab(tabOrder[currentStepIndex + 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const goToPrevTab = () => {
    if (currentStepIndex > 0) {
      setActiveTab(tabOrder[currentStepIndex - 1])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const TABS_CONFIG: { id: StepTab; label: string; stepNumber: number; icon: any; summary: string }[] = [
    { id: 'basics', label: 'Basic Info', stepNumber: 1, icon: Package, summary: name || 'Title & Category' },
    { id: 'media', label: 'Media & Visuals', stepNumber: 2, icon: ImageIcon, summary: `${images.length} photos` },
    { id: 'pricing', label: 'Pricing & Policy', stepNumber: 3, icon: DollarSign, summary: price ? `₹${price}` : 'Set retail price' },
    { id: 'variants', label: 'Colours & Variants', stepNumber: 4, icon: Layers, summary: `${variants.length} variants` },
    { id: 'delivery', label: 'Shipping & Flags', stepNumber: 5, icon: Tag, summary: `${defaultWeightGrams}g` },
    { id: 'review', label: 'Review & Publish', stepNumber: 6, icon: Sparkles, summary: 'Storefront preview' }
  ]

  return (
    <div className="product-editor-page">
      {/* Top Header */}
      <div className="admin-editor-top-bar">
        <div className="admin-editor-top-bar-info">
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
            6-step guided luxury catalog workflow: metadata, photography, pricing, size variants, delivery, and review
          </p>
        </div>

        <div className="admin-editor-top-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleExplicitSave()}
            className="dark-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              padding: '8px 14px',
              minHeight: '34px',
              opacity: isPending ? 0.7 : 1
            }}
          >
            {isPending ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={12} />
                <span>{mode === 'create' ? 'Publish Piece' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
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

      {/* 6-Step Tabs Navigation */}
      <div className="admin-form-tabs" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '24px' }}>
        {TABS_CONFIG.map(tab => {
          const Icon = tab.icon
          const isActiveTab = activeTab === tab.id
          const tabIndex = tabOrder.indexOf(tab.id)
          const isCompleted = tabIndex < currentStepIndex

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const targetIndex = tabOrder.indexOf(tab.id)
                if (targetIndex > currentStepIndex) {
                  if (!validateCurrentTab()) {
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                    return
                  }
                }
                setActiveTab(tab.id)
              }}
              className={`admin-form-tab-btn ${isActiveTab ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                border: isActiveTab ? '2px solid var(--ink)' : '1px solid var(--border)',
                background: isActiveTab ? 'var(--surface-subtle)' : '#fff',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                background: isActiveTab ? 'var(--ink)' : isCompleted ? '#15803d' : 'var(--border)',
                color: isActiveTab || isCompleted ? '#fff' : 'var(--muted)',
                flexShrink: 0
              }}>
                {isCompleted ? <Check size={12} strokeWidth={2.5} /> : tab.stepNumber}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: isActiveTab ? 600 : 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.label}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tab.summary}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
        onChange={() => setIsDirty(true)}
      >
        {/* STEP 1: BASIC INFORMATION */}
        {activeTab === 'basics' && (
          <div className="admin-form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Step 1: Piece Identification & Classification</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Name, canonical storefront URL, category, collections, and editorial storytelling.
                </p>
              </div>
              <span style={{ fontSize: '11px', background: 'var(--surface-subtle)', padding: '4px 8px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                Required Fields *
              </span>
            </div>
            
            <div className="admin-form-two-col">
              <div className="admin-form-field">
                <label className="admin-form-label">
                  Product Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Minimalist Wool Overcoat"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => { if (!slug) handleAutoSlug() }}
                  required
                  className="admin-form-input"
                />
              </div>

              <div className="admin-form-field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="admin-form-label" style={{ marginBottom: 0 }}>
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
                  className="admin-form-input"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
            </div>

            <div className="admin-form-two-col" style={{ marginTop: '16px' }}>
              <div className="admin-form-field">
                <label className="admin-form-label">
                  Primary Department / Category *
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  className="admin-form-select"
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}{c.isLegacy ? ' (Legacy - review)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label-muted">
                  Curated Collections (Multi-select)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {collections.map((coll: any) => {
                    const isSelected = selectedCollectionIds.includes(coll.id)
                    return (
                      <label
                        key={coll.id}
                        style={{
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid var(--ink)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--ink)' : '#fff',
                          color: isSelected ? '#fff' : 'var(--ink)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
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
            </div>

            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <label className="admin-form-label">
                Editorial Description
              </label>
              <textarea
                rows={4}
                placeholder="Narrative craft notes, tailoring silhouette, provenance, and material composition..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="admin-form-textarea"
                style={{ lineHeight: '1.6', resize: 'vertical' }}
              />
            </div>

            <div>
              <label className="admin-form-label">
                Garment Details & Specifications (Bullet Points)
              </label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="e.g. 100% Japanese Selvedge Wool, horn buttons, custom cupro lining..."
                  value={newDetailText}
                  onChange={e => setNewDetailText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDetail() } }}
                  className="admin-form-input"
                  style={{ flex: 1, minWidth: 0, minHeight: '40px' }}
                />
                <button
                  type="button"
                  onClick={handleAddDetail}
                  className="outline-btn"
                  style={{ padding: '8px 16px', fontSize: '11px', minHeight: '40px', flexShrink: 0 }}
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

            {/* Quick Merchandising Tags */}
            <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--border)' }}>
              <label className="admin-form-label" style={{ display: 'block', marginBottom: '8px' }}>Storefront Merchandising Badges</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px', background: isBestseller ? '#fffbf2' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={e => setIsBestseller(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block', color: isBestseller ? '#b45309' : 'inherit' }}>⭐ Bestseller</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Shows in Bestsellers slider & collection</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={e => setIsNew(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>New Arrival</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Shows "NEW" badge & in New Arrivals</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>Featured Piece</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Promoted on storefront collections</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: MEDIA & VISUALS */}
        {activeTab === 'media' && (
          <div className="admin-form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Step 2: Photography & Visual Assets</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Upload high-resolution editorial photography. Mark the primary cover shot and arrange display sequence.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <label className="dark-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', minHeight: '38px', padding: '0 16px' }}>
                  <Upload size={13} />
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Photos'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    disabled={uploadingImage}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Upload Guidelines Callout */}
            <div style={{ padding: '14px 18px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px', marginBottom: '20px', fontSize: '11.5px', color: 'var(--muted)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div>
                <strong style={{ color: 'var(--ink)' }}>Aspect Ratio:</strong> 3:4 portrait or 4:5 editorial format recommended for luxury layout.
              </div>
              <div>
                <strong style={{ color: 'var(--ink)' }}>Format:</strong> WebP, JPG, or PNG (max 5MB per image).
              </div>
              <div>
                <strong style={{ color: 'var(--ink)' }}>Cover Photo:</strong> The first starred photo will be used for product cards & social sharing.
              </div>
            </div>

            {/* Image URL Input */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
              <input
                type="url"
                placeholder="Or paste an image URL (e.g. https://...)"
                value={imageUrlInput}
                onChange={e => setImageUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddImageUrl() } }}
                className="admin-form-input"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="outline-btn"
                style={{ padding: '8px 16px', fontSize: '11px', minHeight: '40px' }}
              >
                Add URL
              </button>
            </div>

            {/* Images Grid */}
            {images.length === 0 ? (
              <div style={{ border: '2px dashed var(--border)', padding: '48px 24px', textAlign: 'center', borderRadius: '4px', background: 'var(--surface-subtle)' }}>
                <ImageIcon size={36} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 600 }}>No photography assets yet</h4>
                <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--muted)' }}>
                  Upload piece photography or paste public image URLs to bring this luxury product to life.
                </p>
                <label className="outline-btn" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '8px 16px' }}>
                  <Upload size={13} />
                  <span>Choose Image Files</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                {images.map((img, idx) => (
                  <div
                    key={img.url + idx}
                    style={{
                      border: img.is_primary ? '2px solid var(--ink)' : '1px solid var(--border)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#fff',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ aspectRatio: '3/4', position: 'relative', background: '#f5f5f5' }}>
                      <img
                        src={img.url}
                        alt={img.alt_text || `Product image ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {img.is_primary && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: 'var(--ink)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '2px',
                          letterSpacing: '0.5px'
                        }}>
                          COVER PHOTO
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        title="Set as Cover Photo"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: img.is_primary ? '#eab308' : 'var(--muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px'
                        }}
                      >
                        <Star size={14} fill={img.is_primary ? '#eab308' : 'none'} />
                        <span style={{ fontSize: '10px' }}>{img.is_primary ? 'Cover' : 'Set Cover'}</span>
                      </button>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'up')}
                          style={{ background: 'none', border: 'none', color: idx === 0 ? '#d1d5db' : 'var(--ink)', cursor: idx === 0 ? 'default' : 'pointer', padding: '4px' }}
                          title="Move left"
                        >
                          <ChevronUp size={14} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => handleMoveImage(idx, 'down')}
                          style={{ background: 'none', border: 'none', color: idx === images.length - 1 ? '#d1d5db' : 'var(--ink)', cursor: idx === images.length - 1 ? 'default' : 'pointer', padding: '4px' }}
                          title="Move right"
                        >
                          <ChevronDown size={14} style={{ transform: 'rotate(-90deg)' }} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Remove photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: PRICING & POLICIES */}
        {activeTab === 'pricing' && (
          <div className="admin-form-card">
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Step 3: Pricing, Markdown & Customer Return Policy</h3>
            
            <div className="admin-form-two-col">
              <div className="admin-form-field">
                <label className="admin-form-label">
                  Retail Selling Price (₹ INR) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 12900"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  min={0}
                  required
                  className="admin-form-input"
                  style={{ fontSize: '14px', fontWeight: 600 }}
                />
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label-muted">
                  Compare-at Original MRP (₹ INR Strikethrough)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 15900"
                  value={compareAtPrice}
                  onChange={e => setCompareAtPrice(e.target.value)}
                  min={0}
                  className="admin-form-input"
                  style={{ fontSize: '14px' }}
                />
              </div>
            </div>

            {/* Live Discount & Savings Preview Callout */}
            <div style={{
              padding: '16px 20px',
              borderRadius: '4px',
              border: hasValidDiscount ? '1px solid #bbf7d0' : '1px solid var(--border)',
              background: hasValidDiscount ? '#f0fdf4' : 'var(--surface-subtle)',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--muted)', fontWeight: 600 }}>
                  Storefront Discount & Savings Preview
                </div>
                {hasValidDiscount ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>
                      {money(numPrice)}
                    </span>
                    <del style={{ fontSize: '14px', color: 'var(--muted)' }}>
                      {money(numCompareAt)}
                    </del>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#15803d', color: '#fff', padding: '3px 8px', borderRadius: '2px', letterSpacing: '0.3px' }}>
                      {discountPercentage}% OFF
                    </span>
                    <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                      Customer saves {money(discountAmount)}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                    {numPrice > 0 
                      ? `Standard price: ${money(numPrice)}. Add an MRP higher than retail price to show a strikethrough markdown & discount badge.`
                      : 'Set a retail price above to preview customer pricing.'}
                  </div>
                )}
              </div>

              {hasValidDiscount && (
                <div style={{ fontSize: '11px', color: '#15803d', background: '#dcfce7', padding: '6px 12px', borderRadius: '2px', fontWeight: 500 }}>
                  ✓ Valid discount badge active on storefront
                </div>
              )}
            </div>

            {/* Return & Exchange Policy */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <RotateCcw size={15} color="var(--ink)" />
                <label className="admin-form-label" style={{ margin: 0 }}>
                  Customer Return & Exchange Policy
                </label>
              </div>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: 'var(--muted)' }}>
                Define if this piece is eligible for customer returns and configure the return window shown on the product page.
              </p>

              <div className="admin-return-policy-options" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px', marginBottom: '16px' }}>
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
                    <label className="admin-form-label">
                      Return Window Duration (Days)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                      {[7, 10, 14, 30].map(days => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setReturnWindowDays(days)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: returnWindowDays === days ? '1px solid var(--ink)' : '1px solid var(--border)',
                            background: returnWindowDays === days ? 'var(--ink)' : '#fff',
                            color: returnWindowDays === days ? '#fff' : 'var(--ink)',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            minHeight: '36px'
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
                      className="admin-form-input"
                      style={{ maxWidth: '180px', background: '#fff' }}
                      placeholder="e.g. 14"
                    />
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                      Shoppers will see &ldquo;{returnWindowDays}-Day Returns & Exchanges&rdquo; prominently on this product page.
                    </div>
                  </div>

                  <div>
                    <label className="admin-form-label-muted">
                      Custom Policy Terms / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={returnPolicyNotes}
                      onChange={e => setReturnPolicyNotes(e.target.value)}
                      placeholder="e.g. Must be in pristine condition with original tags and protective packaging."
                      className="admin-form-input"
                      style={{ background: '#fff' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: COLOURS, SIZES & VARIANTS */}
        {activeTab === 'variants' && (
          <div className="admin-form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Step 4: Colours, Sizes & Inventory Allocation</h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Manage colours, Free Size or standard sizes (XS–XXL), unique SKUs, and stock per colour variant.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleAddFreeSizeVariant}
                  className="outline-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', minHeight: '38px', background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}
                >
                  <Plus size={13} /> Add Free Size Variant
                </button>
                <button
                  type="button"
                  onClick={handleAddSingleVariant}
                  className="outline-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', minHeight: '38px' }}
                >
                  <Plus size={13} /> Add Standard Variant
                </button>
              </div>
            </div>

            {/* Integrated Product Colours Manager */}
            <div style={{ marginBottom: '28px' }}>
              <ProductColoursManager
                images={images}
                setImages={setImages}
                variants={variants}
                setVariants={setVariants}
                colourHexes={colourHexes}
                setColourHexes={setColourHexes}
                productSlug={slug}
                productName={name}
                basePrice={price}
                setIsDirty={setIsDirty}
                onUploadFile={async (file: File) => {
                  const fd = new FormData()
                  fd.append('file', file)
                  const res = await fetch('/api/admin/upload-image', {
                    method: 'POST',
                    body: fd
                  })
                  const data = await res.json()
                  if (!res.ok || data.error) {
                    return { url: '', error: data.error || 'Upload failed' }
                  }
                  return { url: data.url }
                }}
              />
            </div>

            {/* Quick Matrix Generator */}
            <div style={{
              background: 'var(--surface-subtle)',
              border: '1px solid var(--border)',
              padding: '16px',
              borderRadius: '4px',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '13px' }}>Quick Matrix Combinations Generator</strong>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Generates colour × size grid with unique SKUs</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="admin-form-label-muted" style={{ marginBottom: '4px' }}>Sizes (comma-separated)</label>
                  <input
                    type="text"
                    value={matrixSizes}
                    onChange={e => setMatrixSizes(e.target.value)}
                    placeholder="e.g. Free Size OR S, M, L, XL"
                    className="admin-form-input"
                    style={{ fontSize: '12px' }}
                  />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setMatrixSizes('Free Size')}
                      style={{ fontSize: '10px', padding: '2px 8px', border: '1px solid #d97706', background: '#fef3c7', color: '#92400e', borderRadius: '2px', cursor: 'pointer' }}
                    >
                      ✦ Set Free Size
                    </button>
                    <button
                      type="button"
                      onClick={() => setMatrixSizes('S, M, L, XL')}
                      style={{ fontSize: '10px', padding: '2px 8px', border: '1px solid var(--border)', background: '#fff', color: 'var(--ink)', borderRadius: '2px', cursor: 'pointer' }}
                    >
                      Standard S–XL
                    </button>
                  </div>
                </div>

                <div>
                  <label className="admin-form-label-muted" style={{ marginBottom: '4px' }}>Colours (comma-separated)</label>
                  <input
                    type="text"
                    value={matrixColours}
                    onChange={e => setMatrixColours(e.target.value)}
                    placeholder="e.g. Black, Washed Navy, Olive"
                    className="admin-form-input"
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label className="admin-form-label-muted" style={{ marginBottom: '4px' }}>Initial Stock / Variant</label>
                  <input
                    type="number"
                    min={0}
                    value={matrixInitialStock}
                    onChange={e => setMatrixInitialStock(Number(e.target.value))}
                    className="admin-form-input"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateMatrix}
                className="outline-btn"
                style={{ fontSize: '11px', padding: '6px 14px' }}
              >
                Generate Matrix Combinations
              </button>
            </div>

            {/* Variant Cards / Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <strong style={{ fontSize: '13px' }}>
                  Configured Variants ({variants.length}) &middot; Total Stock: {totalStock} units
                </strong>
              </div>

              {variants.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--muted)', fontSize: '13px' }}>
                  No variants configured. Click "Add Free Size Variant" or "Add Standard Variant" above.
                </div>
              ) : (
                <div className="admin-variant-grid" style={{ display: 'grid', gap: '10px' }}>
                  {variants.map((v, idx) => {
                    const isFs = isFreeSize(v.size)
                    return (
                      <div
                        key={idx}
                        className="admin-variant-card"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr 1fr 1.5fr 1fr 1fr auto',
                          gap: '12px',
                          alignItems: 'center',
                          padding: '12px 16px',
                          background: '#fff',
                          border: '1px solid var(--border)',
                          borderRadius: '3px'
                        }}
                      >
                        <span style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>#{idx + 1}</span>

                        <div>
                          <label className="admin-variant-field-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Size</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="text"
                              value={v.size}
                              onChange={e => handleVariantChange(idx, 'size', e.target.value)}
                              className="admin-variant-input"
                              style={{ width: '90px', fontSize: '12px', fontWeight: 600 }}
                            />
                            {isFs && (
                              <span style={{ fontSize: '9px', background: '#fef3c7', color: '#92400e', padding: '2px 5px', borderRadius: '2px', fontWeight: 700 }}>
                                FREE SIZE
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="admin-variant-field-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Colour</label>
                          <input
                            type="text"
                            value={v.colour}
                            onChange={e => handleVariantChange(idx, 'colour', e.target.value)}
                            placeholder="e.g. Black"
                            className="admin-variant-input"
                            style={{ fontSize: '12px' }}
                          />
                        </div>

                        <div>
                          <label className="admin-variant-field-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>SKU (Unique) *</label>
                          <input
                            type="text"
                            value={v.sku}
                            onChange={e => handleVariantChange(idx, 'sku', e.target.value)}
                            placeholder="e.g. SENO-FS-BLK"
                            className="admin-variant-input sku-input"
                            style={{ fontSize: '12px', fontFamily: 'monospace' }}
                          />
                        </div>

                        <div>
                          <label className="admin-variant-field-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Stock Qty *</label>
                          <input
                            type="number"
                            min={0}
                            value={v.quantity}
                            onChange={e => handleVariantChange(idx, 'quantity', Number(e.target.value))}
                            className={`admin-variant-input ${v.quantity === 0 ? 'stock-zero' : ''}`}
                            style={{ fontSize: '12px' }}
                          />
                        </div>

                        <div>
                          <label className="admin-variant-field-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '2px' }}>Price Override (₹)</label>
                          <input
                            type="number"
                            min={0}
                            value={v.price_override ?? ''}
                            onChange={e => handleVariantChange(idx, 'price_override', e.target.value ? Number(e.target.value) : null)}
                            placeholder="Default"
                            className="admin-variant-input"
                            style={{ fontSize: '12px' }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveVariant(idx)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                          title="Remove variant"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: SHIPPING & ATTRIBUTES */}
        {activeTab === 'delivery' && (
          <div className="admin-form-card">
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600 }}>Step 5: Shipping, Weight & Merchandising Flags</h3>
            
            <div className="admin-form-two-col">
              <div className="admin-form-field">
                <label className="admin-form-label">
                  Default Shipping Weight (Grams) *
                </label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  value={defaultWeightGrams}
                  onChange={e => setDefaultWeightGrams(Number(e.target.value))}
                  min={50}
                  required
                  className="admin-form-input"
                />
                <span style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', display: 'block' }}>
                  Used to compute automatic tiered shipping rates at checkout.
                </span>
              </div>

              <div className="admin-form-field">
                <label className="admin-form-label">Delivery Calculation Method</label>
                <div style={{ display: 'grid', gap: '10px', marginTop: '6px' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="shipping-method" checked={shippingMethod === 'weight_based'} onChange={() => setShippingMethod('weight_based')} /> Weight-based rate calculation
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="radio" name="shipping-method" checked={shippingMethod === 'custom'} onChange={() => setShippingMethod('custom')} /> Custom flat delivery charge
                  </label>
                  {shippingMethod === 'custom' && (
                    <input 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={customDeliveryCharge} 
                      onChange={e => setCustomDeliveryCharge(e.target.value)} 
                      placeholder="Delivery charge in ₹" 
                      required 
                      className="admin-form-input"
                      style={{ maxWidth: '240px', marginTop: '4px' }}
                    />
                  )}
                </div>
              </div>

              {/* Expected Delivery Duration */}
              <div className="admin-form-field" style={{ marginTop: '20px' }}>
                <label className="admin-form-label" htmlFor="admin-expected-delivery-days">
                  Expected Delivery Time (Days) <span className="admin-required-badge">*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                  <div style={{ position: 'relative', width: '160px' }}>
                    <input
                      id="admin-expected-delivery-days"
                      type="number"
                      min="1"
                      max="60"
                      value={expectedDeliveryDays}
                      onChange={e => setExpectedDeliveryDays(e.target.value)}
                      required
                      className="admin-form-input"
                      placeholder="7"
                      style={{ paddingRight: '48px' }}
                    />
                    <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: 'var(--muted)', pointerEvents: 'none' }}>
                      days
                    </span>
                  </div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--surface-subtle)', padding: '8px 14px', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '12.5px' }}>
                    <Truck size={15} style={{ color: '#c5a47e' }} />
                    <span style={{ color: 'var(--ink)' }}>
                      {formatDeliveryByDate(calculateExpectedDeliveryDate(expectedDeliveryDays))}
                    </span>
                  </div>
                </div>
                <span className="admin-form-helper" style={{ display: 'block', marginTop: '6px', fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
                  Set how many calendar days this product typically takes to reach the customer. SENO automatically calculates the expected delivery date.
                </span>
              </div>
            </div>

            {/* Merchandising Badges */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '24px' }}>
              <label className="admin-form-label" style={{ marginBottom: '12px' }}>
                Storefront Merchandising Badges & Online Visibility
              </label>
              <div className="admin-merchandising-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px', background: isActive ? 'var(--surface-subtle)' : '#fff' }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                  <div>
                    <strong style={{ display: 'block' }}>Active Online</strong>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Visible to customers on storefront</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isNew}
                    onChange={e => setIsNew(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>New Arrival</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Displays "NEW" badge on card</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={e => setIsBestseller(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>Bestseller</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Displays "BESTSELLER" tag</span>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                  />
                  <div>
                    <span style={{ fontWeight: 600, display: 'block' }}>Featured Piece</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Promoted on homepage hero/grid</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & PUBLISH */}
        {activeTab === 'review' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px', alignItems: 'start' }}>
            {/* Left: Storefront Preview Card */}
            <section className="admin-form-card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, color: 'var(--muted)' }}>
                  STOREFRONT LIVE PREVIEW
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '2px', background: isActive ? '#dcfce7' : '#fee2e2', color: isActive ? '#15803d' : '#991b1b', textTransform: 'uppercase' }}>
                  {isActive ? '● Live Online' : '○ Inactive Draft'}
                </span>
              </div>

              {/* Cover Photo */}
              <div style={{ aspectRatio: '3/4', background: '#f5f5f5', borderRadius: '3px', overflow: 'hidden', position: 'relative', marginBottom: '16px', border: '1px solid var(--border)' }}>
                {images[0] ? (
                  <img
                    src={images[0].url}
                    alt={name || 'Cover preview'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--muted)', fontSize: '12px' }}>
                    No cover photo uploaded
                  </div>
                )}
                {images[0] && (
                  <div style={{ position: 'absolute', bottom: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '10px', padding: '3px 8px', borderRadius: '2px' }}>
                    {images.length} photo{images.length === 1 ? '' : 's'}
                  </div>
                )}
              </div>

              <h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '24px', margin: '0 0 8px', letterSpacing: '-0.3px', color: 'var(--ink)' }}>
                {name || 'Untitled Piece'}
              </h2>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '2px' }}>
                  {selectedCategory?.name || 'Uncategorized'}
                </span>
                {isNew && (
                  <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--ink)', color: '#fff', padding: '3px 6px', borderRadius: '2px' }}>
                    NEW
                  </span>
                )}
                {isBestseller && (
                  <span style={{ fontSize: '10px', fontWeight: 700, background: '#92400e', color: '#fff', padding: '3px 6px', borderRadius: '2px' }}>
                    BESTSELLER
                  </span>
                )}
              </div>

              {/* Price & Savings */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', marginBottom: '16px' }}>
                <strong style={{ fontSize: '24px', fontFamily: 'Georgia, serif', color: 'var(--ink)' }}>
                  {money(numPrice)}
                </strong>
                {hasValidDiscount && (
                  <>
                    <del style={{ color: 'var(--muted)', fontSize: '15px' }}>
                      {money(numCompareAt)}
                    </del>
                    <span style={{ fontSize: '11px', color: '#15803d', fontWeight: 700, background: '#dcfce7', padding: '2px 6px', borderRadius: '2px' }}>
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>

              {hasValidDiscount && (
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, marginBottom: '16px' }}>
                  Customer saves {money(discountAmount)}
                </div>
              )}

              {/* Return Policy Badge */}
              <div style={{ marginBottom: '16px' }}>
                <span className={`product-trust-badge ${isReturnable ? 'returnable' : 'non-returnable'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', fontSize: '11.5px', background: 'var(--surface-subtle)', border: '1px solid var(--border)', borderRadius: '2px' }}>
                  <RotateCcw size={13} />
                  <span>
                    {isReturnable ? `${returnWindowDays}-Day Returns & Exchanges` : 'Final Sale — Non-Returnable'}
                  </span>
                </span>
              </div>

              {/* Sizes Available */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', marginBottom: '6px', fontWeight: 600 }}>
                  Available Sizes
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Array.from(new Set(variants.map(v => v.size))).map(s => (
                    <span key={s} style={{ fontSize: '11px', padding: '4px 8px', border: '1px solid var(--ink)', background: 'var(--surface-subtle)', borderRadius: '2px', fontWeight: 600 }}>
                      {formatSizeDisplay(s)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.8px', marginBottom: '6px', fontWeight: 600 }}>
                  Craft Description
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '12.5px', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {description || 'No description provided.'}
                </p>
              </div>
            </section>

            {/* Right: Pre-flight Readiness Checklist & Variant Breakdown */}
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Readiness Checklist */}
              <section className="admin-form-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <ShieldCheck size={18} color="var(--ink)" />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Pre-Flight Readiness Checklist</h3>
                </div>

                <div style={{ display: 'grid', gap: '10px' }}>
                  {preflightChecks.map(check => (
                    <div
                      key={check.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: check.passed ? '#f0fdf4' : '#fff7ed',
                        border: check.passed ? '1px solid #bbf7d0' : '1px solid #fed7aa',
                        borderRadius: '3px',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: check.passed ? '#15803d' : '#9a3412', fontWeight: 500 }}>
                        {check.passed ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                        <span>{check.label}</span>
                      </div>

                      {!check.passed && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(check.step)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            background: '#fff',
                            border: '1px solid #d97706',
                            color: '#92400e',
                            borderRadius: '2px',
                            cursor: 'pointer'
                          }}
                        >
                          {check.fixLabel} →
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleExplicitSave(true)}
                    className="dark-btn"
                    style={{ flex: 1, minHeight: '42px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {isPending ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>{mode === 'create' ? 'Publish Piece Online' : 'Save & Publish Changes'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleExplicitSave(false)}
                    className="outline-btn"
                    style={{ minHeight: '42px', fontSize: '12px', padding: '0 16px' }}
                  >
                    Save as Inactive Draft
                  </button>
                </div>
              </section>

              {/* Variant Stock Allocation Table */}
              <section className="admin-form-card" style={{ padding: '24px' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
                  Authoritative Inventory Matrix ({variants.length} combinations)
                </h3>

                <div style={{ display: 'grid', gap: '6px' }}>
                  {variants.map(variant => (
                    <div
                      key={`${variant.sku}-${variant.size}-${variant.colour}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--border)',
                        fontSize: '12px'
                      }}
                    >
                      <div>
                        <strong>{formatSizeDisplay(variant.size)}</strong> &middot; {variant.colour}
                        <span style={{ color: 'var(--muted)', fontFamily: 'monospace', marginLeft: '6px', fontSize: '11px' }}>
                          ({variant.sku})
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {variant.price_override ? (
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            Override: {money(variant.price_override)}
                          </span>
                        ) : null}
                        <strong style={{ color: variant.quantity === 0 ? '#ef4444' : 'var(--ink)' }}>
                          {variant.quantity} in stock
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {/* Bottom Navigation & Action Bar */}
        <div className="product-form-action-bar" style={{ marginTop: '32px' }}>
          <div className="action-bar-status">
            <span style={{ fontSize: '12px', color: isDirty ? '#9a3412' : 'var(--muted)', fontWeight: 600 }}>
              {isDirty ? '● Unsaved changes' : '✓ All changes saved'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
              Step {currentStepIndex + 1} of 6 &middot; {TABS_CONFIG[currentStepIndex].label}
            </span>
          </div>

          <div className="action-bar-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={goToPrevTab}
              className="outline-btn"
              style={{ fontSize: '11px', padding: '8px 14px', minHeight: '38px', opacity: currentStepIndex === 0 ? 0.4 : 1 }}
            >
              <ArrowLeft size={13} />
              <span>PREVIOUS</span>
            </button>

            {currentStepIndex < tabOrder.length - 1 ? (
              <button
                type="button"
                className="outline-btn"
                style={{ fontSize: '11px', padding: '8px 14px', minHeight: '38px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={goToNextTab}
              >
                <span>NEXT STEP</span>
                <ArrowRight size={13} />
              </button>
            ) : null}

            <button
              key="btn-explicit-save"
              type="button"
              disabled={isPending}
              onClick={() => handleExplicitSave()}
              className="dark-btn action-bar-submit-btn"
              style={{
                opacity: isPending ? 0.7 : 1,
                minHeight: '38px'
              }}
            >
              {isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span className="desktop-btn-label">SAVING CHANGES...</span>
                  <span className="mobile-btn-label">Saving...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span className="desktop-btn-label">{mode === 'create' ? 'CREATE & PUBLISH PIECE' : 'SAVE CHANGES'}</span>
                  <span className="mobile-btn-label">{mode === 'create' ? 'Publish Piece' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Floating Save Confirmation / Error Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 10000,
            maxWidth: '420px',
            width: 'calc(100vw - 48px)',
            background: toast.type === 'success' ? '#0f172a' : '#450a0a',
            color: '#ffffff',
            borderRadius: '6px',
            padding: '14px 18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            border: toast.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444'
          }}
        >
          <div style={{ marginTop: '2px', color: toast.type === 'success' ? '#34d399' : '#f87171' }}>
            {toast.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.2px' }}>
              {toast.message}
            </div>
            {toast.details && (
              <div style={{ fontSize: '11.5px', color: '#cbd5e1', marginTop: '3px', lineHeight: 1.4 }}>
                {toast.details}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
