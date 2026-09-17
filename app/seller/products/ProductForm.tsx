'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, ImagePlus, Loader2, Plus, Star, Trash2, X } from 'lucide-react'
import { submitSellerProduct } from '@/lib/sellers'
import { createClient } from '@/utils/supabase/client'
import { money } from '@/lib/catalog'

type Step = 1 | 2 | 3 | 4 | 5
type ImageItem = { url: string; display_order?: number; is_primary?: boolean }
type VariantItem = { size: string; colour: string; sku: string; quantity: string; id?: string }

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')

export function ProductForm({ categories, collections = [], initialData = null }: { categories: any[]; collections?: any[]; initialData?: any }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [name, setName] = useState(initialData?.name || '')
  const [slug, setSlug] = useState(initialData?.slug || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '')
  const [collectionIds, setCollectionIds] = useState<string[]>(initialData?.collection_ids || [])
  const [price, setPrice] = useState(String(initialData?.price || ''))
  const [compareAtPrice, setCompareAtPrice] = useState(String(initialData?.compare_at_price || ''))
  const [weight, setWeight] = useState(String(initialData?.default_weight_grams || '500'))
  const [shippingMethod, setShippingMethod] = useState<'weight_based' | 'custom'>(initialData?.shipping_method === 'custom' ? 'custom' : 'weight_based')
  const [customDeliveryCharge, setCustomDeliveryCharge] = useState(String(initialData?.custom_delivery_charge || ''))
  const [images, setImages] = useState<ImageItem[]>(initialData?.product_images || [])
  const [variants, setVariants] = useState<VariantItem[]>((initialData?.variants || []).map((variant: any) => ({ ...variant, quantity: String(variant.quantity || 0) })))
  const [uploading, setUploading] = useState(false)
  const selectedCategory = categories.find(category => category.id === categoryId)
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(0, Number(variant.quantity || 0)), 0)
  const duplicateSku = variants.some((variant, index) => variant.sku.trim() && variants.findIndex(other => other.sku.trim().toLowerCase() === variant.sku.trim().toLowerCase()) !== index)
  const duplicateCombination = variants.some((variant, index) => variants.findIndex(other => other.size.trim().toLowerCase() === variant.size.trim().toLowerCase() && other.colour.trim().toLowerCase() === variant.colour.trim().toLowerCase()) !== index)

  const validate = (target: Step) => {
    setError('')
    if (target >= 2 && (!name.trim() || !slug.trim() || !categoryId)) { setError('Complete the product name, slug, and category first.'); return false }
    if (target >= 3 && (!images.length || !images.some(image => image.is_primary))) { setError('Add at least one image and select a primary image.'); return false }
    if (target >= 4 && (!Number.isFinite(Number(price)) || Number(price) < 0 || !Number.isFinite(Number(weight)) || Number(weight) <= 0 || (shippingMethod === 'custom' && (!Number.isFinite(Number(customDeliveryCharge)) || Number(customDeliveryCharge) < 0)))) { setError('Check the price, weight, and delivery fields.'); return false }
    if (target >= 5 && (!variants.length || duplicateSku || duplicateCombination || variants.some(variant => !variant.size.trim() || !variant.colour.trim() || !variant.sku.trim() || !Number.isInteger(Number(variant.quantity)) || Number(variant.quantity) < 0))) { setError('Each variant needs a unique size, colour, SKU, and valid stock quantity.'); return false }
    return true
  }

  const goTo = (target: Step) => { if (target > step && !validate(target)) return; setStep(target) }
  const updateVariant = (index: number, field: keyof VariantItem, value: string) => setVariants(current => current.map((variant, itemIndex) => itemIndex === index ? { ...variant, [field]: value } : variant))
  const moveImage = (index: number, delta: -1 | 1) => { const target = index + delta; if (target < 0 || target >= images.length) return; const next = [...images]; [next[index], next[target]] = [next[target], next[index]]; setImages(next.map((image, display_order) => ({ ...image, display_order }))) }
  const removeImage = (index: number) => { const next = images.filter((_, itemIndex) => itemIndex !== index); if (next.length && !next.some(image => image.is_primary)) next[0].is_primary = true; setImages(next) }

  const uploadImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setUploading(true); setError('')
    try {
      const supabase = createClient()
      const uploaded: ImageItem[] = []
      for (const file of files) {
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) throw new Error('Images must be valid image files under 5MB.')
        const extension = file.name.split('.').pop() || 'jpg'
        const path = `seller/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        const result = await supabase.storage.from('product-images').upload(path, file)
        if (result.error) throw new Error(result.error.message)
        uploaded.push({ url: supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl, is_primary: images.length === 0 && uploaded.length === 0 })
      }
      setImages(current => [...current, ...uploaded].map((image, display_order) => ({ ...image, display_order })))
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.') } finally { setUploading(false); event.target.value = '' }
  }

  const submit = (submitForReview: boolean) => {
    if (!validate(5)) return
    startTransition(async () => {
      try {
        const formData = new FormData()
        ;[['name', name.trim()], ['slug', slug.trim()], ['description', description], ['category_id', categoryId], ['collection_ids', JSON.stringify(collectionIds)], ['price', price], ['compare_at_price', compareAtPrice], ['weight', weight], ['shipping_method', shippingMethod], ['custom_delivery_charge', customDeliveryCharge], ['approval_status', submitForReview ? 'submitted' : 'draft']].forEach(([key, value]) => formData.set(key, value))
        await submitSellerProduct(formData, images, variants, initialData?.id)
        router.push('/seller/products'); router.refresh()
      } catch (submitError) { setError(submitError instanceof Error ? submitError.message : 'Unable to save product.') }
    })
  }

  const steps = ['Basic information', 'Media', 'Pricing & delivery', 'Variants & inventory', 'Review & submit']
  return <form onSubmit={event => event.preventDefault()} style={{ display: 'grid', gap: '18px' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}><div><span className="section-kicker">SELLER STUDIO</span><h1 className="static-page-title" style={{ margin: '6px 0' }}>{initialData ? 'Edit product' : 'Create product'}</h1><p style={{ color: 'var(--muted)', margin: 0 }}>Your submission will be reviewed by SENO before it becomes public.</p></div><button type="button" className="button button-outline" onClick={() => router.back()}><ArrowLeft size={14} /> Exit</button></header>
    <nav style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid var(--border)' }}>{steps.map((label, index) => <button type="button" key={label} onClick={() => goTo((index + 1) as Step)} style={{ padding: '13px 8px', border: 0, borderBottom: step === index + 1 ? '2px solid var(--ink)' : '2px solid transparent', background: 'transparent', color: step === index + 1 ? 'var(--ink)' : 'var(--muted)', fontSize: '11px', cursor: 'pointer' }}><strong>{index + 1}</strong><span style={{ display: 'block', marginTop: '4px' }}>{label}</span></button>)}</nav>
    {error && <div role="alert" style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: '13px' }}>{error}</div>}
    <section className="admin-table-card" style={{ padding: '24px' }}>
      {step === 1 && <div style={{ display: 'grid', gap: '18px' }}><div><label>Product name</label><input className="input-field" required value={name} onChange={event => { setName(event.target.value); if (!initialData) setSlug(slugify(event.target.value)) }} /></div><div><label>Editable URL slug</label><input className="input-field" required value={slug} onChange={event => setSlug(slugify(event.target.value))} /></div><div><label>Description</label><textarea className="input-field" rows={6} value={description} onChange={event => setDescription(event.target.value)} /></div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}><div><label>Category</label><select className="input-field" required value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="">Select category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div><div><label>Collection</label><select className="input-field" value={collectionIds[0] || ''} onChange={event => setCollectionIds(event.target.value ? [event.target.value] : [])}><option value="">No collection</option>{collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></div></div></div>}
      {step === 2 && <div><div style={{ padding: '30px', textAlign: 'center', border: '1px dashed var(--border)', background: 'var(--surface-subtle)', marginBottom: '20px' }}><ImagePlus size={28} color="var(--muted)" style={{ margin: '0 auto 10px' }} /><h2 style={{ fontSize: '17px', fontWeight: 500 }}>Product photography</h2><p style={{ color: 'var(--muted)', fontSize: '12px' }}>Upload multiple images up to 5MB each.</p><label className="button button-outline">{uploading ? <><Loader2 size={14} className="spin" /> Uploading</> : 'Choose images'}<input type="file" multiple accept="image/*" onChange={uploadImages} hidden disabled={uploading} /></label></div>{images.length ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px' }}>{images.map((image, index) => <div key={`${image.url}-${index}`} style={{ border: image.is_primary ? '2px solid var(--ink)' : '1px solid var(--border)', background: 'var(--surface-subtle)' }}><div style={{ aspectRatio: '3/4', position: 'relative' }}><img src={image.url} alt={`${name} image ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />{image.is_primary && <span style={{ position: 'absolute', left: '8px', top: '8px', background: 'var(--ink)', color: '#fff', padding: '4px 6px', fontSize: '9px' }}>PRIMARY</span>}</div><div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px' }}><button type="button" title="Make primary" onClick={() => setImages(current => current.map((item, itemIndex) => ({ ...item, is_primary: itemIndex === index })))}><Star size={14} fill={image.is_primary ? 'currentColor' : 'none'} /></button><button type="button" title="Move up" onClick={() => moveImage(index, -1)}><ChevronUp size={14} /></button><button type="button" title="Move down" onClick={() => moveImage(index, 1)}><ChevronDown size={14} /></button><button type="button" title="Remove" onClick={() => removeImage(index)}><Trash2 size={14} /></button></div></div>)}</div> : <p style={{ color: 'var(--muted)', textAlign: 'center' }}>No images yet. Add at least one image to continue.</p>}</div>}
      {step === 3 && <div style={{ display: 'grid', gap: '20px' }}><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}><div><label>Selling price (₹)</label><input className="input-field" type="number" min="0" step="0.01" value={price} onChange={event => setPrice(event.target.value)} /></div><div><label>Compare-at price (₹)</label><input className="input-field" type="number" min="0" step="0.01" value={compareAtPrice} onChange={event => setCompareAtPrice(event.target.value)} /></div></div><div><label>Delivery method</label><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}><button type="button" onClick={() => setShippingMethod('weight_based')} style={{ textAlign: 'left', padding: '16px', border: shippingMethod === 'weight_based' ? '2px solid var(--ink)' : '1px solid var(--border)', background: shippingMethod === 'weight_based' ? 'var(--surface-subtle)' : '#fff' }}><strong>Weight based</strong><small style={{ display: 'block', marginTop: '5px', color: 'var(--muted)' }}>Use SENO standard shipping rules.</small></button><button type="button" onClick={() => setShippingMethod('custom')} style={{ textAlign: 'left', padding: '16px', border: shippingMethod === 'custom' ? '2px solid var(--ink)' : '1px solid var(--border)', background: shippingMethod === 'custom' ? 'var(--surface-subtle)' : '#fff' }}><strong>Custom charge</strong><small style={{ display: 'block', marginTop: '5px', color: 'var(--muted)' }}>Charge once per product line.</small></button></div></div>{shippingMethod === 'custom' ? <div><label>Custom delivery charge (₹)</label><input className="input-field" type="number" min="0" step="0.01" value={customDeliveryCharge} onChange={event => setCustomDeliveryCharge(event.target.value)} /></div> : <div><label>Product weight (grams)</label><input className="input-field" type="number" min="1" value={weight} onChange={event => setWeight(event.target.value)} /></div>}</div>}
      {step === 4 && <div><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><div><h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>Variants & inventory</h2><p style={{ color: 'var(--muted)', fontSize: '12px' }}>Every combination needs a unique SKU.</p></div><button type="button" className="button button-outline" onClick={() => setVariants(current => [...current, { size: '', colour: '', sku: '', quantity: '0' }])}><Plus size={14} /> Add variant</button></div>{duplicateSku && <p style={{ color: '#9f1239', fontSize: '12px' }}>Duplicate SKU detected.</p>}{duplicateCombination && <p style={{ color: '#9f1239', fontSize: '12px' }}>Duplicate size and colour combination detected.</p>}<div style={{ overflowX: 'auto' }}><table className="admin-table"><thead><tr><th>Size</th><th>Colour</th><th>SKU</th><th>Stock</th><th /></tr></thead><tbody>{variants.map((variant, index) => <tr key={index}><td><input className="input-field" value={variant.size} onChange={event => updateVariant(index, 'size', event.target.value)} /></td><td><input className="input-field" value={variant.colour} onChange={event => updateVariant(index, 'colour', event.target.value)} /></td><td><input className="input-field" value={variant.sku} onChange={event => updateVariant(index, 'sku', event.target.value)} /></td><td><input className="input-field" type="number" min="0" step="1" value={variant.quantity} onChange={event => updateVariant(index, 'quantity', event.target.value)} /></td><td><button type="button" title="Remove variant" onClick={() => setVariants(current => current.filter((_, itemIndex) => itemIndex !== index))}><X size={15} /></button></td></tr>)}</tbody></table></div>{!variants.length && <p style={{ textAlign: 'center', color: 'var(--muted)', padding: '28px' }}>Add at least one variant before submitting.</p>}</div>}
      {step === 5 && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '24px' }}><div><span className="section-kicker">LIVE PREVIEW</span><h2 style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: '28px', margin: '8px 0' }}>{name || 'Untitled product'}</h2><p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>{description || 'No description added.'}</p><div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '20px 0' }}><span className="status-pill pending">{selectedCategory?.name || 'No category'}</span><span className="status-pill pending">{shippingMethod === 'custom' ? `Custom ${money(Number(customDeliveryCharge || 0))}` : `${weight}g weight based`}</span></div><div style={{ display: 'flex', gap: '12px', alignItems: 'baseline' }}><strong style={{ fontSize: '20px' }}>{money(Number(price || 0))}</strong>{compareAtPrice && <del style={{ color: 'var(--muted)' }}>{money(Number(compareAtPrice))}</del>}</div><h3 style={{ margin: '28px 0 10px', fontSize: '14px' }}>Variants ({variants.length})</h3><div style={{ display: 'grid', gap: '6px' }}>{variants.map(variant => <div key={`${variant.sku}-${variant.size}`} style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', padding: '8px 0', fontSize: '12px' }}><span>{variant.size} / {variant.colour} / {variant.sku}</span><strong>{variant.quantity} in stock</strong></div>)}</div></div><div>{images[0] ? <img src={images[0].url} alt={`${name} primary`} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} /> : <div style={{ aspectRatio: '3/4', background: 'var(--surface-subtle)', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>No primary image</div>}<div style={{ marginTop: '14px', padding: '14px', background: 'var(--surface-subtle)', fontSize: '12px', color: 'var(--muted)' }}>Total stock: <strong style={{ color: 'var(--ink)' }}>{totalStock}</strong><br />Your product remains hidden until SENO approves it.</div></div></div>}
    </section>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', position: 'sticky', bottom: 0, padding: '14px 0', background: 'var(--background)', borderTop: '1px solid var(--border)' }}><button type="button" className="button button-outline" disabled={step === 1} onClick={() => setStep((step - 1) as Step)}><ArrowLeft size={14} /> Back</button><div style={{ display: 'flex', gap: '8px' }}>{step < 5 ? <button type="button" className="button button-primary" onClick={() => goTo((step + 1) as Step)}>Continue <ArrowRight size={14} /></button> : <><button type="button" className="button button-outline" disabled={pending} onClick={() => submit(false)}>{pending ? <Loader2 size={14} className="spin" /> : 'Save Draft'}</button><button type="button" className="button button-primary" disabled={pending} onClick={() => submit(true)}>{pending ? <Loader2 size={14} className="spin" /> : <><Check size={14} /> Submit for Review</>}</button></>}</div></div>
  </form>
}
