import { Product } from '@/lib/catalog'

export type PromotionType = 'percentage' | 'flat' | 'bogo' | 'free_shipping' | 'coupon'
export type PromotionStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'expired'
export type AppliesToScope = 'all' | 'category' | 'collection' | 'products'

export interface Promotion {
  id: string
  name: string
  slug: string
  description?: string | null
  type: PromotionType
  discount_value: number
  bogo_buy_qty?: number
  bogo_get_qty?: number
  bogo_discount_percent?: number
  coupon_code?: string | null
  applies_to: AppliesToScope
  target_ids: string[]
  min_cart_value?: number | null
  min_quantity?: number | null
  max_discount_amount?: number | null
  usage_limit?: number | null
  usage_count: number
  per_customer_limit?: number | null
  starts_at?: string | null
  ends_at?: string | null
  status: PromotionStatus
  allow_stacking: boolean
  show_on_homepage_hero: boolean
  hero_badge?: string | null
  hero_headline?: string | null
  hero_subheading?: string | null
  hero_cta_text?: string | null
  hero_image_url?: string | null
  display_priority: number
  created_at?: string
  updated_at?: string
}

export interface PromotionEvaluationResult {
  appliedPromotion: Promotion | null
  promotionType: PromotionType | null
  promotionName: string | null
  promotionId: string | null
  discountAmount: number
  isFreeShipping: boolean
  shippingDiscount: number
  discountLabel: string | null
  message: string | null
  subMessage?: string | null
  status: 'applied' | 'threshold_not_met' | 'ineligible' | 'none'
  complimentaryItemsCount?: number
  progress?: {
    current: number
    target: number
    remaining: number
    type: 'amount' | 'quantity'
  }
  pendingOpportunity?: {
    promotion: Promotion
    message: string
    remaining: number
  } | null
  selectionReason?: string | null
  debug?: Array<{
    promotionName: string
    priority: number
    status: string
    calculatedDiscount: number
    stackable: boolean
    reason: string
  }>
}

/**
 * Known Category Taxonomy mapping slugs, names, and UUIDs for infallible matching
 */
const CATEGORY_MAP: Record<string, { slug: string; name: string; id: string }> = {
  'topwear': { slug: 'topwear', name: 'topwear', id: '3ee83b18-0221-4fbb-8553-d4e0e892c7bf' },
  'bottomwear': { slug: 'bottomwear', name: 'bottomwear', id: 'c53387ec-cfcf-49b6-897e-6411cdb9b083' },
  'western': { slug: 'western', name: 'western', id: '16ea79fb-f8b3-4289-9d11-32d4979470bc' },
  'ethnic-traditional-wear': { slug: 'ethnic-traditional-wear', name: 'ethnic & traditional wear', id: 'df81bf66-4974-43c4-8bbd-fdb1d262c46e' },
  'ethnic & traditional wear': { slug: 'ethnic-traditional-wear', name: 'ethnic & traditional wear', id: 'df81bf66-4974-43c4-8bbd-fdb1d262c46e' },
  'cosmetics': { slug: 'cosmetics', name: 'cosmetics', id: '1b4814e3-db14-48f6-8b5c-aed0aedcb442' },
  'outerwear': { slug: 'outerwear', name: 'legacy outerwear', id: '72ef1d05-9188-456c-9daf-f9ceea4eec7a' },
  'accessories': { slug: 'accessories', name: 'legacy accessories', id: 'f3726210-3350-4937-9089-6d418e452f8a' }
}

/**
 * Normalizes promotion effective status based on scheduled start and end dates.
 */
export function getEffectivePromotionStatus(promo: Promotion): PromotionStatus {
  if (promo.status === 'paused' || promo.status === 'draft') {
    return promo.status
  }
  const now = new Date().getTime()
  if (promo.starts_at) {
    const start = new Date(promo.starts_at).getTime()
    if (now < start) return 'scheduled'
  }
  if (promo.ends_at) {
    const end = new Date(promo.ends_at).getTime()
    if (now > end) return 'expired'
  }
  if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
    return 'expired'
  }
  return 'active'
}

