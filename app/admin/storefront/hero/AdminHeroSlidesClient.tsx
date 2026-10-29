'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  Upload,
  CheckCircle,
  AlertCircle,
  X,
  Sliders,
  ExternalLink,
  ChevronRight,
  ImageIcon,
  Smartphone,
  Monitor,
  Check
} from 'lucide-react'
import type { HeroSlideRecord } from '@/lib/hero-slides-shared'
import {
  saveHeroSlideAction,
  deleteHeroSlideAction,
  toggleHeroSlideStatusAction,
  reorderHeroSlidesAction
} from '@/lib/hero-slides'

interface AdminHeroSlidesClientProps {
  initialSlides: HeroSlideRecord[]
}

const PRESET_CAMPAIGN_IMAGES = [
  {
    label: 'SS26 Campaign (Editorial Model)',
    url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=85'
  },
  {
    label: 'Tailored Essentials (Minimal Studio)',
    url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1800&q=85'
  },
  {
    label: 'Festive Silks (Rich Warm Tones)',
    url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1800&q=85'
  },
  {
    label: 'Monochrome Silhouettes (Modern Drapery)',
    url: 'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1800&q=85'
  }
]

export function AdminHeroSlidesClient({ initialSlides }: AdminHeroSlidesClientProps) {
  const [slides, setSlides] = useState<HeroSlideRecord[]>(initialSlides)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Slide being edited (null = new slide)
  const [editingSlide, setEditingSlide] = useState<HeroSlideRecord | null>(null)

  // Delete confirmation
  const [deletingSlide, setDeletingSlide] = useState<HeroSlideRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Editor Form Fields
  const [formTitle, setFormTitle] = useState('')
  const [formEyebrow, setFormEyebrow] = useState('')
  const [formHeadline, setFormHeadline] = useState('')
  const [formSubheading, setFormSubheading] = useState('')
  const [formCtaText, setFormCtaText] = useState('SHOP NOW')
  const [formCtaLink, setFormCtaLink] = useState('/collections/new-arrivals')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formMobileImageUrl, setFormMobileImageUrl] = useState('')
  const [formImageAlt, setFormImageAlt] = useState('')
  const [formFocalPoint, setFormFocalPoint] = useState<string>('center')
  const [formTextAlignment, setFormTextAlignment] = useState<'left' | 'center' | 'right'>('left')
  const [formContentPlacement, setFormContentPlacement] = useState<'bottom-left' | 'center-left' | 'center' | 'bottom-center'>('bottom-left')
  const [formOverlayOpacity, setFormOverlayOpacity] = useState<number>(25)
  const [formIsActive, setFormIsActive] = useState<boolean>(true)
  const [formPriority, setFormPriority] = useState<number>(1)

  // Upload state
  const desktopFileInputRef = useRef<HTMLInputElement>(null)
  const mobileFileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingDesktop, setIsUploadingDesktop] = useState(false)
  const [isUploadingMobile, setIsUploadingMobile] = useState(false)

  // Preview Mode inside editor
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')

  const openNewSlideModal = () => {
    setEditingSlide(null)
    setFormTitle('')
    setFormEyebrow('SPRING / SUMMER 26')
    setFormHeadline('New forms\nfor everyday.')
    setFormSubheading('Considered clothing for everyday life.')
    setFormCtaText('SHOP NOW')
    setFormCtaLink('/collections/new-arrivals')
    setFormImageUrl(PRESET_CAMPAIGN_IMAGES[0].url)
    setFormMobileImageUrl('')
    setFormImageAlt('')
    setFormFocalPoint('center')
    setFormTextAlignment('left')
    setFormContentPlacement('bottom-left')
    setFormOverlayOpacity(25)
    setFormIsActive(true)
    setFormPriority(slides.length + 1)
    setFeedbackMsg(null)
    setIsEditorOpen(true)
  }

  const openEditSlideModal = (slide: HeroSlideRecord) => {
    setEditingSlide(slide)
    setFormTitle(slide.title || '')
    setFormEyebrow(slide.eyebrow || '')
    setFormHeadline(slide.headline || '')
    setFormSubheading(slide.subheading || '')
    setFormCtaText(slide.cta_text || 'SHOP NOW')
    setFormCtaLink(slide.cta_link || '/collections/all')
    setFormImageUrl(slide.image_url || '')
    setFormMobileImageUrl(slide.mobile_image_url || '')
    setFormImageAlt(slide.image_alt || '')
    setFormFocalPoint(slide.image_focal_point || 'center')
    setFormTextAlignment(slide.text_alignment || 'left')
    setFormContentPlacement(slide.content_placement || 'bottom-left')
    setFormOverlayOpacity(slide.overlay_opacity ?? 25)
    setFormIsActive(slide.is_active)
    setFormPriority(slide.display_priority)
    setFeedbackMsg(null)
    setIsEditorOpen(true)
  }

  // Upload file handler
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, isMobile = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isMobile) setIsUploadingMobile(true)
    else setIsUploadingDesktop(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.url) {
        if (isMobile) setFormMobileImageUrl(data.url)
        else setFormImageUrl(data.url)
      } else if (data.error) {
        setFeedbackMsg({ type: 'error', text: data.error })
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Image upload failed. Please verify format (JPG, PNG, WebP) and size (<5MB).' })
    } finally {
      if (isMobile) setIsUploadingMobile(false)
      else setIsUploadingDesktop(false)
      e.target.value = ''
    }
  }

  // Save slide
  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Slide title is required for admin identification.' })
      return
    }
    if (!formHeadline.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Headline is required.' })
      return
    }
    if (!formImageUrl.trim()) {
      setFeedbackMsg({ type: 'error', text: 'Desktop background image is required.' })
      return
    }

    setIsSubmitting(true)
    setFeedbackMsg(null)

    try {
      const payload: Partial<HeroSlideRecord> & { title: string; headline: string } = {
        id: editingSlide?.id,
        title: formTitle.trim(),
        eyebrow: formEyebrow.trim() || null,
        headline: formHeadline.trim(),
        subheading: formSubheading.trim() || null,
        cta_text: formCtaText.trim() || 'SHOP NOW',
        cta_link: formCtaLink.trim() || '/collections/all',
        image_url: formImageUrl.trim(),
        mobile_image_url: formMobileImageUrl.trim() || null,
        image_alt: formImageAlt.trim() || formTitle.trim(),
        image_focal_point: formFocalPoint,
        text_alignment: formTextAlignment,
        content_placement: formContentPlacement,
        overlay_opacity: formOverlayOpacity,
        is_active: formIsActive,
        display_priority: Number(formPriority) || 1
      }

      const res = await saveHeroSlideAction(payload)
      if (res.success && res.slide) {
        const saved = res.slide
        setSlides(prev => {
          const idx = prev.findIndex(s => s.id === saved.id)
          let updated: HeroSlideRecord[]
          if (idx >= 0) {
            updated = [...prev]
            updated[idx] = saved
          } else {
            updated = [...prev, saved]
          }
          return updated.sort((a, b) => a.display_priority - b.display_priority)
        })

        setIsEditorOpen(false)
        setFeedbackMsg({ type: 'success', text: `Slide "${saved.title}" saved successfully. Homepage updated.` })
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to save slide.' })
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err?.message || 'Unexpected server error while saving slide.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle active/inactive
  const handleToggleStatus = async (slide: HeroSlideRecord) => {
    const nextStatus = !slide.is_active
    setSlides(prev => prev.map(s => (s.id === slide.id ? { ...s, is_active: nextStatus } : s)))

    try {
      const res = await toggleHeroSlideStatusAction(slide.id, nextStatus)
      if (!res.success) {
        // Revert on failure
        setSlides(prev => prev.map(s => (s.id === slide.id ? { ...s, is_active: !nextStatus } : s)))
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to update slide status.' })
      } else {
        setFeedbackMsg({
          type: 'success',
          text: `Slide "${slide.title}" is now ${nextStatus ? 'ACTIVE on storefront' : 'INACTIVE (hidden from customers)'}. Database updated and homepage revalidated.`
        })
      }
    } catch {
      setSlides(prev => prev.map(s => (s.id === slide.id ? { ...s, is_active: !nextStatus } : s)))
      setFeedbackMsg({ type: 'error', text: 'Network error updating slide status.' })
    }
  }

  // Move slide up or down
  const handleMoveSlide = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= slides.length) return

    const previousSlides = [...slides]
    const reordered = [...slides]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    // Update priorities sequentially
    const updatedWithPriority = reordered.map((slide, idx) => ({
      ...slide,
      display_priority: idx + 1
    }))

    setSlides(updatedWithPriority)

    try {
      const orderedIds = updatedWithPriority.map(s => s.id)
      const res = await reorderHeroSlidesAction(orderedIds)
      if (res.success) {
        setFeedbackMsg({
          type: 'success',
          text: `Slide order updated: "${moved.title}" moved to position #${targetIndex + 1}. Database updated and homepage revalidated.`
        })
      } else {
        setSlides(previousSlides)
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to persist slide reordering.' })
      }
    } catch {
      setSlides(previousSlides)
      setFeedbackMsg({ type: 'error', text: 'Error saving new slide order.' })
    }
  }

  // Delete slide
  const handleDeleteSlide = async () => {
    if (!deletingSlide) return
    setIsDeleting(true)

    try {
      const res = await deleteHeroSlideAction(deletingSlide.id)
      if (res.success) {
        setSlides(prev => prev.filter(s => s.id !== deletingSlide.id))
        setDeletingSlide(null)
        setFeedbackMsg({ type: 'success', text: `Slide "${deletingSlide.title}" was permanently removed.` })
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to delete slide.' })
      }
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Server error deleting slide.' })
    } finally {
      setIsDeleting(false)
    }
  }

  // Active slides count
  const activeCount = slides.filter(s => s.is_active).length

  return (
    <div className="admin-page-container" style={{ padding: '24px 32px 80px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            <span>Storefront</span>
            <span>/</span>
            <span>Hero Management</span>
          </div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 400, color: 'var(--ink)', margin: 0 }}>
            Homepage Hero Carousel
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>
            Manage, customize, and reorder all homepage hero slides. Every slide—including the primary opening slide—is fully editable with instant storefront revalidation.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link
            href="/"
            target="_blank"
            className="outline-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '11px', letterSpacing: '1px' }}
          >
            <span>VIEW LIVE STORE</span>
            <ExternalLink size={13} />
          </Link>

          <button
            type="button"
            className="dark-btn"
            onClick={openNewSlideModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '11px', letterSpacing: '1.2px' }}
          >
            <Plus size={14} />
            <span>CREATE SLIDE</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert Notice */}
      {feedbackMsg && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: '4px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '12.5px',
            background: feedbackMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${feedbackMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            color: feedbackMsg.type === 'success' ? '#166534' : '#991b1b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {feedbackMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px' }}
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Overview Stat Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '4px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
            Total Configured Slides
          </span>
          <strong style={{ fontSize: '24px', fontWeight: 600, color: 'var(--ink)' }}>{slides.length}</strong>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '4px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
            Active on Storefront
          </span>
          <strong style={{ fontSize: '24px', fontWeight: 600, color: activeCount > 0 ? '#166534' : 'var(--clay)' }}>
            {activeCount} {activeCount === 1 ? 'Slide' : 'Slides'}
          </strong>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '4px' }}>
          <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
            Opening Leader Slide
          </span>
          <strong style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {slides.find(s => s.is_active)?.title || 'Default SENO Campaign'}
          </strong>
        </div>
      </div>

      {/* Main Slides Ordering & Management Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)', margin: 0, letterSpacing: '0.5px' }}>
              Slide Display Order &amp; Priority
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: '3px 0 0' }}>
              Rank 1 is the primary opening slide. Use the Move Up / Move Down controls to sequence the carousel.
            </p>
          </div>
        </div>

        {slides.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted)' }}>
            <Sliders size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: '0 0 12px', fontSize: '14px' }}>No hero slides found.</p>
            <button type="button" className="dark-btn" onClick={openNewSlideModal} style={{ padding: '8px 16px', fontSize: '11px' }}>
              CREATE FIRST SLIDE
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  <th style={{ padding: '12px 16px', width: '110px' }}>Rank &amp; Order</th>
                  <th style={{ padding: '12px 16px', width: '120px' }}>Visual</th>
                  <th style={{ padding: '12px 16px' }}>Slide Content</th>
                  <th style={{ padding: '12px 16px', width: '180px' }}>Action Button</th>
                  <th style={{ padding: '12px 16px', width: '130px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slides.map((slide, index) => {
                  const isFirst = index === 0
                  const isLast = index === slides.length - 1

                  return (
                    <tr
                      key={slide.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: slide.is_active ? 'transparent' : 'rgba(0,0,0,0.015)',
                        opacity: slide.is_active ? 1 : 0.65,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {/* Priority Ranking & Move Controls */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: isFirst && slide.is_active ? 'var(--ink)' : 'var(--surface-subtle)',
                              color: isFirst && slide.is_active ? '#fff' : 'var(--ink)',
                              fontWeight: 700,
                              fontSize: '11px',
                              border: '1px solid var(--border)'
                            }}
                          >
                            {index + 1}
                          </span>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveSlide(index, 'up')}
                              disabled={isFirst}
                              title="Move slide up"
                              style={{
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                borderRadius: '2px',
                                padding: '3px 4px',
                                cursor: isFirst ? 'not-allowed' : 'pointer',
                                opacity: isFirst ? 0.3 : 1
                              }}
                            >
                              <ArrowUp size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSlide(index, 'down')}
                              disabled={isLast}
                              title="Move slide down"
                              style={{
                                border: '1px solid var(--border)',
                                background: 'var(--surface)',
                                borderRadius: '2px',
                                padding: '3px 4px',
                                cursor: isLast ? 'not-allowed' : 'pointer',
                                opacity: isLast ? 0.3 : 1
                              }}
                            >
                              <ArrowDown size={11} />
                            </button>
                          </div>
                        </div>

                        {isFirst && slide.is_active && (
                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 700, color: 'var(--clay)', letterSpacing: '0.8px', marginTop: '4px' }}>
                            ★ OPENING LEADER
                          </span>
                        )}
                      </td>

                      {/* Visual Thumbnail */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ width: '96px', height: '64px', borderRadius: '3px', overflow: 'hidden', background: 'var(--card-bg)', position: 'relative', border: '1px solid var(--border)' }}>
                          <img
                            src={slide.image_url}
                            alt={slide.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: slide.image_focal_point || 'center' }}
                          />
                          {slide.mobile_image_url && (
                            <span
                              title="Has separate mobile image"
                              style={{
                                position: 'absolute',
                                bottom: '2px',
                                right: '2px',
                                background: 'rgba(0,0,0,0.7)',
                                color: '#fff',
                                padding: '1px 3px',
                                borderRadius: '2px',
                                fontSize: '8px'
                              }}
                            >
                              MOB
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Slide Content */}
                      <td style={{ padding: '16px' }}>
                        <div>
                          {slide.eyebrow && (
                            <span style={{ fontSize: '9.5px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block' }}>
                              {slide.eyebrow}
                            </span>
                          )}
                          <strong style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block', margin: '2px 0 3px' }}>
                            {slide.title}
                          </strong>
                          <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '380px' }}>
                            {slide.headline.replace(/\n/g, ' ')}
                          </p>
                        </div>
                      </td>

                      {/* CTA Info */}
                      <td style={{ padding: '16px' }}>
                        <div>
                          <strong style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', display: 'block' }}>
                            {slide.cta_text || 'SHOP NOW'}
                          </strong>
                          <span style={{ fontSize: '10.5px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                            {slide.cta_link || '/collections/all'}
                          </span>
                        </div>
                      </td>

                      {/* Status Toggle Switch */}
                      <td style={{ padding: '16px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(slide)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            border: `1px solid ${slide.is_active ? '#bbf7d0' : 'var(--border)'}`,
                            background: slide.is_active ? '#f0fdf4' : 'var(--surface-subtle)',
                            color: slide.is_active ? '#166534' : 'var(--muted)'
                          }}
                        >
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: slide.is_active ? '#166534' : 'var(--muted)'
                            }}
                          />
                          <span>{slide.is_active ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>

                      {/* Row Actions */}
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => openEditSlideModal(slide)}
                            title="Edit slide content, images, and layout"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '6px 12px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '3px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingSlide(slide)}
                            title="Delete slide"
                            style={{
                              padding: '6px 8px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '3px',
                              color: '#991b1b',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide Editor Modal */}
      {isEditorOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', margin: 0, color: 'var(--ink)' }}>
                  {editingSlide ? `Edit Slide: ${editingSlide.title}` : 'Create New Hero Slide'}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Customize imagery, typography, CTA buttons, responsive mobile assets, and positioning.
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Split between form settings and live preview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', flex: 1, overflowY: 'auto' }}>
              {/* Left Column: Form Controls */}
              <form onSubmit={handleSaveSlide} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Basic Meta */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Slide Reference Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. New forms for everyday"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Eyebrow / Campaign Season
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SPRING / SUMMER 26"
                      value={formEyebrow}
                      onChange={e => setFormEyebrow(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Headline & Subheading */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Headline * (Multi-line supported)
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Press Enter to add line breaks in editorial headings.
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={formHeadline}
                    onChange={e => setFormHeadline(e.target.value)}
                    style={{ width: '100%', fontFamily: 'Georgia, serif', fontSize: '15px' }}
                    placeholder="New forms&#10;for everyday."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Subheading / Description
                  </label>
                  <input
                    type="text"
                    value={formSubheading}
                    onChange={e => setFormSubheading(e.target.value)}
                    placeholder="e.g. Considered clothing for everyday life."
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Call to Action Button */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                      CTA Button Text *
                    </label>
                    <input
                      type="text"
                      required
                      value={formCtaText}
                      onChange={e => setFormCtaText(e.target.value)}
                      placeholder="SHOP NOW"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                      CTA Destination URL *
                    </label>
                    <input
                      type="text"
                      required
                      value={formCtaLink}
                      onChange={e => setFormCtaLink(e.target.value)}
                      placeholder="/collections/new-arrivals"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Desktop Background Image & Upload */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Desktop Background Image *
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="url"
                      required
                      value={formImageUrl}
                      onChange={e => setFormImageUrl(e.target.value)}
                      placeholder="https://..."
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      ref={desktopFileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={e => handleUploadFile(e, false)}
                    />
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => desktopFileInputRef.current?.click()}
                      disabled={isUploadingDesktop}
                      style={{ padding: '10px 14px', fontSize: '11px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={13} />
                      <span>{isUploadingDesktop ? 'Uploading...' : 'Upload'}</span>
                    </button>
                  </div>

                  {/* Preset quick selection */}
                  <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', alignSelf: 'center' }}>Presets:</span>
                    {PRESET_CAMPAIGN_IMAGES.map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => setFormImageUrl(preset.url)}
                        style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '2px',
                          border: '1px solid var(--border)',
                          background: formImageUrl === preset.url ? 'var(--ink)' : 'var(--surface)',
                          color: formImageUrl === preset.url ? '#fff' : 'var(--muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {preset.label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Background Image (Optional) */}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Mobile Background Image (Optional)
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>
                    Provide a portrait-oriented image optimized specifically for smartphones.
                  </span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="url"
                      value={formMobileImageUrl}
                      onChange={e => setFormMobileImageUrl(e.target.value)}
                      placeholder="Optional separate mobile image URL"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="file"
                      ref={mobileFileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={e => handleUploadFile(e, true)}
                    />
                    <button
                      type="button"
                      className="outline-btn"
                      onClick={() => mobileFileInputRef.current?.click()}
                      disabled={isUploadingMobile}
                      style={{ padding: '10px 14px', fontSize: '11px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={13} />
                      <span>{isUploadingMobile ? 'Uploading...' : 'Upload'}</span>
                    </button>
                  </div>
                </div>

                {/* Focal Point, Alignment, Placement, and Overlay */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Image Focal Point
                    </label>
                    <select
                      value={formFocalPoint}
                      onChange={e => setFormFocalPoint(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="center">Center</option>
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Text Alignment
                    </label>
                    <select
                      value={formTextAlignment}
                      onChange={e => setFormTextAlignment(e.target.value as any)}
                      style={{ width: '100%' }}
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Content Placement
                    </label>
                    <select
                      value={formContentPlacement}
                      onChange={e => setFormContentPlacement(e.target.value as any)}
                      style={{ width: '100%' }}
                    >
                      <option value="bottom-left">Bottom Left</option>
                      <option value="center-left">Center Left</option>
                      <option value="center">Center</option>
                      <option value="bottom-center">Bottom Center</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Overlay Darkness: {formOverlayOpacity}%
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={75}
                      step={5}
                      value={formOverlayOpacity}
                      onChange={e => setFormOverlayOpacity(Number(e.target.value))}
                      style={{ width: '100%', marginTop: '6px' }}
                    />
                  </div>
                </div>

                {/* Priority & Active Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                      Display Priority:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={formPriority}
                      onChange={e => setFormPriority(Number(e.target.value))}
                      style={{ width: '64px', padding: '6px 8px' }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>(1 = first slide)</span>
                  </div>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={e => setFormIsActive(e.target.checked)}
                    />
                    <span>Active on Storefront</span>
                  </label>
                </div>

                {/* Form Submit Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="outline-btn"
                    onClick={() => setIsEditorOpen(false)}
                    disabled={isSubmitting}
                    style={{ padding: '10px 18px', fontSize: '11px' }}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="dark-btn"
                    disabled={isSubmitting}
                    style={{ padding: '10px 22px', fontSize: '11px', letterSpacing: '1px' }}
                  >
                    {isSubmitting ? 'Saving...' : editingSlide ? 'UPDATE SLIDE' : 'PUBLISH SLIDE'}
                  </button>
                </div>
              </form>

              {/* Right Column: Live Responsive Preview */}
              <div style={{ background: 'var(--surface-subtle)', borderLeft: '1px solid var(--border)', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    Live Preview
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('desktop')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '2px',
                        border: '1px solid var(--border)',
                        background: previewDevice === 'desktop' ? 'var(--ink)' : 'var(--surface)',
                        color: previewDevice === 'desktop' ? '#fff' : 'var(--muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px'
                      }}
                    >
                      <Monitor size={12} /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice('mobile')}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '2px',
                        border: '1px solid var(--border)',
                        background: previewDevice === 'mobile' ? 'var(--ink)' : 'var(--surface)',
                        color: previewDevice === 'mobile' ? '#fff' : 'var(--muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px'
                      }}
                    >
                      <Smartphone size={12} /> Mobile
                    </button>
                  </div>
                </div>

                {/* Simulated Hero Carousel Frame */}
                <div
                  style={{
                    position: 'relative',
                    width: previewDevice === 'mobile' ? '280px' : '100%',
                    margin: previewDevice === 'mobile' ? '0 auto' : '0',
                    aspectRatio: previewDevice === 'mobile' ? '9 / 16' : '16 / 10',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#111',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    border: '1px solid var(--border)'
                  }}
                >
                  {/* Image */}
                  <img
                    src={(previewDevice === 'mobile' && formMobileImageUrl) ? formMobileImageUrl : formImageUrl}
                    alt={formTitle}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: formFocalPoint || 'center'
                    }}
                  />

                  {/* Tint Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: `rgba(0, 0, 0, ${formOverlayOpacity / 100})`,
                      pointerEvents: 'none'
                    }}
                  />

                  {/* Content Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      padding: previewDevice === 'mobile' ? '18px 14px' : '24px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent:
                        formContentPlacement === 'center'
                          ? 'center'
                          : formContentPlacement === 'center-left'
                            ? 'center'
                            : 'flex-end',
                      alignItems:
                        formContentPlacement === 'center' || formContentPlacement === 'bottom-center'
                          ? 'center'
                          : 'flex-start',
                      textAlign: formTextAlignment,
                      color: '#ffffff'
                    }}
                  >
                    {formEyebrow && (
                      <span style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', opacity: 0.9, marginBottom: '6px' }}>
                        {formEyebrow}
                      </span>
                    )}

                    <h4
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: previewDevice === 'mobile' ? '18px' : '22px',
                        fontWeight: 400,
                        lineHeight: 1.1,
                        margin: '0 0 6px',
                        letterSpacing: '-0.5px'
                      }}
                    >
                      {formHeadline.split('\n').map((line, idx) => (
                        <React.Fragment key={idx}>
                          {line}
                          {idx < formHeadline.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))}
                    </h4>

                    {formSubheading && (
                      <p style={{ fontSize: '11px', opacity: 0.85, margin: '0 0 10px', lineHeight: 1.3 }}>
                        {formSubheading}
                      </p>
                    )}

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        background: '#ffffff',
                        color: '#111111',
                        fontSize: '9.5px',
                        fontWeight: 600,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        borderRadius: '2px',
                        alignSelf: formTextAlignment === 'center' ? 'center' : formTextAlignment === 'right' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      {formCtaText || 'SHOP NOW'} →
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: '16px', fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>
                  <p style={{ margin: '0 0 4px' }}>
                    ✦ <strong>Storefront Integration:</strong> Saved changes immediately invalidate cached homepage slides.
                  </p>
                  <p style={{ margin: 0 }}>
                    ✦ <strong>Responsive Isolation:</strong> Separate mobile artwork prevents awkward cropping on phones.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSlide && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(3px)',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '4px',
              padding: '24px',
              maxWidth: '440px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: 'var(--ink)', margin: '0 0 8px' }}>
              Remove Hero Slide?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Are you sure you want to remove <strong>"{deletingSlide.title}"</strong> from the homepage carousel? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="outline-btn"
                onClick={() => setDeletingSlide(null)}
                disabled={isDeleting}
                style={{ padding: '8px 16px', fontSize: '11px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dark-btn"
                onClick={handleDeleteSlide}
                disabled={isDeleting}
                style={{ padding: '8px 18px', fontSize: '11px', background: '#991b1b', borderColor: '#991b1b' }}
              >
                {isDeleting ? 'Deleting...' : 'DELETE SLIDE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
