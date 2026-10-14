'use client'

import React, { useState, useRef, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Upload,
  Star,
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  AlertCircle,
  Copy,
  Layers,
  Sparkles,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react'
import { getColourSwatchHex, normalizeColourKey } from '@/lib/colours'

export interface ColourImageItem {
  id?: string
  url: string
  alt_text?: string
  display_order: number
  is_primary: boolean
  colour?: string | null
  is_colour_primary?: boolean
}

export interface ColourVariantItem {
  id?: string
  size: string
  colour: string
  sku: string
  quantity: number
  price_override?: number | null
  weight_grams_override?: number | null
  is_active: boolean
}

interface ProductColoursManagerProps {
  images: ColourImageItem[]
  setImages: React.Dispatch<React.SetStateAction<ColourImageItem[]>> | ((images: ColourImageItem[]) => void)
  variants: ColourVariantItem[]
  setVariants: React.Dispatch<React.SetStateAction<ColourVariantItem[]>> | ((variants: ColourVariantItem[]) => void)
  onUploadFile?: (file: File) => Promise<{ url: string; error?: string }>
  productSlug?: string
  productName?: string
  basePrice?: number | string
  setIsDirty?: (dirty: boolean) => void
}

function clientSlugify(text: string): string {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const POPULAR_COLOUR_PRESETS = ['Black', 'Washed Navy', 'White', 'Charcoal', 'Off White', 'Olive', 'Beige', 'Burgundy', 'Sand', 'Grey']

export function ProductColoursManager({
  images,
  setImages,
  variants,
  setVariants,
  onUploadFile,
  productSlug = '',
  productName = '',
  basePrice = '',
  setIsDirty
}: ProductColoursManagerProps) {
  // 1. Identify distinct colours configured in either variants or images
  const configuredColours = useMemo(() => {
    const coloursSet = new Set<string>()
    const list: string[] = []

    const addColour = (raw?: string | null) => {
      const c = (raw || '').trim()
      if (!c) return
      const key = normalizeColourKey(c)
      if (!coloursSet.has(key)) {
        coloursSet.add(key)
        list.push(c)
      }
    }

    for (const v of variants) {
      addColour(v.colour)
    }

    for (const img of images) {
      addColour(img.colour)
    }

    if (list.length === 0) {
      list.push('Black')
    }

    return list
  }, [variants, images])

  const [activeColour, setActiveColour] = useState<string>(configuredColours[0] || 'Black')
  const [newColourInput, setNewColourInput] = useState('')
  const [showAddColourModal, setShowAddColourModal] = useState(false)
  const [showAssignExistingModal, setShowAssignExistingModal] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Ensure activeColour is valid
  const currentColour = configuredColours.includes(activeColour)
    ? activeColour
    : configuredColours[0] || 'Black'

  const activeColourKey = normalizeColourKey(currentColour)

  // Filter images for the current active colour
  const activeImages = useMemo(() => {
    return images
      .filter(img => normalizeColourKey(img.colour) === activeColourKey)
      .sort((a, b) => a.display_order - b.display_order)
  }, [images, activeColourKey])

  // Unassigned images (general or legacy)
  const unassignedImages = useMemo(() => {
    return images.filter(img => !img.colour || normalizeColourKey(img.colour) === '')
  }, [images])

  // Variants for current active colour
  const activeVariants = useMemo(() => {
    return variants.filter(v => normalizeColourKey(v.colour) === activeColourKey)
  }, [variants, activeColourKey])

  // Top summary state calculations
  const totalColoursCount = configuredColours.length
  const totalAssignedImagesCount = images.filter(img => img.colour && img.colour.trim()).length
  const totalVariantsCount = variants.length
  const coloursWithoutPhotos = configuredColours.filter(c => {
    const k = normalizeColourKey(c)
    return !images.some(img => normalizeColourKey(img.colour) === k)
  })

  const markDirty = () => {
    if (setIsDirty) setIsDirty(true)
  }

  const updateImages = (updater: (prev: ColourImageItem[]) => ColourImageItem[]) => {
    const next = updater(images)
    setImages(next as any)
  }

  const updateVariants = (updater: (prev: ColourVariantItem[]) => ColourVariantItem[]) => {
    const next = updater(variants)
    setVariants(next as any)
  }

  // --- Step 1: Colour Group Actions ---
  const handleAddColourGroup = (colourName: string) => {
    const trimmed = colourName.trim()
    if (!trimmed) return
    const key = normalizeColourKey(trimmed)

    if (configuredColours.some(c => normalizeColourKey(c) === key)) {
      setActiveColour(trimmed)
      setShowAddColourModal(false)
      setNewColourInput('')
      return
    }

    // Default sizes (S, M, L, XL) for the new colour
    const baseSlug = clientSlugify(productSlug || productName || 'prod').toUpperCase().slice(0, 4)
    const colCode = clientSlugify(trimmed).toUpperCase().slice(0, 3)
    const defaultSizes = ['S', 'M', 'L', 'XL']
    const newVariants: ColourVariantItem[] = defaultSizes.map(sz => ({
      size: sz,
      colour: trimmed,
      sku: `SENO-${baseSlug}-${sz}-${colCode}`,
      quantity: 10,
      price_override: null,
      is_active: true
    }))

    updateVariants((prev: ColourVariantItem[]) => [...prev, ...newVariants])
    setActiveColour(trimmed)
    setShowAddColourModal(false)
    setNewColourInput('')
    markDirty()
  }

  const handleRemoveColourGroup = (colourToRemove: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const key = normalizeColourKey(colourToRemove)
    if (configuredColours.length <= 1) {
      alert('A product must have at least one colour.')
      return
    }

    if (!confirm(`Remove the colour "${colourToRemove}" and all its assigned photos and size variations?`)) {
      return
    }

    updateVariants((prev: ColourVariantItem[]) => prev.filter((v: ColourVariantItem) => normalizeColourKey(v.colour) !== key))
    updateImages((prev: ColourImageItem[]) => prev.filter((img: ColourImageItem) => normalizeColourKey(img.colour) !== key))

    const remaining = configuredColours.filter(c => normalizeColourKey(c) !== key)
    setActiveColour(remaining[0] || 'Black')
    markDirty()
  }

  // --- Step 2: Photo Actions for Current Colour ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !onUploadFile) return

    setUploading(true)
    setUploadError(null)

    try {
      const addedList: ColourImageItem[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const res = await onUploadFile(file)
        if (res.error) throw new Error(res.error)

        const isFirstForColour = activeImages.length === 0 && addedList.length === 0
        const isFirstOverall = images.length === 0 && addedList.length === 0

        addedList.push({
          url: res.url,
          alt_text: `${productName} in ${currentColour}`,
          display_order: images.length + addedList.length,
          is_primary: isFirstOverall,
          colour: currentColour,
          is_colour_primary: isFirstForColour
        })
      }

      updateImages((prev: ColourImageItem[]) => [...prev, ...addedList])
      markDirty()
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed.')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim()
    if (!url) return

    const isFirstForColour = activeImages.length === 0
    const isFirstOverall = images.length === 0

    const newImg: ColourImageItem = {
      url,
      alt_text: `${productName} in ${currentColour}`,
      display_order: images.length,
      is_primary: isFirstOverall,
      colour: currentColour,
      is_colour_primary: isFirstForColour
    }

    updateImages((prev: ColourImageItem[]) => [...prev, newImg])
    setImageUrlInput('')
    setShowUrlInput(false)
    markDirty()
  }

  const handleAssignExistingImage = (imageUrl: string) => {
    const alreadyAssigned = activeImages.some(img => img.url === imageUrl)
    if (alreadyAssigned) return

    const isFirstForColour = activeImages.length === 0
    const newImg: ColourImageItem = {
      url: imageUrl,
      alt_text: `${productName} in ${currentColour}`,
      display_order: images.length,
      is_primary: images.length === 0,
      colour: currentColour,
      is_colour_primary: isFirstForColour
    }

    updateImages((prev: ColourImageItem[]) => [...prev, newImg])
    markDirty()
  }

  const handleSetPrimaryForColour = (targetUrl: string) => {
    updateImages((prev: ColourImageItem[]) => {
      const isFirstColour = configuredColours[0] === currentColour

      return prev.map((img: ColourImageItem) => {
        const belongsToColour = normalizeColourKey(img.colour) === activeColourKey
        if (belongsToColour) {
          const isTarget = img.url === targetUrl
          return {
            ...img,
            is_colour_primary: isTarget,
            is_primary: isFirstColour ? isTarget : img.is_primary && !isTarget ? false : img.is_primary
          }
        }
        return img
      })
    })
    markDirty()
  }

  const handleMoveImage = (indexInActive: number, direction: 'left' | 'right') => {
    if (direction === 'left' && indexInActive === 0) return
    if (direction === 'right' && indexInActive === activeImages.length - 1) return

    const targetIdx = direction === 'left' ? indexInActive - 1 : indexInActive + 1
    const imgA = activeImages[indexInActive]
    const imgB = activeImages[targetIdx]

    updateImages((prev: ColourImageItem[]) => {
      const copy = [...prev]
      const posA = copy.findIndex(img => img.url === imgA.url && normalizeColourKey(img.colour) === activeColourKey)
      const posB = copy.findIndex(img => img.url === imgB.url && normalizeColourKey(img.colour) === activeColourKey)

      if (posA > -1 && posB > -1) {
        const temp = copy[posA]
        copy[posA] = copy[posB]
        copy[posB] = temp
      }
      return copy.map((img, i) => ({ ...img, display_order: i }))
    })
    markDirty()
  }

  const handleRemoveImageFromColour = (targetUrl: string) => {
    updateImages((prev: ColourImageItem[]) => {
      const remaining = prev.filter((img: ColourImageItem) => !(img.url === targetUrl && normalizeColourKey(img.colour) === activeColourKey))
      const remainingForColour = remaining.filter((img: ColourImageItem) => normalizeColourKey(img.colour) === activeColourKey)
      if (remainingForColour.length > 0 && !remainingForColour.some((img: ColourImageItem) => img.is_colour_primary)) {
        remainingForColour[0].is_colour_primary = true
      }
      if (remaining.length > 0 && !remaining.some((img: ColourImageItem) => img.is_primary)) {
        remaining[0].is_primary = true
      }
      return remaining.map((img: ColourImageItem, idx: number) => ({ ...img, display_order: idx }))
    })
    markDirty()
  }

  // --- Step 3: Size & Inventory Actions ---
  const handleToggleSize = (sizeLabel: string) => {
    const existing = activeVariants.find(v => v.size.trim().toLowerCase() === sizeLabel.trim().toLowerCase())
    if (existing) {
      // Remove size
      updateVariants((prev: ColourVariantItem[]) => prev.filter((v: ColourVariantItem) => !(v.sku === existing.sku && normalizeColourKey(v.colour) === activeColourKey)))
    } else {
      // Add size
      const baseSlug = clientSlugify(productSlug || productName || 'prod').toUpperCase().slice(0, 4)
      const colCode = clientSlugify(currentColour).toUpperCase().slice(0, 3)
      const newSku = `SENO-${baseSlug}-${sizeLabel.toUpperCase()}-${colCode}`
      const newVar: ColourVariantItem = {
        size: sizeLabel,
        colour: currentColour,
        sku: newSku,
        quantity: 10,
        price_override: null,
        is_active: true
      }
      updateVariants((prev: ColourVariantItem[]) => [...prev, newVar])
    }
    markDirty()
  }

  const handleUpdateVariant = (sku: string, field: keyof ColourVariantItem, val: any) => {
    updateVariants((prev: ColourVariantItem[]) => prev.map((v: ColourVariantItem) => {
      if (v.sku === sku && normalizeColourKey(v.colour) === activeColourKey) {
        return { ...v, [field]: val }
      }
      return v
    }))
    markDirty()
  }

  const handleRemoveVariant = (sku: string) => {
    updateVariants((prev: ColourVariantItem[]) => prev.filter((v: ColourVariantItem) => !(v.sku === sku && normalizeColourKey(v.colour) === activeColourKey)))
    markDirty()
  }

  const toggleAdvanced = (sku: string) => {
    setExpandedAdvanced(prev => ({ ...prev, [sku]: !prev[sku] }))
  }

  return (
    <div className="product-colours-guided-manager" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ============================================================ */}
      {/* TOP SUMMARY & PROGRESS BAR */}
      {/* ============================================================ */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={16} color="var(--ink)" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
              Product Colours &amp; Variants
            </h3>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
            {totalColoursCount} colour{totalColoursCount === 1 ? '' : 's'} configured &middot; {totalAssignedImagesCount} photo{totalAssignedImagesCount === 1 ? '' : 's'} assigned &middot; {totalVariantsCount} size variant{totalVariantsCount === 1 ? '' : 's'} in stock
          </p>
        </div>

        {coloursWithoutPhotos.length > 0 ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#fef3c7',
              color: '#92400e',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <AlertCircle size={13} />
            <span>Photos needed for: {coloursWithoutPhotos.join(', ')}</span>
          </div>
        ) : (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#ecfdf5',
              color: '#065f46',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 600
            }}
          >
            <Check size={13} />
            <span>All colours have photos</span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* STEP 1: SELECT OR ADD COLOUR */}
      {/* ============================================================ */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                1
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Colours
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Select a colour to configure its photos and sizes below.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddColourModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'var(--ink)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} /> Add Colour
          </button>
        </div>

        {/* Compact Colour Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {configuredColours.map((col) => {
            const isSelected = normalizeColourKey(col) === activeColourKey
            const hex = getColourSwatchHex(col)
            const imgCount = images.filter(img => normalizeColourKey(img.colour) === normalizeColourKey(col)).length
            const varCount = variants.filter(v => normalizeColourKey(v.colour) === normalizeColourKey(col)).length

            return (
              <div
                key={col}
                onClick={() => setActiveColour(col)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: isSelected ? '2px solid var(--ink)' : '1px solid var(--border)',
                  background: isSelected ? '#fafafa' : '#ffffff',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Visual Swatch */}
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: hex,
                    border: hex.toLowerCase() === '#ffffff' || hex.toLowerCase() === '#fff' ? '1px solid #ccc' : '1px solid rgba(0,0,0,0.2)',
                    flexShrink: 0
                  }}
                />

                {/* Name & Counts */}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: 'var(--ink)' }}>
                    {col}
                  </div>
                  <div style={{ fontSize: '10.5px', color: imgCount === 0 ? '#b45309' : 'var(--muted)' }}>
                    {imgCount > 0 ? `${imgCount} photo${imgCount === 1 ? '' : 's'}` : 'Photos needed'} &middot; {varCount} size{varCount === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Remove Colour Icon (if more than 1 colour) */}
                {configuredColours.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleRemoveColourGroup(col, e)}
                    title={`Remove ${col}`}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--muted)',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      marginLeft: '4px',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* STEP 2: PHOTOS FOR SELECTED COLOUR */}
      {/* ============================================================ */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                2
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Photos for {currentColour}
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              When shoppers select <strong>{currentColour}</strong> on the storefront, only these photos will be displayed.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onUploadFile && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'var(--ink)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '2px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: uploading ? 'wait' : 'pointer'
                  }}
                >
                  <Upload size={13} /> {uploading ? 'Uploading...' : `Upload Photos for ${currentColour}`}
                </button>
              </>
            )}

            {unassignedImages.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAssignExistingModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  background: '#ffffff',
                  color: 'var(--ink)',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Copy size={12} /> Use Existing ({unassignedImages.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '8px 12px',
                background: showUrlInput ? '#f1f5f9' : '#ffffff',
                color: 'var(--ink)',
                border: '1px solid var(--border)',
                borderRadius: '2px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
            >
              <LinkIcon size={12} /> Add by URL
            </button>
          </div>
        </div>

        {uploadError && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '12px', borderRadius: '3px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} /> {uploadError}
          </div>
        )}

        {/* Expandable URL Input */}
        {showUrlInput && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            <input
              type="url"
              placeholder={`Paste public photo URL for ${currentColour}...`}
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddImageUrl()
                }
              }}
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
              disabled={!imageUrlInput.trim()}
              onClick={handleAddImageUrl}
              style={{
                padding: '8px 14px',
                background: 'var(--ink)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '2px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: imageUrlInput.trim() ? 'pointer' : 'not-allowed',
                opacity: imageUrlInput.trim() ? 1 : 0.4
              }}
            >
              Add
            </button>
          </div>
        )}

        {/* Photos Grid or Empty State */}
        {activeImages.length === 0 ? (
          <div
            style={{
              padding: '36px 20px',
              border: '1px dashed var(--border)',
              borderRadius: '4px',
              textAlign: 'center',
              background: '#f8fafc'
            }}
          >
            <ImageIcon size={32} color="var(--muted)" style={{ margin: '0 auto 8px', opacity: 0.6 }} />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '4px' }}>
              No photos assigned to {currentColour}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Upload imagery for this colour so customers see the accurate variation when selecting {currentColour}.
            </p>
            {onUploadFile && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  padding: '8px 18px',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Upload First Photo
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '12px'
            }}
          >
            {activeImages.map((img, idx) => {
              const isColPrimary = !!img.is_colour_primary || idx === 0
              return (
                <div
                  key={img.url + idx}
                  style={{
                    border: isColPrimary ? '2px solid var(--ink)' : '1px solid var(--border)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ position: 'relative', aspectRatio: '3/4', background: '#f1f5f9' }}>
                    <img
                      src={img.url}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />

                    {/* Primary Badge */}
                    {isColPrimary && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          background: 'var(--ink)',
                          color: '#ffffff',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.5px',
                          padding: '2px 6px',
                          borderRadius: '2px'
                        }}
                      >
                        COVER
                      </span>
                    )}
                  </div>

                  {/* Image Controls */}
                  <div
                    style={{
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#fafafa',
                      borderTop: '1px solid var(--border)'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryForColour(img.url)}
                      disabled={isColPrimary}
                      title={isColPrimary ? 'Current cover photo for this colour' : 'Set as cover photo'}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isColPrimary ? '#eab308' : 'var(--muted)',
                        cursor: isColPrimary ? 'default' : 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <Star size={13} fill={isColPrimary ? 'currentColor' : 'none'} />
                    </button>

                    <div style={{ display: 'flex', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'left')}
                        disabled={idx === 0}
                        title="Move left"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: idx === 0 ? '#cbd5e1' : 'var(--ink)',
                          cursor: idx === 0 ? 'default' : 'pointer',
                          padding: '2px'
                        }}
                      >
                        <ChevronLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 'right')}
                        disabled={idx === activeImages.length - 1}
                        title="Move right"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: idx === activeImages.length - 1 ? '#cbd5e1' : 'var(--ink)',
                          cursor: idx === activeImages.length - 1 ? 'default' : 'pointer',
                          padding: '2px'
                        }}
                      >
                        <ChevronRight size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImageFromColour(img.url)}
                        title="Remove photo"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '2px',
                          marginLeft: '2px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* STEP 3: SIZES & INVENTORY FOR SELECTED COLOUR */}
      {/* ============================================================ */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '20px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                3
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sizes &amp; Inventory for {currentColour}
              </h4>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Toggle standard size chips to enable variations. Each size retains its own inventory count and SKU.
            </p>
          </div>

          {/* Quick Toggle Standard Sizes */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {STANDARD_SIZES.map((sz) => {
              const isEnabled = activeVariants.some(v => v.size.trim().toLowerCase() === sz.toLowerCase())
              return (
                <button
                  key={sz}
                  type="button"
                  onClick={() => handleToggleSize(sz)}
                  style={{
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '3px',
                    border: isEnabled ? '1px solid var(--ink)' : '1px solid var(--border)',
                    background: isEnabled ? 'var(--ink)' : '#ffffff',
                    color: isEnabled ? '#ffffff' : 'var(--ink)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isEnabled ? `✓ ${sz}` : `+ ${sz}`}
                </button>
              )
            })}
          </div>
        </div>

        {/* Compact Size Cards */}
        {activeVariants.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              border: '1px dashed var(--border)',
              borderRadius: '4px',
              textAlign: 'center',
              background: '#f8fafc',
              fontSize: '12px',
              color: 'var(--muted)'
            }}
          >
            No sizes currently active for <strong>{currentColour}</strong>. Tap any size chip above (e.g. S, M, L) to activate.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeVariants.map((variant) => {
              const isAdvOpen = !!expandedAdvanced[variant.sku]
              return (
                <div
                  key={variant.sku || variant.size}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    background: variant.is_active === false ? '#f8fafc' : '#ffffff',
                    padding: '12px 14px'
                  }}
                >
                  {/* Primary Row: Size, Stock, and Quick Controls */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          background: '#f1f5f9',
                          borderRadius: '3px',
                          fontSize: '14px',
                          fontWeight: 700,
                          color: 'var(--ink)'
                        }}
                      >
                        {variant.size}
                      </span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                          {currentColour} / {variant.size}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'monospace' }}>
                          {variant.sku}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                      {/* Stock Quantity */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Stock:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={variant.quantity}
                          onChange={(e) => handleUpdateVariant(variant.sku, 'quantity', Math.max(0, parseInt(e.target.value, 10) || 0))}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            fontSize: '13px',
                            fontWeight: 600,
                            border: '1px solid var(--border)',
                            borderRadius: '2px',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      {/* Expand Details Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleAdvanced(variant.sku)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          textDecoration: 'underline'
                        }}
                      >
                        {isAdvOpen ? 'Fewer details' : 'More details'}
                        {isAdvOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(variant.sku)}
                        title="Remove size"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Advanced Expandable Row (SKU edit, Price Override, Active toggle) */}
                  {isAdvOpen && (
                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                          Custom SKU Code
                        </label>
                        <input
                          type="text"
                          value={variant.sku}
                          onChange={(e) => handleUpdateVariant(variant.sku, 'sku', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            border: '1px solid var(--border)',
                            borderRadius: '2px',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                          Price Override (₹ INR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder={basePrice ? String(basePrice) : 'Standard'}
                          value={variant.price_override != null ? variant.price_override : ''}
                          onChange={(e) => handleUpdateVariant(variant.sku, 'price_override', e.target.value === '' ? null : Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            fontSize: '11px',
                            border: '1px solid var(--border)',
                            borderRadius: '2px',
                            background: '#ffffff'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateVariant(variant.sku, 'is_active', variant.is_active === false ? true : false)}
                          style={{
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: 600,
                            borderRadius: '2px',
                            border: 'none',
                            cursor: 'pointer',
                            background: variant.is_active !== false ? '#ecfdf5' : '#f1f5f9',
                            color: variant.is_active !== false ? '#065f46' : '#94a3b8'
                          }}
                        >
                          {variant.is_active !== false ? '● ACTIVE FOR SALE' : '○ INACTIVE'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ADD COLOUR */}
      {/* ============================================================ */}
      {showAddColourModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowAddColourModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '4px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 6px', color: 'var(--ink)' }}>
              Add Product Colour
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Select a popular shade or enter a custom fashion colour name.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Washed Navy, Charcoal, Raw Silk..."
                value={newColourInput}
                onChange={(e) => setNewColourInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddColourGroup(newColourInput)
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '13px',
                  border: '1px solid var(--border)',
                  borderRadius: '2px',
                  background: '#ffffff'
                }}
              />
            </div>

            {/* Quick Preset Shades */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                Popular Presets:
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {POPULAR_COLOUR_PRESETS.map((preset) => {
                  const hex = getColourSwatchHex(preset)
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddColourGroup(preset)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 10px',
                        fontSize: '11px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: hex,
                          border: '1px solid rgba(0,0,0,0.1)'
                        }}
                      />
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowAddColourModal(false)}
                style={{
                  padding: '8px 14px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newColourInput.trim()}
                onClick={() => handleAddColourGroup(newColourInput)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: newColourInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: newColourInput.trim() ? 1 : 0.4
                }}
              >
                Add Colour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: ASSIGN EXISTING PHOTOS */}
      {/* ============================================================ */}
      {showAssignExistingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowAssignExistingModal(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '4px',
              padding: '24px',
              maxWidth: '560px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px', color: 'var(--ink)' }}>
              Assign Existing Photos to {currentColour}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px' }}>
              Select photos already uploaded to assign them directly to {currentColour} without re-uploading.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', maxHeight: '300px', overflowY: 'auto', marginBottom: '18px' }}>
              {unassignedImages.map((img, i) => {
                const isAssigned = activeImages.some(ai => ai.url === img.url)
                return (
                  <div
                    key={img.url + i}
                    onClick={() => handleAssignExistingImage(img.url)}
                    style={{
                      border: isAssigned ? '2px solid #16a34a' : '1px solid var(--border)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <img src={img.url} alt="" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
                    {isAssigned && (
                      <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#16a34a', color: '#fff', borderRadius: '50%', padding: '2px' }}>
                        <Check size={10} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAssignExistingModal(false)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--ink)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
