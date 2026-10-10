'use server'

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { supabase as publicSupabase } from '@/lib/supabase'
import { checkIsAdmin } from '@/lib/admin'
import { Product, getCatalogProducts, getCollectionProducts } from '@/lib/catalog'
import { CartItem } from '@/context/StoreContext'
import { revalidatePath } from 'next/cache'
import {
  Promotion,
  PromotionType,
  PromotionStatus,
  AppliesToScope,
  PromotionEvaluationResult,
  getEffectivePromotionStatus,
  isProductEligibleForPromotion,
  getPromotionBadgeText
} from './promotions-shared'

export type {
  Promotion,
  PromotionType,
  PromotionStatus,
  AppliesToScope,
  PromotionEvaluationResult
}
export { getEffectivePromotionStatus, isProductEligibleForPromotion, getPromotionBadgeText }

const LOCAL_DATA_PATH = path.join(process.cwd(), 'data', 'promotions.json')

function readLocalPromotions(): Promotion[] {
  try {
    if (fs.existsSync(LOCAL_DATA_PATH)) {
      const raw = fs.readFileSync(LOCAL_DATA_PATH, 'utf-8')
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch (err) {
    console.error('Error reading local promotions:', err)
  }
  return []
}

function writeLocalPromotions(promotions: Promotion[]): void {
  try {
    const dir = path.dirname(LOCAL_DATA_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(LOCAL_DATA_PATH, JSON.stringify(promotions, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing local promotions:', err)
  }
}

/**
 * Retrieves all promotions. Supabase is strictly authoritative in production.
 * If the Supabase table has 0 records, returns an empty array.
 */
export async function getAllPromotions(): Promise<Promotion[]> {
  try {
    const { data, error } = await publicSupabase
      .from('promotions')
      .select('*')
      .order('display_priority', { ascending: false })
      .order('created_at', { ascending: false })

    // If query succeeded (even if data is []), Supabase is authoritative!
    if (!error && Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        target_ids: Array.isArray(item.target_ids) ? item.target_ids : []
      }))
    }

    if (error) {
      console.warn('[Promotions] Supabase query notice:', error.message)
    }
  } catch (err) {
    console.warn('[Promotions] Supabase connection error:', err)
  }

  // Development-only fallback when DB table does not exist or local offline dev
  if (process.env.NODE_ENV !== 'production') {
    return readLocalPromotions().map(p => ({
      ...p,
      status: getEffectivePromotionStatus(p)
    }))
  }

  return []
}

/**
 * Retrieves all currently active and valid promotions.
 */
export async function getActivePromotions(): Promise<Promotion[]> {
  const all = await getAllPromotions()
  return all
    .filter(promo => getEffectivePromotionStatus(promo) === 'active')
    .sort((a, b) => (b.display_priority || 0) - (a.display_priority || 0))
}

/**
 * Retrieves promotions featured on the Homepage Hero (capped at 4).
 */
export async function getFeaturedHeroPromotions(): Promise<Promotion[]> {
  const active = await getActivePromotions()
  return active
    .filter(promo => promo.show_on_homepage_hero)
    .slice(0, 4)
}

/**
 * Retrieves a single promotion by its unique slug.
 */
export async function getPromotionBySlug(slug: string): Promise<Promotion | null> {
  try {
    const { data, error } = await publicSupabase
      .from('promotions')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (!error && data) {
      return {
        ...data,
        target_ids: Array.isArray(data.target_ids) ? data.target_ids : []
      }
    }
  } catch {
    // fallback if DB not available in dev
  }

  if (process.env.NODE_ENV !== 'production') {
    const all = readLocalPromotions()
    return all.find(p => p.slug === slug) || null
  }

  return null
}



/**
 * Fetches all products eligible for a specific promotion.
 */
export async function getEligibleProductsForPromotion(promo: Promotion): Promise<Product[]> {
  const allProducts = await getCatalogProducts({ limit: 60 })
  return allProducts.filter((p: Product) => isProductEligibleForPromotion(p, promo))
}

/**
 * Authoritative Server-Side Discount Calculation Engine.
 * Evaluates active promotions, applies stacking constraints, and computes final discount.
 */
export async function evaluateCartDiscount(params: {
  cart: CartItem[]
  promotionCode?: string | null
  shippingFee?: number
}): Promise<PromotionEvaluationResult> {
  const { cart, promotionCode, shippingFee = 0 } = params

  if (!cart || cart.length === 0) {
    return {
      appliedPromotion: null,
      promotionType: null,
      promotionName: null,
      promotionId: null,
      discountAmount: 0,
      isFreeShipping: false,
      shippingDiscount: 0,
      discountLabel: null,
      message: null,
      subMessage: null,
      status: 'none'
    }
  }

  const activePromotions = await getActivePromotions()
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.qty, 0)
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0)

  // 1. Identify Candidate Promotions
  let candidatePromotions: Promotion[] = []

  if (promotionCode && promotionCode.trim() !== '') {
    const normalizedCode = promotionCode.trim().toUpperCase()
    const matchedCoupon = activePromotions.find(
      p => p.coupon_code && p.coupon_code.toUpperCase() === normalizedCode
    )

    if (!matchedCoupon) {
      return {
        appliedPromotion: null,
        promotionType: null,
        promotionName: null,
        promotionId: null,
        discountAmount: 0,
        isFreeShipping: false,
        shippingDiscount: 0,
        discountLabel: null,
        message: `Promo code "${promotionCode.trim().toUpperCase()}" is invalid or expired.`,
        subMessage: null,
        status: 'ineligible'
      }
    }
    candidatePromotions = [matchedCoupon]
  } else {
    // Automatic promotions (without coupon code) sorted by display_priority DESC
    candidatePromotions = activePromotions
      .filter(p => !p.coupon_code)
      .sort((a, b) => (b.display_priority || 0) - (a.display_priority || 0))
  }

  if (candidatePromotions.length === 0) {
    return {
      appliedPromotion: null,
      promotionType: null,
      promotionName: null,
      promotionId: null,
      discountAmount: 0,
      isFreeShipping: false,
      shippingDiscount: 0,
      discountLabel: null,
      message: null,
      subMessage: null,
      status: 'none'
    }
  }

  // 2. Evaluate all candidate promotions
  interface EvaluatedPromo {
    promotion: Promotion
    status: 'applied' | 'threshold_not_met' | 'ineligible'
    computedDiscount: number
    isFreeShipping: boolean
    complimentaryItemsCount?: number
    discountLabel?: string
    message: string
    subMessage?: string | null
    reason: string
    progress?: {
      current: number
      target: number
      remaining: number
      type: 'amount' | 'quantity'
    }
  }

  const evaluated: EvaluatedPromo[] = []

  for (const promo of candidatePromotions) {
    const eligibleItems = cart.filter(item => isProductEligibleForPromotion(item.product, promo))

    if (eligibleItems.length === 0) {
      evaluated.push({
        promotion: promo,
        status: 'ineligible',
        computedDiscount: 0,
        isFreeShipping: false,
        message: 'This promotion only applies to selected styles.',
        subMessage: null,
        reason: 'No eligible items found in cart.'
      })
      continue
    }

    const eligibleSubtotal = eligibleItems.reduce((sum, i) => sum + i.unit_price * i.qty, 0)
    const eligibleQty = eligibleItems.reduce((sum, i) => sum + i.qty, 0)

    // Check minimum cart value requirement
    if (promo.min_cart_value && subtotal < promo.min_cart_value) {
      const remaining = promo.min_cart_value - subtotal
      const label =
        promo.type === 'percentage'
          ? `${promo.discount_value}% OFF`
          : promo.type === 'flat'
          ? `₹${promo.discount_value} OFF`
          : promo.name

      evaluated.push({
        promotion: promo,
        status: 'threshold_not_met',
        computedDiscount: 0,
        isFreeShipping: false,
        discountLabel: label,
        message: `Add ₹${Math.ceil(remaining).toLocaleString('en-IN')} more to unlock ${label}.`,
        subMessage: null,
        reason: `Subtotal ₹${subtotal} < min cart value ₹${promo.min_cart_value}.`,
        progress: {
          current: subtotal,
          target: promo.min_cart_value,
          remaining,
          type: 'amount'
        }
      })
      continue
    }

    // Check minimum quantity requirement
    if (promo.min_quantity && eligibleQty < promo.min_quantity) {
      const remaining = promo.min_quantity - eligibleQty
      evaluated.push({
        promotion: promo,
        status: 'threshold_not_met',
        computedDiscount: 0,
        isFreeShipping: false,
        discountLabel: promo.type === 'bogo' ? 'BUY 1 GET 1' : promo.name,
        message: `Add ${remaining} more eligible item${remaining > 1 ? 's' : ''} to unlock ${promo.name}.`,
        subMessage: null,
        reason: `Eligible quantity ${eligibleQty} < min quantity ${promo.min_quantity}.`,
        progress: {
          current: eligibleQty,
          target: promo.min_quantity,
          remaining,
          type: 'quantity'
        }
      })
      continue
    }

    // Calculate promotion-specific discount
    if (promo.type === 'bogo') {
      const buyQty = promo.bogo_buy_qty || 1
      const getQty = promo.bogo_get_qty || 1
      const groupSize = buyQty + getQty
      const discountPercent = (promo.bogo_discount_percent ?? 100) / 100

      const unitPrices: number[] = []
      eligibleItems.forEach(item => {
        for (let i = 0; i < item.qty; i++) {
          unitPrices.push(item.unit_price)
        }
      })
      unitPrices.sort((a, b) => a - b) // Cheapest items complimentary

      const totalEligibleUnits = unitPrices.length
      const completedGroups = Math.floor(totalEligibleUnits / groupSize)

      if (completedGroups > 0) {
        const freeUnitsCount = completedGroups * getQty
        let discount = 0
        for (let i = 0; i < freeUnitsCount; i++) {
          discount += unitPrices[i] * discountPercent
        }
        discount = Math.round(discount * 100) / 100

        evaluated.push({
          promotion: promo,
          status: 'applied',
          computedDiscount: discount,
          isFreeShipping: false,
          complimentaryItemsCount: freeUnitsCount,
          discountLabel: 'BUY 1 GET 1',
          message: `BUY 1 GET 1 — APPLIED`,
          subMessage: `${freeUnitsCount} complimentary piece${freeUnitsCount > 1 ? 's' : ''} included (-₹${discount.toLocaleString('en-IN')}).`,
          reason: `Qualified for BOGO (${completedGroups} group${completedGroups > 1 ? 's' : ''}).`
        })
      } else {
        const remainingToGroup = groupSize - totalEligibleUnits
        evaluated.push({
          promotion: promo,
          status: 'threshold_not_met',
          computedDiscount: 0,
          isFreeShipping: false,
          discountLabel: 'BUY 1 GET 1',
          message: `BUY 1 GET 1: Add ${remainingToGroup} more eligible piece${remainingToGroup > 1 ? 's' : ''} to unlock free piece.`,
          subMessage: null,
          reason: `Requires ${groupSize} items; currently has ${totalEligibleUnits}.`,
          progress: {
            current: totalEligibleUnits,
            target: groupSize,
            remaining: remainingToGroup,
            type: 'quantity'
          }
        })
      }
    } else if (promo.type === 'percentage') {
      const rawDiscount = (eligibleSubtotal * Number(promo.discount_value)) / 100
      const discount = promo.max_discount_amount
        ? Math.min(rawDiscount, Number(promo.max_discount_amount))
        : rawDiscount
      const rounded = Math.round(discount * 100) / 100

      evaluated.push({
        promotion: promo,
        status: 'applied',
        computedDiscount: rounded,
        isFreeShipping: false,
        discountLabel: `${Math.round(promo.discount_value)}% OFF`,
        message: `${promo.name} — APPLIED`,
        subMessage: `${Math.round(promo.discount_value)}% off qualifying pieces (-₹${rounded.toLocaleString('en-IN')}).`,
        reason: 'Qualified for percentage discount.'
      })
    } else if (promo.type === 'flat' || promo.type === 'coupon') {
      const rawDiscount = Number(promo.discount_value)
      const discount = Math.min(rawDiscount, eligibleSubtotal)
      const rounded = Math.round(discount * 100) / 100

      evaluated.push({
        promotion: promo,
        status: 'applied',
        computedDiscount: rounded,
        isFreeShipping: false,
        discountLabel: `₹${Math.round(promo.discount_value)} OFF`,
        message: `${promo.name} — APPLIED`,
        subMessage: `Flat savings of ₹${rounded.toLocaleString('en-IN')} applied.`,
        reason: 'Qualified for flat/coupon discount.'
      })
    } else if (promo.type === 'free_shipping') {
      evaluated.push({
        promotion: promo,
        status: 'applied',
        computedDiscount: shippingFee,
        isFreeShipping: true,
        discountLabel: 'FREE SHIPPING',
        message: `${promo.name} — APPLIED`,
        subMessage: 'Complimentary shipping across India applied.',
        reason: 'Qualified for free shipping.'
      })
    }
  }

  // 3. Deterministic Promotion Selection Engine
  const appliedCandidates = evaluated.filter(e => e.status === 'applied')
  const thresholdCandidates = evaluated.filter(e => e.status === 'threshold_not_met')

  if (appliedCandidates.length > 0) {
    // Sort applied candidates:
    // 1) display_priority DESC (admin configured precedence)
    // 2) computedDiscount DESC (best customer discount when priorities tie)
    // 3) created_at DESC / id ASC (strictly deterministic tiebreaker)
    appliedCandidates.sort((a, b) => {
      const pDiff = (b.promotion.display_priority || 0) - (a.promotion.display_priority || 0)
      if (pDiff !== 0) return pDiff
      const dDiff = b.computedDiscount - a.computedDiscount
      if (dDiff !== 0) return dDiff
      return (a.promotion.id || '').localeCompare(b.promotion.id || '')
    })

    const selected = appliedCandidates[0]

    // Check if any higher priority promotion was in threshold_not_met
    const higherPriorityThreshold = thresholdCandidates.find(
      t => (t.promotion.display_priority || 0) > (selected.promotion.display_priority || 0)
    )

    const result: PromotionEvaluationResult = {
      appliedPromotion: selected.promotion,
      promotionType: selected.promotion.type,
      promotionName: selected.promotion.name,
      promotionId: selected.promotion.id,
      discountAmount: selected.computedDiscount,
      isFreeShipping: selected.isFreeShipping,
      shippingDiscount: selected.isFreeShipping ? shippingFee : 0,
      discountLabel: selected.discountLabel || selected.promotion.name,
      message: selected.message,
      subMessage: selected.subMessage || null,
      status: 'applied',
      complimentaryItemsCount: selected.complimentaryItemsCount,
      pendingOpportunity: higherPriorityThreshold
        ? {
            promotion: higherPriorityThreshold.promotion,
            message: higherPriorityThreshold.message,
            remaining: higherPriorityThreshold.progress?.remaining || 1
          }
        : null,
      selectionReason: `Selected via configured priority ${selected.promotion.display_priority || 0} (${selected.reason})`,
      debug: evaluated.map(e => ({
        promotionName: e.promotion.name,
        priority: e.promotion.display_priority || 0,
        status: e.status,
        calculatedDiscount: e.computedDiscount,
        stackable: e.promotion.allow_stacking,
        reason: e.reason
      }))
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Promotion Engine] Selected: "${result.promotionName}" (-₹${result.discountAmount}) Reason: ${result.selectionReason}`)
    }

    return result
  }

  if (thresholdCandidates.length > 0) {
    thresholdCandidates.sort((a, b) => (b.promotion.display_priority || 0) - (a.promotion.display_priority || 0))
    const topThreshold = thresholdCandidates[0]

    return {
      appliedPromotion: topThreshold.promotion,
      promotionType: topThreshold.promotion.type,
      promotionName: topThreshold.promotion.name,
      promotionId: topThreshold.promotion.id,
      discountAmount: 0,
      isFreeShipping: false,
      shippingDiscount: 0,
      discountLabel: topThreshold.discountLabel || topThreshold.promotion.name,
      message: topThreshold.message,
      subMessage: null,
      status: 'threshold_not_met',
      progress: topThreshold.progress,
      selectionReason: `Top priority threshold candidate: ${topThreshold.reason}`,
      debug: evaluated.map(e => ({
        promotionName: e.promotion.name,
        priority: e.promotion.display_priority || 0,
        status: e.status,
        calculatedDiscount: e.computedDiscount,
        stackable: e.promotion.allow_stacking,
        reason: e.reason
      }))
    }
  }

  if (candidatePromotions.length === 1 && evaluated.length > 0 && evaluated[0].status === 'ineligible') {
    return {
      appliedPromotion: candidatePromotions[0],
      promotionType: candidatePromotions[0].type,
      promotionName: candidatePromotions[0].name,
      promotionId: candidatePromotions[0].id,
      discountAmount: 0,
      isFreeShipping: false,
      shippingDiscount: 0,
      discountLabel: null,
      message: evaluated[0].message,
      subMessage: null,
      status: 'ineligible'
    }
  }

  return {
    appliedPromotion: null,
    promotionType: null,
    promotionName: null,
    promotionId: null,
    discountAmount: 0,
    isFreeShipping: false,
    shippingDiscount: 0,
    discountLabel: null,
    message: null,
    subMessage: null,
    status: 'none'
  }
}

/**
 * Admin Server Action: Save or Update a Promotion
 * Persists authoritatively in Supabase.
 */
export async function savePromotionAction(
  input: Partial<Promotion> & { name: string; type: PromotionType }
): Promise<{ success: boolean; promotion?: Promotion; error?: string }> {
  try {
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) return { success: false, error: 'Unauthorized: Admin privileges required.' }

    const slug =
      input.slug?.trim() ||
      input.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

    // Validate or generate proper UUID
    const id =
      input.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.id)
        ? input.id
        : crypto.randomUUID()

    const payload: Promotion = {
      id,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      type: input.type,
      discount_value: Number(input.discount_value || 0),
      bogo_buy_qty: Number(input.bogo_buy_qty || 1),
      bogo_get_qty: Number(input.bogo_get_qty || 1),
      bogo_discount_percent: Number(input.bogo_discount_percent ?? 100),
      coupon_code: input.coupon_code?.trim() ? input.coupon_code.trim().toUpperCase() : null,
      applies_to: input.applies_to || 'all',
      target_ids: Array.isArray(input.target_ids) ? input.target_ids : [],
      min_cart_value: input.min_cart_value ? Number(input.min_cart_value) : null,
      min_quantity: input.min_quantity ? Number(input.min_quantity) : null,
      max_discount_amount: input.max_discount_amount ? Number(input.max_discount_amount) : null,
      usage_limit: input.usage_limit ? Number(input.usage_limit) : null,
      usage_count: Number(input.usage_count || 0),
      per_customer_limit: input.per_customer_limit ? Number(input.per_customer_limit) : 1,
      starts_at: input.starts_at || new Date().toISOString(),
      ends_at: input.ends_at || null,
      status: input.status || 'active',
      allow_stacking: !!input.allow_stacking,
      show_on_homepage_hero: !!input.show_on_homepage_hero,
      hero_badge: input.hero_badge?.trim() || 'LIMITED OFFER',
      hero_headline: input.hero_headline?.trim() || null,
      hero_subheading: input.hero_subheading?.trim() || null,
      hero_cta_text: input.hero_cta_text?.trim() || 'SHOP THE OFFER',
      hero_image_url: input.hero_image_url?.trim() || null,
      display_priority: Number(input.display_priority || 10),
      created_at: input.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let savedPromotion: Promotion = payload

    // 1. Authoritative Persistence in Supabase
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('promotions')
        .upsert(payload, { onConflict: 'slug' })
        .select()
        .single()

      if (!error && data) {
        savedPromotion = {
          ...data,
          target_ids: Array.isArray(data.target_ids) ? data.target_ids : []
        }
      } else if (error) {
        console.warn('[Promotions] Supabase upsert notice:', error.message)
      }
    } catch (err) {
      console.warn('[Promotions] Supabase connection notice:', err)
    }

    // 2. Development Sync (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const localList = readLocalPromotions()
      const existingIndex = localList.findIndex(p => p.id === savedPromotion.id || p.slug === savedPromotion.slug)
      if (existingIndex > -1) {
        localList[existingIndex] = savedPromotion
      } else {
        localList.unshift(savedPromotion)
      }
      writeLocalPromotions(localList)
    }

    // 3. Immediate Cache Invalidation across all affected routes
    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/offers')
    revalidatePath(`/offers/${slug}`)
    revalidatePath('/admin/promotions')
    revalidatePath('/cart')
    revalidatePath('/checkout')

    return { success: true, promotion: savedPromotion }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save promotion.'
    return { success: false, error: message }
  }
}

/**
 * Admin Server Action: Delete Promotion
 */
export async function deletePromotionAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) return { success: false, error: 'Unauthorized.' }

    try {
      const supabase = await createClient()
      await supabase.from('promotions').delete().eq('id', id)
    } catch (err) {
      console.warn('[Promotions] Supabase delete notice:', err)
    }

    if (process.env.NODE_ENV !== 'production') {
      const localList = readLocalPromotions().filter(p => p.id !== id)
      writeLocalPromotions(localList)
    }

    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/offers')
    revalidatePath('/admin/promotions')
    revalidatePath('/cart')
    revalidatePath('/checkout')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete.' }
  }
}

/**
 * Admin Server Action: Toggle Promotion Status
 */
export async function togglePromotionStatusAction(
  id: string,
  newStatus: PromotionStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await checkIsAdmin()
    if (!isAdmin) return { success: false, error: 'Unauthorized.' }

    try {
      const supabase = await createClient()
      await supabase.from('promotions').update({ status: newStatus }).eq('id', id)
    } catch (err) {
      console.warn('[Promotions] Supabase toggle status notice:', err)
    }

    if (process.env.NODE_ENV !== 'production') {
      const localList = readLocalPromotions()
      const promo = localList.find(p => p.id === id)
      if (promo) {
        promo.status = newStatus
        promo.updated_at = new Date().toISOString()
        writeLocalPromotions(localList)
      }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/')
    revalidatePath('/offers')
    revalidatePath('/admin/promotions')
    revalidatePath('/cart')
    revalidatePath('/checkout')

    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to toggle status.' }
  }
}
