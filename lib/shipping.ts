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

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  calculation_mode: 'base_incremental',
  free_shipping_threshold: 1999.00,
  base_weight_grams: 500.00,
  base_rate: 70.00,
  incremental_weight_grams: 500.00,
  incremental_rate: 20.00,
  is_active: true
}

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
      !rulesError && rulesData ? rulesData : []

    return { settings, rules }
  } catch {
    return {
      settings: DEFAULT_SHIPPING_SETTINGS,
      rules: []
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
  // 1. Free shipping threshold
  if (
    settings.free_shipping_threshold !== null &&
    subtotal >= settings.free_shipping_threshold
  ) {
    return 0.00
  }

  // 2. Base + incremental mode
  if (settings.calculation_mode === 'base_incremental') {
    if (totalWeightGrams <= settings.base_weight_grams) {
      return Number(settings.base_rate)
    }

    const extraWeight = totalWeightGrams - settings.base_weight_grams
    const units = Math.ceil(extraWeight / settings.incremental_weight_grams)
    return Number(settings.base_rate) + units * Number(settings.incremental_rate)
  }

  // 3. Weight slab mode
  if (settings.calculation_mode === 'weight_slab' && rules.length > 0) {
    const matchingRule = rules.find(
      rule =>
        totalWeightGrams >= rule.min_weight_grams &&
        totalWeightGrams < rule.max_weight_grams
    )

    if (matchingRule) {
      return Number(matchingRule.rate)
    }

    // If total weight exceeds the highest defined slab, apply the highest slab rate
    const highestRule = [...rules].sort(
      (a, b) => b.max_weight_grams - a.max_weight_grams
    )[0]

    if (highestRule) {
      return Number(highestRule.rate)
    }
  }

  return Number(settings.base_rate)
}

export function calculateShippingForLines(
  subtotal: number,
  lines: ShippingLine[],
  settings: ShippingSettings = DEFAULT_SHIPPING_SETTINGS,
  rules: ShippingWeightRule[] = []
): number {
  if (settings.free_shipping_threshold !== null && subtotal >= settings.free_shipping_threshold) return 0
  const weightBasedLines = lines.filter(line => line.shippingMethod !== 'custom')
  const customCharge = lines
    .filter(line => line.shippingMethod === 'custom')
    .reduce((sum, line) => sum + Math.max(0, Number(line.customDeliveryCharge || 0)), 0)
  const weight = weightBasedLines.reduce((sum, line) => sum + line.unitWeightGrams * line.quantity, 0)
  return Number((calculateShippingFee(weightBasedLines.length > 0 ? subtotal : 0, weight, settings, rules) + customCharge).toFixed(2))
}
