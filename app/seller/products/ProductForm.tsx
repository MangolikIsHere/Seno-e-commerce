'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitSellerProduct } from '@/lib/sellers'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Plus, X, Upload } from 'lucide-react'

export function ProductForm({ categories, initialData = null }: { categories: any[], initialData?: any }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Basic info
  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [price, setPrice] = useState(initialData?.price?.toString() || '')
  const [weight, setWeight] = useState(initialData?.default_weight_grams?.toString() || '500')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')

  // Images
  const [images, setImages] = useState<any[]>(initialData?.product_images || [])
  const [uploadingImage, setUploadingImage] = useState(false)

  // Variants
  const [variants, setVariants] = useState<any[]>(initialData?.variants || [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    setError('')
    
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`
      
      const { data, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file)
        
      if (uploadError) throw new Error(uploadError.message)
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName)
        
      setImages([...images, { url: publicUrl }])
    } catch (err: any) {
      setError('Image upload failed: ' + err.message)
    } finally {
      setUploadingImage(false)
    }
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const addVariant = () => {
    setVariants([...variants, { size: '', colour: '', sku: '', quantity: '0' }])
  }

  const updateVariant = (index: number, field: string, value: string) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      formData.append('description', description)
      formData.append('price', price)
      formData.append('weight', weight)
      if (categoryId) formData.append('category_id', categoryId)

      await submitSellerProduct(formData, images, variants, initialData?.id)
      router.push('/seller/products')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '32px' }}>
      
      {/* Basic Information */}
      <div className="admin-table-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>Basic Information</h2>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Product Name</label>
            <input 
              required type="text" className="input-field" value={name} 
              onChange={e => {
                setName(e.target.value)
                if (!initialData) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))
              }}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>URL Slug</label>
            <input required type="text" className="input-field" value={slug} onChange={e => setSlug(e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Price ($)</label>
              <input required type="number" step="0.01" min="0" className="input-field" value={price} onChange={e => setPrice(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Weight (grams)</label>
              <input required type="number" step="1" min="1" className="input-field" value={weight} onChange={e => setWeight(e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Category</label>
            <select className="input-field" value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: '100%' }}>
              <option value="">Select Category...</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Description</label>
            <textarea className="input-field" value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', minHeight: '120px' }} />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="admin-table-card" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '24px' }}>Media</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ position: 'relative', aspectRatio: '3/4', background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <img src={img.url} alt="Product image" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button 
                type="button" 
                onClick={() => removeImage(idx)}
                style={{ position: 'absolute', top: '4px', right: '4px', background: 'white', border: '1px solid var(--border)', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
          
          <label style={{ aspectRatio: '3/4', border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'var(--surface-subtle)', color: 'var(--muted)' }}>
            {uploadingImage ? <Loader2 size={24} className="spin" /> : <Upload size={24} />}
            <span style={{ fontSize: '11px', marginTop: '8px' }}>Upload</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploadingImage} />
          </label>
        </div>
      </div>

      {/* Variants */}
      <div className="admin-table-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Variants & Inventory</h2>
          <button type="button" onClick={addVariant} className="button button-outline" style={{ fontSize: '11px', padding: '6px 12px' }}>
            <Plus size={14} style={{ marginRight: '4px' }} /> Add Variant
          </button>
        </div>
        
        {variants.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '24px' }}>
            No variants added. You must add at least one variant for inventory.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {variants.map((v, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end', background: 'var(--surface-subtle)', padding: '16px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Size</label>
                  <input type="text" className="input-field" value={v.size} onChange={e => updateVariant(idx, 'size', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }} placeholder="e.g. M" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Color</label>
                  <input type="text" className="input-field" value={v.colour} onChange={e => updateVariant(idx, 'colour', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }} placeholder="e.g. Black" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>SKU *</label>
                  <input required type="text" className="input-field" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>Stock Qty *</label>
                  <input required type="number" min="0" className="input-field" value={v.quantity} onChange={e => updateVariant(idx, 'quantity', e.target.value)} style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }} />
                </div>
                <button type="button" onClick={() => removeVariant(idx)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', padding: '8px' }}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div style={{ color: '#b91c1c', fontSize: '13px', padding: '12px', background: '#fee2e2' }}>{error}</div>}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button type="button" onClick={() => router.back()} className="button button-outline">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="button button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          {loading ? <Loader2 size={16} className="spin" /> : 'Submit Product'}
        </button>
      </div>

    </form>
  )
}
