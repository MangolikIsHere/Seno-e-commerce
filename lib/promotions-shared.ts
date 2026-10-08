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
  discountAmount: number
  isFreeShipping: boolean
  message: string | null
  status: 'applied' | 'threshold_not_met' | 'ineligible' | 'none'
  progress?: {
    current: number
    target: number
    remaining: number
    type: 'amount' | 'quantity'
  }
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
  const product: Product = 'discount_value' in productOrPromo && 'applies_to' in productOrPromo ? promoOrProduct : productOrPromo

  if (!promo || !product) return false
  if (promo.applies_to === 'all') return true

  if (promo.applies_to === 'products') {
    return (
      (Array.isArray(promo.target_ids) && (promo.target_ids.includes(product.id) || promo.target_ids.includes(product.slug))) ||
      false
    )
  }

  if (promo.applies_to === 'category') {
    const cat = product.category?.toLowerCase() || ''
    const targetCats = (promo.target_ids || []).map(t => t.toLowerCase())
    return (
      targetCats.includes(cat) ||
      (product.category_id && promo.target_ids.includes(product.category_id)) ||
      targetCats.some(t => cat.includes(t))
    )
  }

  if (promo.applies_to === 'collection') {
    const cat = product.category?.toLowerCase() || ''
    const targetCols = (promo.target_ids || []).map(t => t.toLowerCase())
    return (
      targetCols.includes(cat) ||
      targetCols.some(t => cat.includes(t)) ||
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
