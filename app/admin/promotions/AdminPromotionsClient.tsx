'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  Sparkles,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Layers,
  ArrowRight,
  Percent,
  Banknote,
  Gift,
  Truck,
  Ticket,
  Eye,
  Calendar,
  Sliders,
  Upload,
  ImageIcon
} from 'lucide-react'
import {
  Promotion,
  PromotionType,
  PromotionStatus,
  AppliesToScope,
  getEffectivePromotionStatus,
  getPromotionBadgeText
} from '@/lib/promotions-shared'
import {
  savePromotionAction,
  deletePromotionAction,
  togglePromotionStatusAction
} from '@/lib/promotions'
import { Product } from '@/lib/catalog'

interface AdminPromotionsClientProps {
  initialPromotions: Promotion[]
  categories: { id: string; name: string; slug: string }[]
  products: Product[]
}

export function AdminPromotionsClient({
  initialPromotions,
  categories,
  products
}: AdminPromotionsClientProps) {
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'scheduled' | 'paused' | 'expired' | 'hero'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Wizard Step: 1 = Type, 2 = Details & Scope, 3 = When & Where, 4 = Review
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formType, setFormType] = useState<PromotionType>('percentage')
  const [formDiscountValue, setFormDiscountValue] = useState<number>(20)
  const [formBogoBuyQty, setFormBogoBuyQty] = useState<number>(1)
  const [formBogoGetQty, setFormBogoGetQty] = useState<number>(1)
  const [formBogoDiscountPercent, setFormBogoDiscountPercent] = useState<number>(100)
  const [formCouponCode, setFormCouponCode] = useState('')
  const [formAppliesTo, setFormAppliesTo] = useState<AppliesToScope>('all')
  const [formTargetIds, setFormTargetIds] = useState<string[]>([])
  const [formMinCartValue, setFormMinCartValue] = useState<string>('')
  const [formMinQuantity, setFormMinQuantity] = useState<string>('')
  const [formMaxDiscountAmount, setFormMaxDiscountAmount] = useState<string>('')
  const [formUsageLimit, setFormUsageLimit] = useState<string>('')
  const [formPerCustomerLimit, setFormPerCustomerLimit] = useState<string>('1')
  
  // Date scheduling
  const [formStartImmediate, setFormStartImmediate] = useState<boolean>(true)
  const [formEndNever, setFormEndNever] = useState<boolean>(true)
  const [formStartsAt, setFormStartsAt] = useState<string>('')
  const [formEndsAt, setFormEndsAt] = useState<string>('')
  const [formStatus, setFormStatus] = useState<PromotionStatus>('active')
  const [formAllowStacking, setFormAllowStacking] = useState<boolean>(false)

  // Storefront presentation
  const [formShowHero, setFormShowHero] = useState<boolean>(true)
  const [formHeroBadge, setFormHeroBadge] = useState<string>('LIMITED OFFER')
  const [formHeroHeadline, setFormHeroHeadline] = useState<string>('')
  const [formHeroSubheading, setFormHeroSubheading] = useState<string>('')
  const [formHeroCtaText, setFormHeroCtaText] = useState<string>('SHOP THE OFFER')
  const [formHeroImageUrl, setFormHeroImageUrl] = useState<string>('')
  const [formDisplayPriority, setFormDisplayPriority] = useState<number>(10)

  // Product selection filter in wizard
  const [productSearch, setProductSearch] = useState('')

  // Hero image upload state
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingImage(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        setFormHeroImageUrl(data.url)
      } else if (data.error) {
        setErrorMsg(data.error)
      }
    } catch {
      setErrorMsg('Failed to upload hero image.')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const CAMPAIGN_PRESETS = [
    { label: 'SS26 Campaign', url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85' },
    { label: 'Tailored Essentials', url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85' },
    { label: 'Festive Silks', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1800&q=85' }
  ]

  // Open modal for creation
  const handleOpenCreate = () => {
    setEditingId(null)
    setWizardStep(1)
    setShowAdvanced(false)
    setFormName('')
    setFormSlug('')
    setFormDescription('')
    setFormType('percentage')
    setFormDiscountValue(20)
    setFormBogoBuyQty(1)
    setFormBogoGetQty(1)
    setFormBogoDiscountPercent(100)
    setFormCouponCode('')
    setFormAppliesTo('all')
    setFormTargetIds([])
    setFormMinCartValue('')
    setFormMinQuantity('')
    setFormMaxDiscountAmount('')
    setFormUsageLimit('')
    setFormPerCustomerLimit('1')
    setFormStartImmediate(true)
    setFormEndNever(true)
    setFormStartsAt(new Date().toISOString().substring(0, 16))
    setFormEndsAt('')
    setFormStatus('active')
    setFormAllowStacking(false)
    setFormShowHero(true)
    setFormHeroBadge('LIMITED OFFER')
    setFormHeroHeadline('')
    setFormHeroSubheading('')
    setFormHeroCtaText('SHOP THE OFFER')
    setFormHeroImageUrl('')
    setFormDisplayPriority(10)
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsModalOpen(true)
  }

  // Open modal for editing
  const handleOpenEdit = (promo: Promotion) => {
    setEditingId(promo.id)
    setWizardStep(2) // Jump straight to details
    setShowAdvanced(false)
    setFormName(promo.name)
    setFormSlug(promo.slug)
    setFormDescription(promo.description || '')
    setFormType(promo.type)
    setFormDiscountValue(promo.discount_value)
    setFormBogoBuyQty(promo.bogo_buy_qty || 1)
    setFormBogoGetQty(promo.bogo_get_qty || 1)
    setFormBogoDiscountPercent(promo.bogo_discount_percent ?? 100)
    setFormCouponCode(promo.coupon_code || '')
    setFormAppliesTo(promo.applies_to)
    setFormTargetIds(promo.target_ids || [])
    setFormMinCartValue(promo.min_cart_value ? String(promo.min_cart_value) : '')
    setFormMinQuantity(promo.min_quantity ? String(promo.min_quantity) : '')
    setFormMaxDiscountAmount(promo.max_discount_amount ? String(promo.max_discount_amount) : '')
    setFormUsageLimit(promo.usage_limit ? String(promo.usage_limit) : '')
    setFormPerCustomerLimit(promo.per_customer_limit ? String(promo.per_customer_limit) : '1')
    
    setFormStartImmediate(!promo.starts_at)
    setFormStartsAt(promo.starts_at ? new Date(promo.starts_at).toISOString().substring(0, 16) : '')
    setFormEndNever(!promo.ends_at)
    setFormEndsAt(promo.ends_at ? new Date(promo.ends_at).toISOString().substring(0, 16) : '')

    setFormStatus(promo.status)
    setFormAllowStacking(promo.allow_stacking)
    setFormShowHero(promo.show_on_homepage_hero)
    setFormHeroBadge(promo.hero_badge || 'LIMITED OFFER')
    setFormHeroHeadline(promo.hero_headline || '')
    setFormHeroSubheading(promo.hero_subheading || '')
    setFormHeroCtaText(promo.hero_cta_text || 'SHOP THE OFFER')
    setFormHeroImageUrl(promo.hero_image_url || '')
    setFormDisplayPriority(promo.display_priority || 10)
    setErrorMsg(null)
    setSuccessMsg(null)
    setIsModalOpen(true)
  }

  // Quick preset selection in Step 1
  const handleSelectOfferType = (type: PromotionType) => {
    setFormType(type)
    if (type === 'percentage') {
      setFormDiscountValue(20)
      if (!formName) setFormName('20% Off Selection')
    } else if (type === 'flat') {
      setFormDiscountValue(500)
      if (!formName) setFormName('Flat ₹500 Off')
    } else if (type === 'bogo') {
      setFormBogoBuyQty(1)
      setFormBogoGetQty(1)
      setFormBogoDiscountPercent(100)
      if (!formName) setFormName('Buy 1 Get 1 Free')
    } else if (type === 'free_shipping') {
      setFormMinCartValue('1499')
      if (!formName) setFormName('Complimentary Shipping')
    } else if (type === 'coupon') {
      setFormDiscountValue(500)
      if (!formCouponCode) setFormCouponCode('SENO500')
      if (!formName) setFormName('SENO500 Coupon')
    }
    setWizardStep(2)
  }

  // Compute live badge
  const previewBadge =
    formType === 'percentage'
      ? `${Math.round(formDiscountValue)}% OFF`
      : formType === 'flat'
      ? `₹${Math.round(formDiscountValue)} OFF`
      : formType === 'bogo'
      ? formBogoBuyQty === 1 && formBogoGetQty === 1
        ? 'BUY 1 GET 1 FREE'
        : `BUY ${formBogoBuyQty} GET ${formBogoGetQty}`
      : formType === 'free_shipping'
      ? 'FREE SHIPPING'
      : formCouponCode
      ? formCouponCode
      : 'SPECIAL OFFER'

  // Human-readable BOGO explanation
  const getBogoExplanation = () => {
    if (formBogoBuyQty === 1 && formBogoGetQty === 1 && formBogoDiscountPercent === 100) {
      return 'Customers buy 1 eligible item and receive 1 eligible item free.'
    }
    if (formBogoBuyQty === 2 && formBogoGetQty === 1 && formBogoDiscountPercent === 100) {
      return 'Customers must add 3 eligible items to receive the lowest-priced eligible item free.'
    }
    return `Customers buy ${formBogoBuyQty} eligible item(s) to unlock ${formBogoGetQty} item(s) at ${formBogoDiscountPercent}% off.`
  }

  // Handle Form Submit
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!formName.trim()) {
      setErrorMsg('Offer name is required.')
      setWizardStep(2)
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const payload: Partial<Promotion> & { name: string; type: PromotionType } = {
      id: editingId || undefined,
      name: formName.trim(),
      slug: formSlug.trim() || undefined,
      description: formDescription.trim() || null,
      type: formType,
      discount_value: Number(formDiscountValue || 0),
      bogo_buy_qty: Number(formBogoBuyQty || 1),
      bogo_get_qty: Number(formBogoGetQty || 1),
      bogo_discount_percent: Number(formBogoDiscountPercent ?? 100),
      coupon_code: formCouponCode.trim() ? formCouponCode.trim().toUpperCase() : null,
      applies_to: formAppliesTo,
      target_ids: formTargetIds,
      min_cart_value: formMinCartValue ? Number(formMinCartValue) : null,
      min_quantity: formMinQuantity ? Number(formMinQuantity) : null,
      max_discount_amount: formMaxDiscountAmount ? Number(formMaxDiscountAmount) : null,
      usage_limit: formUsageLimit ? Number(formUsageLimit) : null,
      per_customer_limit: formPerCustomerLimit ? Number(formPerCustomerLimit) : 1,
      starts_at: formStartImmediate ? new Date().toISOString() : formStartsAt ? new Date(formStartsAt).toISOString() : new Date().toISOString(),
      ends_at: formEndNever ? null : formEndsAt ? new Date(formEndsAt).toISOString() : null,
      status: formStatus,
      allow_stacking: formAllowStacking,
      show_on_homepage_hero: formShowHero,
      hero_badge: formHeroBadge.trim() || previewBadge,
      hero_headline: formHeroHeadline.trim() || formName.toUpperCase(),
      hero_subheading: formHeroSubheading.trim() || formDescription || null,
      hero_cta_text: formHeroCtaText.trim() || 'SHOP THE OFFER',
      hero_image_url: formHeroImageUrl.trim() || null,
      display_priority: Number(formDisplayPriority || 10)
    }

    const res = await savePromotionAction(payload)
    setIsSubmitting(false)

    if (res.success && res.promotion) {
      setSuccessMsg(`Offer "${res.promotion.name}" saved successfully.`)
      setPromotions(prev => {
        const idx = prev.findIndex(p => p.id === res.promotion!.id)
        if (idx > -1) {
          const updated = [...prev]
          updated[idx] = res.promotion!
          return updated
        }
        return [res.promotion!, ...prev]
      })
      setTimeout(() => {
        setIsModalOpen(false)
        setSuccessMsg(null)
      }, 700)
    } else {
      setErrorMsg(res.error || 'Failed to save offer.')
    }
  }

  // Toggle Pause/Active
  const handleToggleStatus = async (promo: Promotion) => {
    const newStatus: PromotionStatus = promo.status === 'active' ? 'paused' : 'active'
    const res = await togglePromotionStatusAction(promo.id, newStatus)
    if (res.success) {
      setPromotions(prev =>
        prev.map(p => (p.id === promo.id ? { ...p, status: newStatus } : p))
      )
    }
  }

  // Delete
  const handleDelete = async (promo: Promotion) => {
    if (!confirm(`Are you sure you want to delete "${promo.name}"?`)) return
    const res = await deletePromotionAction(promo.id)
    if (res.success) {
      setPromotions(prev => prev.filter(p => p.id !== promo.id))
    }
  }

  // Filter list
  const filteredPromotions = promotions.filter(p => {
    const effective = getEffectivePromotionStatus(p)
    if (activeTab === 'all') return true
    if (activeTab === 'hero') return p.show_on_homepage_hero && effective === 'active'
    if (activeTab === 'active') return effective === 'active'
    if (activeTab === 'scheduled') return effective === 'scheduled'
    if (activeTab === 'paused') return p.status === 'paused'
    if (activeTab === 'expired') return effective === 'expired'
    return true
  })

  // Filter products for selection
  const filteredProductsForSelect = products.filter(p =>
    productSearch ? p.name.toLowerCase().includes(productSearch.toLowerCase()) : true
  )

  return (
    <div className="admin-page-container" style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div>
          <span className="section-kicker">COMMERCE OPERATIONS</span>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, color: 'var(--ink)', margin: '4px 0 0' }}>
            Offers & Promotions
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '13.5px', margin: '4px 0 0' }}>
            Create and schedule customer promotions, coupon codes, and dynamic homepage hero campaigns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Link
            href="/offers"
            target="_blank"
            className="dark-btn"
            style={{
              padding: '11px 18px',
              fontSize: '11.5px',
              background: '#fff',
              color: 'var(--ink)',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>View Storefront Offers</span>
            <ExternalLink size={13} />
          </Link>

          <button
            onClick={handleOpenCreate}
            className="dark-btn"
            style={{
              padding: '11px 22px',
              fontSize: '11.5px',
              letterSpacing: '1px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} />
            <span>+ Create Offer</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '18px 20px', borderRadius: '3px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Active Offers</span>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '26px', margin: '4px 0 0', fontWeight: 500, color: 'var(--ink)' }}>
            {promotions.filter(p => getEffectivePromotionStatus(p) === 'active').length}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '18px 20px', borderRadius: '3px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Homepage Hero Slides</span>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '26px', margin: '4px 0 0', fontWeight: 500, color: 'var(--ink)' }}>
            {promotions.filter(p => p.show_on_homepage_hero && getEffectivePromotionStatus(p) === 'active').length}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '18px 20px', borderRadius: '3px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Scheduled</span>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '26px', margin: '4px 0 0', fontWeight: 500, color: 'var(--ink)' }}>
            {promotions.filter(p => getEffectivePromotionStatus(p) === 'scheduled').length}
          </p>
        </div>
        <div style={{ background: '#fff', border: '1px solid var(--border)', padding: '18px 20px', borderRadius: '3px' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Total Redemptions</span>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '26px', margin: '4px 0 0', fontWeight: 500, color: 'var(--ink)' }}>
            {promotions.reduce((sum, p) => sum + (p.usage_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', marginBottom: '24px', overflowX: 'auto' }}>
        {(
          [
            { id: 'all', label: 'All Offers' },
            { id: 'active', label: 'Active' },
            { id: 'hero', label: 'Homepage Hero' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'paused', label: 'Paused' },
            { id: 'expired', label: 'Expired' }
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: activeTab === tab.id ? 600 : 400,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--ink)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--ink)' : 'var(--muted)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Promotions List */}
      {filteredPromotions.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', border: '1px solid var(--border)', borderRadius: '3px' }}>
          <Tag size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: 'var(--ink)', margin: '0 0 6px' }}>
            No offers found in this view.
          </p>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px' }}>
            Create an offer using our visual 3-step builder.
          </p>
          <button onClick={handleOpenCreate} className="dark-btn" style={{ padding: '10px 22px', fontSize: '11px' }}>
            + Create An Offer
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredPromotions.map(promo => {
            const effective = getEffectivePromotionStatus(promo)
            const badgeText = getPromotionBadgeText(promo)
            return (
              <div
                key={promo.id}
                style={{
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: '3px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div style={{ flex: '1 1 450px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span
                      style={{
                        fontSize: '9.5px',
                        letterSpacing: '1px',
                        fontWeight: 600,
                        padding: '3px 7px',
                        borderRadius: '2px',
                        textTransform: 'uppercase',
                        background:
                          effective === 'active'
                            ? '#e8f5e9'
                            : effective === 'scheduled'
                            ? '#fff8e1'
                            : effective === 'paused'
                            ? '#f5f5f5'
                            : '#ffebee',
                        color:
                          effective === 'active'
                            ? '#2e7d32'
                            : effective === 'scheduled'
                            ? '#f57f17'
                            : effective === 'paused'
                            ? '#616161'
                            : '#c62828'
                      }}
                    >
                      {effective}
                    </span>

                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '2px',
                        background: 'var(--ink)',
                        color: '#fff',
                        letterSpacing: '0.8px'
                      }}
                    >
                      {badgeText}
                    </span>

                    {promo.show_on_homepage_hero && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 7px',
                          borderRadius: '2px',
                          background: '#fcf8e3',
                          color: '#8a6d3b',
                          fontWeight: 600
                        }}
                      >
                        <Sparkles size={11} /> HERO SLIDE
                      </span>
                    )}

                    {promo.coupon_code && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'monospace',
                          padding: '2px 6px',
                          background: '#f0f0f0',
                          border: '1px dashed #bbb',
                          borderRadius: '2px'
                        }}
                      >
                        CODE: {promo.coupon_code}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 500, margin: '2px 0 4px', color: 'var(--ink)' }}>
                    {promo.name}
                  </h3>
                  <p style={{ margin: '0 0 8px', fontSize: '12.5px', color: 'var(--muted)' }}>
                    {promo.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px', color: 'var(--muted)', flexWrap: 'wrap' }}>
                    <span>
                      <strong>Scope:</strong> {promo.applies_to.toUpperCase()}
                      {promo.target_ids.length > 0 ? ` (${promo.target_ids.length} selected)` : ''}
                    </span>
                    {promo.min_cart_value ? <span><strong>Min Spend:</strong> ₹{promo.min_cart_value}</span> : null}
                    {promo.max_discount_amount ? <span><strong>Max Cap:</strong> ₹{promo.max_discount_amount}</span> : null}
                    {promo.ends_at ? (
                      <span><strong>Ends:</strong> {new Date(promo.ends_at).toLocaleDateString('en-IN')}</span>
                    ) : (
                      <span><strong>Ends:</strong> Ongoing</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => handleToggleStatus(promo)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11.5px',
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      borderRadius: '2px'
                    }}
                    title={promo.status === 'active' ? 'Pause offer' : 'Activate offer'}
                  >
                    {promo.status === 'active' ? (
                      <>
                        <Pause size={12} /> Pause
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Activate
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(promo)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      padding: '8px 12px',
                      background: '#fff',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      borderRadius: '2px'
                    }}
                  >
                    <Edit2 size={12} /> Edit
                  </button>

                  <button
                    onClick={() => handleDelete(promo)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '8px 10px',
                      background: '#fff',
                      border: '1px solid #ffcdd2',
                      color: '#d32f2f',
                      cursor: 'pointer',
                      borderRadius: '2px'
                    }}
                    title="Delete promotion"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          GUIDED 3-STEP OFFER WIZARD MODAL
          ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: '860px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '3px',
              padding: '28px 32px',
              position: 'relative',
              boxShadow: '0 24px 48px rgba(0,0,0,0.22)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
              <div>
                <span className="section-kicker" style={{ margin: 0 }}>OFFER BUILDER</span>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', margin: '4px 0 0', fontWeight: 500, color: 'var(--ink)' }}>
                  {editingId ? 'Edit Offer' : 'Create an Offer'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicator Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px',
                marginBottom: '24px',
                background: '#f9f9f9',
                padding: '10px 14px',
                borderRadius: '3px',
                border: '1px solid var(--border)'
              }}
            >
              {[
                { step: 1, label: '1. OFFER TYPE' },
                { step: 2, label: '2. DETAILS' },
                { step: 3, label: '3. SCHEDULE' },
                { step: 4, label: '4. CONFIRM' }
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setWizardStep(s.step as any)}
                  style={{
                    background: wizardStep === s.step ? 'var(--ink)' : 'transparent',
                    color: wizardStep === s.step ? '#fff' : 'var(--muted)',
                    border: 'none',
                    padding: '6px 8px',
                    borderRadius: '2px',
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.8px',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {errorMsg && (
              <div style={{ background: '#ffebee', border: '1px solid #ffcdd2', color: '#b71c1c', padding: '10px 14px', borderRadius: '2px', fontSize: '12.5px', marginBottom: '16px' }}>
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div style={{ background: '#e8f5e9', border: '1px solid #c8e6c9', color: '#1b5e20', padding: '10px 14px', borderRadius: '2px', fontSize: '12.5px', marginBottom: '16px' }}>
                {successMsg}
              </div>
            )}

            {/* Layout: Main Wizard Form + Live Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '28px' }}>
              <div>
                {/* ----------------------------------------------------
                    STEP 1: WHAT DO YOU WANT TO OFFER?
                    ---------------------------------------------------- */}
                {wizardStep === 1 && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px', margin: '0 0 16px', color: 'var(--ink)' }}>
                      STEP 1 — WHAT DO YOU WANT TO OFFER?
                    </h3>
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '0 0 20px' }}>
                      Select a promotion structure to get started with sensible defaults.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      {/* 1. Percentage Discount */}
                      <div
                        onClick={() => handleSelectOfferType('percentage')}
                        style={{
                          border: formType === 'percentage' ? '2px solid var(--ink)' : '1px solid var(--border)',
                          padding: '18px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: formType === 'percentage' ? '#fcfaf6' : '#fff',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <Percent size={20} color="var(--ink)" />
                          <strong style={{ fontSize: '13px' }}>% DISCOUNT</strong>
                        </div>
                        <p style={{ fontSize: '19px', fontFamily: 'Georgia, serif', margin: '0 0 4px', color: 'var(--ink)' }}>
                          20% OFF
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Percentage savings across entire store or specific styles.
                        </span>
                      </div>

                      {/* 2. Flat Discount */}
                      <div
                        onClick={() => handleSelectOfferType('flat')}
                        style={{
                          border: formType === 'flat' ? '2px solid var(--ink)' : '1px solid var(--border)',
                          padding: '18px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: formType === 'flat' ? '#fcfaf6' : '#fff',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <Banknote size={20} color="var(--ink)" />
                          <strong style={{ fontSize: '13px' }}>FLAT DISCOUNT</strong>
                        </div>
                        <p style={{ fontSize: '19px', fontFamily: 'Georgia, serif', margin: '0 0 4px', color: 'var(--ink)' }}>
                          ₹500 OFF
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Fixed rupee reduction for orders meeting spend threshold.
                        </span>
                      </div>

                      {/* 3. Buy & Get */}
                      <div
                        onClick={() => handleSelectOfferType('bogo')}
                        style={{
                          border: formType === 'bogo' ? '2px solid var(--ink)' : '1px solid var(--border)',
                          padding: '18px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: formType === 'bogo' ? '#fcfaf6' : '#fff',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <Gift size={20} color="var(--ink)" />
                          <strong style={{ fontSize: '13px' }}>BUY & GET</strong>
                        </div>
                        <p style={{ fontSize: '19px', fontFamily: 'Georgia, serif', margin: '0 0 4px', color: 'var(--ink)' }}>
                          Buy 1 Get 1 Free
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Encourage volume with complimentary or discounted companion items.
                        </span>
                      </div>

                      {/* 4. Free Shipping */}
                      <div
                        onClick={() => handleSelectOfferType('free_shipping')}
                        style={{
                          border: formType === 'free_shipping' ? '2px solid var(--ink)' : '1px solid var(--border)',
                          padding: '18px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: formType === 'free_shipping' ? '#fcfaf6' : '#fff',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                          <Truck size={20} color="var(--ink)" />
                          <strong style={{ fontSize: '13px' }}>FREE SHIPPING</strong>
                        </div>
                        <p style={{ fontSize: '19px', fontFamily: 'Georgia, serif', margin: '0 0 4px', color: 'var(--ink)' }}>
                          Complimentary Delivery
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Free express dispatch above a specified cart spend.
                        </span>
                      </div>

                      {/* 5. Coupon Code */}
                      <div
                        onClick={() => handleSelectOfferType('coupon')}
                        style={{
                          gridColumn: 'span 2',
                          border: formType === 'coupon' ? '2px solid var(--ink)' : '1px solid var(--border)',
                          padding: '18px',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          background: formType === 'coupon' ? '#fcfaf6' : '#fff',
                          transition: 'border-color 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <Ticket size={20} color="var(--ink)" />
                          <strong style={{ fontSize: '13px' }}>COUPON CODE EXCLUSIVE</strong>
                        </div>
                        <p style={{ fontSize: '19px', fontFamily: 'Georgia, serif', margin: '0 0 4px', color: 'var(--ink)' }}>
                          SENO500
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          Requires customer to enter a specific secret or public promotional voucher code at checkout.
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------
                    STEP 2: SET THE OFFER
                    ---------------------------------------------------- */}
                {wizardStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px', margin: 0, color: 'var(--ink)' }}>
                      STEP 2 — SET THE OFFER DETAILS
                    </h3>

                    {/* Offer Name */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                        OFFER NAME *
                      </label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => {
                          setFormName(e.target.value)
                          if (!editingId && !formSlug) {
                            setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
                          }
                        }}
                        placeholder="e.g. Diwali Festive Sale"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                      />
                    </div>

                    {/* Contextual Value Inputs based on Type */}
                    {formType === 'percentage' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            DISCOUNT (%) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={formDiscountValue}
                            onChange={e => setFormDiscountValue(Number(e.target.value))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            MAXIMUM DISCOUNT CAP (₹) <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formMaxDiscountAmount}
                            onChange={e => setFormMaxDiscountAmount(e.target.value)}
                            placeholder="e.g. 1000"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                          />
                        </div>
                      </div>
                    )}

                    {formType === 'flat' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            DISCOUNT AMOUNT (₹) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={formDiscountValue}
                            onChange={e => setFormDiscountValue(Number(e.target.value))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            MINIMUM ORDER (₹) <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={formMinCartValue}
                            onChange={e => setFormMinCartValue(e.target.value)}
                            placeholder="e.g. 2500"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                          />
                        </div>
                      </div>
                    )}

                    {formType === 'bogo' && (
                      <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '16px', borderRadius: '3px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                              BUY ITEM(S)
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={formBogoBuyQty}
                              onChange={e => setFormBogoBuyQty(Number(e.target.value))}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '13px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                              GET ITEM(S)
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={formBogoGetQty}
                              onChange={e => setFormBogoGetQty(Number(e.target.value))}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '13px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                              DISCOUNT ON GET ITEM
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={formBogoDiscountPercent}
                              onChange={e => setFormBogoDiscountPercent(Number(e.target.value))}
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                        <div style={{ background: '#eef2f6', padding: '10px 12px', borderRadius: '2px', fontSize: '12px', color: '#1e3a5f' }}>
                          💡 <strong>How this works:</strong> {getBogoExplanation()}
                        </div>
                      </div>
                    )}

                    {formType === 'free_shipping' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                          MINIMUM CART VALUE FOR FREE SHIPPING (₹)
                        </label>
                        <input
                          type="number"
                          value={formMinCartValue}
                          onChange={e => setFormMinCartValue(e.target.value)}
                          placeholder="e.g. 1499"
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                        />
                      </div>
                    )}

                    {formType === 'coupon' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            COUPON CODE *
                          </label>
                          <input
                            type="text"
                            required
                            value={formCouponCode}
                            onChange={e => setFormCouponCode(e.target.value.toUpperCase())}
                            placeholder="e.g. SENO500"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px', fontFamily: 'monospace' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                            DISCOUNT AMOUNT (₹) *
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={formDiscountValue}
                            onChange={e => setFormDiscountValue(Number(e.target.value))}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Applies To Scope */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                        APPLIES TO
                      </label>
                      <select
                        value={formAppliesTo}
                        onChange={e => {
                          setFormAppliesTo(e.target.value as AppliesToScope)
                          setFormTargetIds([])
                        }}
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px', background: '#fff' }}
                      >
                        <option value="all">Entire Store (All Products)</option>
                        <option value="category">Specific Category</option>
                        <option value="collection">Specific Collection</option>
                        <option value="products">Selected Products</option>
                      </select>
                    </div>

                    {/* Contextual Scope Target Picker */}
                    {formAppliesTo === 'category' && (
                      <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '14px', borderRadius: '2px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                          CHOOSE CATEGORY
                        </label>
                        <select
                          value={formTargetIds[0] || ''}
                          onChange={e => setFormTargetIds([e.target.value])}
                          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="">Select a category...</option>
                          {categories.map(cat => (
                            <option key={cat.id} value={cat.slug}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formAppliesTo === 'collection' && (
                      <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '14px', borderRadius: '2px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                          CHOOSE COLLECTION
                        </label>
                        <select
                          value={formTargetIds[0] || ''}
                          onChange={e => setFormTargetIds([e.target.value])}
                          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', fontSize: '13px', background: '#fff' }}
                        >
                          <option value="">Select a collection...</option>
                          <option value="new-arrivals">New Arrivals</option>
                          <option value="bestsellers">Bestsellers</option>
                          <option value="cosmetics">Cosmetics & Beauty</option>
                        </select>
                      </div>
                    )}

                    {formAppliesTo === 'products' && (
                      <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '14px', borderRadius: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <label style={{ fontSize: '11px', fontWeight: 600 }}>
                            SELECT PRODUCTS ({formTargetIds.length} selected)
                          </label>
                          <input
                            type="text"
                            placeholder="Filter by product name..."
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '2px' }}
                          />
                        </div>
                        <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', background: '#fff', padding: '8px' }}>
                          {filteredProductsForSelect.map(prod => {
                            const isChecked = formTargetIds.includes(prod.id)
                            return (
                              <label
                                key={prod.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '5px 8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  background: isChecked ? '#f5f5f5' : 'transparent',
                                  borderRadius: '2px'
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setFormTargetIds(prev => [...prev, prod.id])
                                    } else {
                                      setFormTargetIds(prev => prev.filter(id => id !== prod.id))
                                    }
                                  }}
                                />
                                <span>{prod.name} ({prod.category})</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Minimum Order spend if not already shown */}
                    {formType !== 'flat' && formType !== 'free_shipping' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '6px' }}>
                          MINIMUM ORDER VALUE (₹) <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={formMinCartValue}
                          onChange={e => setFormMinCartValue(e.target.value)}
                          placeholder="Leave blank for no minimum spend requirement"
                          style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '2px' }}
                        />
                      </div>
                    )}

                    {/* Expandable Advanced Settings */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '6px' }}>
                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--ink)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 0'
                        }}
                      >
                        <Sliders size={14} />
                        <span>Advanced settings</span>
                        {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {showAdvanced && (
                        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px', background: '#fafafa', padding: '16px', borderRadius: '3px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                                TOTAL USAGE LIMIT
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={formUsageLimit}
                                onChange={e => setFormUsageLimit(e.target.value)}
                                placeholder="Unlimited"
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                                PER-CUSTOMER LIMIT
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={formPerCustomerLimit}
                                onChange={e => setFormPerCustomerLimit(e.target.value)}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                              />
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                                DISPLAY PRIORITY (0–100)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={formDisplayPriority}
                                onChange={e => setFormDisplayPriority(Number(e.target.value))}
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                                URL DESTINATION SLUG
                              </label>
                              <input
                                type="text"
                                value={formSlug}
                                onChange={e => setFormSlug(e.target.value)}
                                placeholder="auto-generated-from-name"
                                style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                              />
                            </div>
                          </div>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                            <input
                              type="checkbox"
                              checked={formAllowStacking}
                              onChange={e => setFormAllowStacking(e.target.checked)}
                            />
                            <span>Allow stacking with other coupons / promotions</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ----------------------------------------------------
                    STEP 3: WHEN & WHERE
                    ---------------------------------------------------- */}
                {wizardStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px', margin: 0, color: 'var(--ink)' }}>
                      STEP 3 — WHEN & WHERE SHOULD THIS APPEAR?
                    </h3>

                    {/* Schedule */}
                    <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '16px', borderRadius: '3px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.6px', display: 'block', marginBottom: '12px' }}>
                        OFFER DURATION
                      </span>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                            START TIME
                          </label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="start_mode"
                                checked={formStartImmediate}
                                onChange={() => setFormStartImmediate(true)}
                              />
                              <span>Immediately</span>
                            </label>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="start_mode"
                                checked={!formStartImmediate}
                                onChange={() => setFormStartImmediate(false)}
                              />
                              <span>Pick Date</span>
                            </label>
                          </div>
                          {!formStartImmediate && (
                            <input
                              type="datetime-local"
                              value={formStartsAt}
                              onChange={e => setFormStartsAt(e.target.value)}
                              style={{ width: '100%', marginTop: '8px', padding: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                            />
                          )}
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                            END TIME
                          </label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="end_mode"
                                checked={formEndNever}
                                onChange={() => setFormEndNever(true)}
                              />
                              <span>Never (Ongoing)</span>
                            </label>
                            <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                              <input
                                type="radio"
                                name="end_mode"
                                checked={!formEndNever}
                                onChange={() => setFormEndNever(false)}
                              />
                              <span>Pick Date</span>
                            </label>
                          </div>
                          {!formEndNever && (
                            <input
                              type="datetime-local"
                              value={formEndsAt}
                              onChange={e => setFormEndsAt(e.target.value)}
                              style={{ width: '100%', marginTop: '8px', padding: '8px', border: '1px solid var(--border)', fontSize: '12px' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Storefront Display Toggles */}
                    <div style={{ background: '#fafafa', border: '1px solid var(--border)', padding: '16px', borderRadius: '3px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.6px', display: 'block', marginBottom: '12px' }}>
                        SHOW ON STOREFRONT
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={formShowHero}
                            onChange={e => setFormShowHero(e.target.checked)}
                          />
                          <span><strong>Homepage Hero Slide</strong> (Displays as dynamic slide in the hero carousel)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                          <input type="checkbox" checked disabled />
                          <span><strong>Product Pages & Cards</strong> (Editorial badge displayed on qualifying items)</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
                          <input type="checkbox" checked disabled />
                          <span><strong>Dedicated /offers Landing Page</strong> (Available on public offers index)</span>
                        </label>
                      </div>
                    </div>

                    {/* Hero Slide Customization (If Hero checked) */}
                    {formShowHero && (
                      <div style={{ border: '1px dashed var(--border)', padding: '16px', borderRadius: '3px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.6px', display: 'block', marginBottom: '12px' }}>
                          HERO SLIDE CUSTOMIZATION
                        </span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                              HERO BADGE KICKER
                            </label>
                            <input
                              type="text"
                              value={formHeroBadge}
                              onChange={e => setFormHeroBadge(e.target.value)}
                              placeholder="e.g. LIMITED OFFER"
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                              CTA BUTTON TEXT
                            </label>
                            <input
                              type="text"
                              value={formHeroCtaText}
                              onChange={e => setFormHeroCtaText(e.target.value)}
                              placeholder="SHOP THE OFFER"
                              style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                            />
                          </div>
                        </div>

                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
                            HERO HEADLINE (UPPERCASE)
                          </label>
                          <input
                            type="text"
                            value={formHeroHeadline}
                            onChange={e => setFormHeroHeadline(e.target.value)}
                            placeholder="e.g. 20% OFF SELECTED STYLES"
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12.5px' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>
                            HERO SLIDE IMAGE
                          </label>

                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageFileChange}
                          />

                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingImage}
                              style={{
                                padding: '8px 14px',
                                background: '#fff',
                                border: '1px solid var(--border)',
                                borderRadius: '2px',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                            >
                              <Upload size={13} />
                              <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                            </button>

                            {formHeroImageUrl && (
                              <button
                                type="button"
                                onClick={() => setFormHeroImageUrl('')}
                                style={{
                                  padding: '8px 10px',
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--muted)',
                                  fontSize: '11px',
                                  cursor: 'pointer',
                                  textDecoration: 'underline'
                                }}
                              >
                                Use Default Fallback
                              </button>
                            )}
                          </div>

                          {/* Quick Campaign Presets */}
                          <div style={{ marginBottom: '10px' }}>
                            <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                              Or pick from curated SENO campaign imagery:
                            </span>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {CAMPAIGN_PRESETS.map((p, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setFormHeroImageUrl(p.url)}
                                  style={{
                                    border: formHeroImageUrl === p.url ? '2px solid var(--ink)' : '1px solid var(--border)',
                                    borderRadius: '2px',
                                    padding: '4px 8px',
                                    fontSize: '10.5px',
                                    background: '#fff',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <input
                            type="url"
                            value={formHeroImageUrl}
                            onChange={e => setFormHeroImageUrl(e.target.value)}
                            placeholder="Or paste an image URL (optional)..."
                            style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', fontSize: '12px', borderRadius: '2px' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ----------------------------------------------------
                    STEP 4: FINAL CONFIRMATION & REVIEW
                    ---------------------------------------------------- */}
                {wizardStep === 4 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, letterSpacing: '0.5px', margin: 0, color: 'var(--ink)' }}>
                      STEP 4 — CONFIRM & CREATE OFFER
                    </h3>

                    <div style={{ background: '#faf8f5', border: '1px solid #e0d8cc', padding: '24px', borderRadius: '3px' }}>
                      <span style={{ fontSize: '10px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                        HUMAN-READABLE SUMMARY
                      </span>
                      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 400, color: 'var(--ink)', margin: '8px 0 14px' }}>
                        {formName || 'Untitled Offer'}
                      </h2>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13.5px', color: 'var(--ink)' }}>
                        <div>
                          <strong>Offer:</strong> <span style={{ background: 'var(--ink)', color: '#fff', padding: '2px 7px', borderRadius: '2px', fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>{previewBadge}</span>
                        </div>
                        <div>
                          <strong>Applies to:</strong> {formAppliesTo === 'all' ? 'Entire Store' : formAppliesTo.toUpperCase()} {formTargetIds.length > 0 ? `(${formTargetIds.length} targets)` : ''}
                        </div>
                        <div>
                          <strong>Schedule:</strong> {formStartImmediate ? 'Starts immediately' : `From ${formStartsAt}`} → {formEndNever ? 'Ongoing' : `Until ${formEndsAt}`}
                        </div>
                        <div>
                          <strong>Storefront Hero:</strong> {formShowHero ? 'Enabled (Active on homepage)' : 'Disabled'}
                        </div>
                        {formMinCartValue ? (
                          <div>
                            <strong>Minimum Spend:</strong> ₹{Number(formMinCartValue).toLocaleString('en-IN')}
                          </div>
                        ) : null}
                        {formCouponCode ? (
                          <div>
                            <strong>Checkout Coupon:</strong> <code>{formCouponCode}</code>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                      This promotion will be saved directly into the authoritative discount engine and activated across storefront product cards, cart, and checkout.
                    </p>
                  </div>
                )}

                {/* Wizard Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '28px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  {wizardStep > 1 ? (
                    <button
                      type="button"
                      onClick={() => setWizardStep((wizardStep - 1) as any)}
                      style={{
                        padding: '10px 18px',
                        background: '#fff',
                        border: '1px solid var(--border)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                  ) : <div />}

                  {wizardStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (wizardStep === 2 && !formName.trim()) {
                          setErrorMsg('Please provide an offer name before proceeding.')
                          return
                        }
                        setErrorMsg(null)
                        setWizardStep((wizardStep + 1) as any)
                      }}
                      className="dark-btn"
                      style={{ padding: '10px 22px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <span>Continue</span>
                      <ChevronRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="dark-btn"
                      style={{ padding: '12px 28px', fontSize: '12px', letterSpacing: '1.2px', background: 'var(--ink)' }}
                    >
                      {isSubmitting ? 'Saving...' : editingId ? 'UPDATE OFFER' : 'CREATE OFFER'}
                    </button>
                  )}
                </div>
              </div>

              {/* ----------------------------------------------------
                  LIVE CUSTOMER PREVIEW CARD (Updates dynamically)
                  ---------------------------------------------------- */}
              <div>
                <div style={{ position: 'sticky', top: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Eye size={13} color="var(--muted)" />
                    <span style={{ fontSize: '10px', letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 600 }}>
                      CUSTOMER WILL SEE
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#fff',
                      border: '1px solid var(--border)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.06)'
                    }}
                  >
                    {/* Simulated Hero image */}
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        background: formHeroImageUrl ? `url(${formHeroImageUrl}) center/cover no-repeat` : '#e8e5df',
                        position: 'relative'
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          background: 'var(--ink)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: '2px',
                          letterSpacing: '0.8px'
                        }}
                      >
                        {previewBadge}
                      </span>
                    </div>

                    <div style={{ padding: '16px' }}>
                      <span style={{ fontSize: '9px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        {formHeroBadge || 'LIMITED OFFER'}
                      </span>
                      <h4 style={{ fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 500, margin: '0 0 6px', color: 'var(--ink)', lineHeight: 1.3 }}>
                        {formHeroHeadline || formName.toUpperCase() || 'OFFER HEADLINE'}
                      </h4>
                      <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                        {formHeroSubheading || formDescription || 'Discover selected pieces included in this promotion.'}
                      </p>
                      <div
                        style={{
                          background: 'var(--ink)',
                          color: '#fff',
                          textAlign: 'center',
                          padding: '9px',
                          fontSize: '10px',
                          letterSpacing: '1.2px',
                          fontWeight: 600
                        }}
                      >
                        {formHeroCtaText || 'SHOP THE OFFER'} →
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
