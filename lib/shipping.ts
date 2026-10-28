import { supabase } from '@/lib/supabase'

export interface ShippingSettings {
  id?: string
  calculation_mode: 'base_incremental' | 'weight_slab'
  free_shipping_threshold: number | null
  base_weight_grams: number
  base_rate: number
  incremental_weight_grams: number
  incremental_rate: number
  is_active: boolean
}

export interface ShippingWeightRule {
  id?: string
  min_weight_grams: number
  max_weight_grams: number
  rate: number
  display_order: number
  is_active: boolean
}

export interface ShippingLine {
  quantity: number
  unitWeightGrams: number
  shippingMethod?: 'weight_based' | 'custom'
  customDeliveryCharge?: number | null
}

/**
 * SENO Standard Dynamic Delivery Rates:
 * - Combined chargeable weight <= 600 grams: ₹60.00
 * - Combined chargeable weight > 600 grams: ₹120.00
 * - Exactly 600 g remains in the ₹60 tier.
 * - Complimentary delivery threshold: ₹1,999.00
 */
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  calculation_mode: 'weight_slab',
  free_shipping_threshold: 1999.00,
  base_weight_grams: 600.00,
  base_rate: 60.00,
  incremental_weight_grams: 600.00,
  incremental_rate: 60.00,
  is_active: true
}

export const SENO_DEFAULT_WEIGHT_SLABS: ShippingWeightRule[] = [
  { min_weight_grams: 0, max_weight_grams: 600, rate: 60.0, display_order: 1, is_active: true },
  { min_weight_grams: 600, max_weight_grams: 9999999, rate: 120.0, display_order: 2, is_active: true }
]

/**
 * Retrieves the single active shipping configuration and active weight slabs from Supabase.
 * Returns the default fallback configuration if database tables are currently empty or unreachable.
 */
export async function fetchActiveShippingConfig(): Promise<{
  settings: ShippingSettings
  rules: ShippingWeightRule[]
}> {
  try {
    const { data: settingsData, error: settingsError } = await supabase
      .from('shipping_settings')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    const { data: rulesData, error: rulesError } = await supabase
      .from('shipping_weight_rules')
      .select('*')
      .eq('is_active', true)
      .order('min_weight_grams', { ascending: true })

    const settings: ShippingSettings =
      !settingsError && settingsData && settingsData.length > 0
        ? settingsData[0]
        : DEFAULT_SHIPPING_SETTINGS

    const rules: ShippingWeightRule[] =
      !rulesError && rulesData && rulesData.length > 0
        ? rulesData
        : SENO_DEFAULT_WEIGHT_SLABS

    return { settings, rules }
  } catch {
    return {
      settings: DEFAULT_SHIPPING_SETTINGS,
      rules: SENO_DEFAULT_WEIGHT_SLABS
    }
  }
}

/**
 * Deterministic preview shipping fee calculation.
 * Matches the authoritative public.calculate_shipping SQL function.
 *
 * NOTE: Client-side results are preview-only. Order creation always recalculates
 * and validates server-authoritatively against database records.
 */
export function calculateShippingFee(
  subtotal: number,
  totalWeightGrams: number,
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
  rules: ShippingWeightRule[] = []
): number {
  if (totalWeightGrams < 0) {
    throw new Error('Total shipping weight cannot be negative.')
  }

  // 1. Free shipping threshold
  if (
    settings.free_shipping_threshold !== null &&
    subtotal >= settings.free_shipping_threshold
  ) {
    return 0.00
  }

  // If no weight-based items to ship, weight-based shipping is 0
  if (totalWeightGrams <= 0) {
    return 0.00
  }

  // 2. Weight slab mode
  const effectiveRules = rules.length > 0 ? rules : SENO_DEFAULT_WEIGHT_SLABS
  if (settings.calculation_mode === 'weight_slab' && effectiveRules.length > 0) {
    const sortedRules = [...effectiveRules].sort((a, b) => a.max_weight_grams - b.max_weight_grams)
    // Inclusive upper bound ensures exactly 600g matches the <= 600g tier
    const matchingRule = sortedRules.find(rule => totalWeightGrams <= rule.max_weight_grams)

    if (matchingRule) {
      return Number(matchingRule.rate)
    }

    const highestRule = sortedRules[sortedRules.length - 1]
    if (highestRule) {
      return Number(highestRule.rate)
    }
  }

  // 3. SENO Standard Combined-Weight Delivery Rules (Fallback / Standard mode):
  // - Combined chargeable weight <= 600 grams: ₹60.00
  // - Combined chargeable weight > 600 grams: ₹120.00
  // - Exactly 600 g remains in the ₹60 tier.
  if (totalWeightGrams <= 600) {
    return 60.00
  }
  return 120.00
}

/**
 * Authoritative combined-weight line-level shipping calculator for SENO.
 * Used identically across Cart, Checkout, and Server validations.
 *
 * Rules:
 * - Evaluates weight-based products by combined quantity-adjusted weight: sum(unitWeightGrams * quantity).
 * - Applies custom delivery charges for custom delivery products according to configured charges.
 * - For mixed carts, combines all weight-based products together into a single weight tier charge,
 *   then adds custom delivery charges.
 * - Does not silently discard custom charges or count charges twice.
 * - Enforces free shipping threshold on overall order subtotal.
 * - Rejects negative weights or negative custom delivery charges.
 */
export function calculateShippingForLines(
  subtotal: number,
  lines: ShippingLine[],
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
  rules: ShippingWeightRule[] = []
): number {
  if (!lines || lines.length === 0) {
    return 0.00
  }

  if (settings.free_shipping_threshold !== null && subtotal >= settings.free_shipping_threshold) {
    return 0.00
  }

  const weightBasedLines = lines.filter(line => (line.shippingMethod || 'weight_based') !== 'custom')
  const customLines = lines.filter(line => (line.shippingMethod || 'weight_based') === 'custom')

  const customCharge = customLines.reduce((sum, line) => {
    const charge = Number(line.customDeliveryCharge || 0)
    if (charge < 0) {
      throw new Error('Custom delivery charge cannot be negative.')
    }
    return sum + charge
  }, 0)

  let combinedWeight = 0
  for (const line of weightBasedLines) {
    const unitWeight = line.unitWeightGrams !== undefined && line.unitWeightGrams !== null
      ? Number(line.unitWeightGrams)
      : 500
    if (isNaN(unitWeight) || unitWeight < 0) {
      throw new Error(`Invalid product weight: weight must be a positive number, received ${line.unitWeightGrams}.`)
    }
    const qty = line.quantity !== undefined && line.quantity !== null ? Number(line.quantity) : 1
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid line quantity: quantity must be greater than zero, received ${line.quantity}.`)
    }
    combinedWeight += unitWeight * qty
  }

  const weightBasedShipping = weightBasedLines.length > 0
    ? calculateShippingFee(subtotal, combinedWeight, settings, rules)
    : 0.00

  return Number((weightBasedShipping + customCharge).toFixed(2))
}