/**
 * Evaluates whether a product is eligible under a promotion's rules.
 */
export function isProductEligibleForPromotion(productOrPromo: any, promoOrProduct: any): boolean {
  if (!productOrPromo || !promoOrProduct) return false
  const promo: Promotion = 'discount_value' in productOrPromo && 'applies_to' in productOrPromo ? productOrPromo : promoOrProduct
  const product: any = 'discount_value' in productOrPromo && 'applies_to' in productOrPromo ? promoOrProduct : productOrPromo

  if (!promo || !product) return false
  if (promo.applies_to === 'all') return true

  if (promo.applies_to === 'products') {
    const targetIds = (promo.target_ids || []).map((t: string) => t.toLowerCase())
    return (
      (product.id && targetIds.includes(product.id.toLowerCase())) ||
      (product.slug && targetIds.includes(product.slug.toLowerCase()))
    )
  }

  if (promo.applies_to === 'category') {
    const targetCats = (promo.target_ids || []).map((t: string) => t.toLowerCase())

    // Collect all tokens that describe the product's category
    const productCategoryTokens = new Set<string>()

    if (product.category && typeof product.category === 'string') {
      productCategoryTokens.add(product.category.toLowerCase())
    }
    if (product.categories?.name && typeof product.categories.name === 'string') {
      productCategoryTokens.add(product.categories.name.toLowerCase())
    }
    if (product.categories?.slug && typeof product.categories.slug === 'string') {
      productCategoryTokens.add(product.categories.slug.toLowerCase())
    }
    if (product.category_id && typeof product.category_id === 'string') {
      productCategoryTokens.add(product.category_id.toLowerCase())
      // Also lookup known slug/name for this UUID
      for (const entry of Object.values(CATEGORY_MAP)) {
        if (entry.id.toLowerCase() === product.category_id.toLowerCase()) {
          productCategoryTokens.add(entry.slug)
          productCategoryTokens.add(entry.name)
        }
      }
    }

    // Expand targetCats to include known UUIDs if targetCats contains slugs
    const expandedTargets = new Set<string>(targetCats)
    for (const t of targetCats) {
      if (CATEGORY_MAP[t]) {
        expandedTargets.add(CATEGORY_MAP[t].id.toLowerCase())
        expandedTargets.add(CATEGORY_MAP[t].slug.toLowerCase())
        expandedTargets.add(CATEGORY_MAP[t].name.toLowerCase())
      }
    }

    for (const token of productCategoryTokens) {
      if (expandedTargets.has(token)) return true
      for (const target of expandedTargets) {
        if (token.includes(target) || target.includes(token)) return true
      }
    }
    return false
  }

  if (promo.applies_to === 'collection') {
    const cat = (product.category || product.categories?.name || '').toLowerCase()
    const targetCols = (promo.target_ids || []).map((t: string) => t.toLowerCase())
    return (
      targetCols.includes(cat) ||
      targetCols.some((t: string) => cat.includes(t)) ||
      (promo.target_ids.includes('new-arrivals') && !!product.isNew) ||
      (promo.target_ids.includes('bestsellers') && !!product.isBestseller)
    )
  }

  return false
}

/**
 * Generates editorial promotion badge text for product cards and details.
 */
export function getPromotionBadgeText(promo: Promotion): string {
  if (promo.type === 'percentage') {
    return `${Math.round(promo.discount_value)}% OFF`
  }
  if (promo.type === 'bogo') {
    return 'BUY 1 GET 1 FREE'
  }
  if (promo.type === 'flat') {
    return `₹${Math.round(promo.discount_value)} OFF`
  }
  if (promo.type === 'free_shipping') {
    return 'FREE SHIPPING'
  }
  if (promo.type === 'coupon') {
    return promo.coupon_code || 'PROMO'
  }
  return 'SPECIAL OFFER'
}
