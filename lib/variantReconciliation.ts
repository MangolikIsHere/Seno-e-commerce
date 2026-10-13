import { SupabaseClient } from '@supabase/supabase-js'

export interface ReconcileVariantInput {
  id?: string
  size?: string | null
  colour?: string | null
  color?: string | null
  sku?: string | null
  quantity?: number | string
  price_override?: number | string | null
  weight_grams_override?: number | string | null
  is_active?: boolean
}

export interface ReconcileOptions {
  productSlug?: string
}

export interface ReconcileResult {
  success: boolean
  activeVariantIds: string[]
  deactivatedVariantIds: string[]
  totalActiveStock: number
  isSoldOut: boolean
}

/**
 * Normalizes text for case- and whitespace-insensitive comparison.
 */
function normalizeVal(val?: string | null): string {
  return (val || '').trim().toLowerCase()
}

/**
 * Reconciles submitted variants for a product against existing database records.
 * 
 * Guarantees:
 * 1. Preserves existing variants still selected (keeps IDs, updates details & stock).
 * 2. Reactivates previously deactivated variants if selected again (prevents duplicate key constraints).
 * 3. Safely deactivates omitted variants (is_active = false, quantity = 0), protecting order item history.
 * 4. Inserts genuinely new variants and their inventory rows without duplicates.
 * 5. Re-calculates total active inventory and updates `products.is_sold_out` authoritatively.
 */
export async function reconcileProductVariants(
  supabase: SupabaseClient,
  productId: string,
  incomingVariants: ReconcileVariantInput[],
  options?: ReconcileOptions
): Promise<ReconcileResult> {
  if (!incomingVariants || !Array.isArray(incomingVariants) || incomingVariants.length === 0) {
    throw new Error('Please configure at least one product variant.')
  }

  // 1. Client-side duplicate combination & SKU validation
  const comboSet = new Set<string>()
  const skuSet = new Set<string>()

  for (let i = 0; i < incomingVariants.length; i++) {
    const v = incomingVariants[i]
    const s = normalizeVal(v.size)
    const c = normalizeVal(v.colour || v.color)
    const combo = `${s}::${c}`

    if (comboSet.has(combo)) {
      throw new Error(`Duplicate size and colour combination "${v.size || 'Standard'}" / "${v.colour || v.color || 'Default'}" found. Each variant combination must be unique.`)
    }
    comboSet.add(combo)

    const cleanSku = (v.sku || '').trim().toUpperCase()
    if (cleanSku) {
      if (skuSet.has(cleanSku)) {
        throw new Error(`Duplicate SKU "${cleanSku}" found. Every variant must have a unique SKU.`)
      }
      skuSet.add(cleanSku)
    }

    const qty = parseInt(String(v.quantity ?? 0), 10)
    if (isNaN(qty) || qty < 0) {
      throw new Error(`Variant #${i + 1} (${v.size || 'Size'} / ${v.colour || v.color || 'Colour'}) must have a valid non-negative quantity.`)
    }
  }

  // 2. Prepare payload for possible database RPC call
  const preparedRpcPayload = incomingVariants.map(v => ({
    id: v.id || null,
    size: (v.size || '').trim() || null,
    colour: (v.colour || v.color || '').trim() || null,
    sku: (v.sku || '').trim(),
    quantity: Math.max(0, parseInt(String(v.quantity || 0), 10) || 0),
    price_override: v.price_override != null && v.price_override !== '' ? Number(v.price_override) : null,
    weight_grams_override: v.weight_grams_override != null && v.weight_grams_override !== '' ? Number(v.weight_grams_override) : null
  }))

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('reconcile_product_variants', {
      p_product_id: productId,
      p_variants: preparedRpcPayload
    })

    if (!rpcErr && rpcRes && rpcRes.success) {
      return {
        success: true,
        activeVariantIds: [],
        deactivatedVariantIds: [],
        totalActiveStock: Number(rpcRes.total_stock ?? 0),
        isSoldOut: !!rpcRes.is_sold_out
      }
    }

    if (rpcErr && rpcErr.code !== '42883') {
      // If error is an authorization or constraint error, rethrow it
      if (rpcErr.message?.includes('Unauthorized') || rpcErr.message?.includes('Duplicate')) {
        throw new Error(rpcErr.message)
      }
    }
  } catch (rpcCallErr: any) {
    if (rpcCallErr.message?.includes('Unauthorized') || rpcCallErr.message?.includes('Duplicate')) {
      throw rpcCallErr
    }
    // Otherwise fallback to transactional client sequence below
  }

  // 3. Fallback direct client-side reconciliation
  // Fetch existing product info for slug generation fallback
  const { data: prodInfo } = await supabase
    .from('products')
    .select('slug, name')
    .eq('id', productId)
    .maybeSingle()

  const baseSlug = (options?.productSlug || prodInfo?.slug || prodInfo?.name || 'prod')
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)

  // Fetch all existing variants for this product (both active and inactive)
  const { data: existingVariants, error: fetchErr } = await supabase
    .from('product_variants')
    .select('id, size, colour, sku, is_active')
    .eq('product_id', productId)

  if (fetchErr) {
    throw new Error(`Failed to load existing variants: ${fetchErr.message}`)
  }

  const existingList = existingVariants || []

  // Index existing variants by id, (size, colour), and sku
  const idMap = new Map<string, any>()
  const comboMap = new Map<string, any>()
  const skuMap = new Map<string, any>()

  for (const ev of existingList) {
    idMap.set(ev.id, ev)
    const comboKey = `${normalizeVal(ev.size)}::${normalizeVal(ev.colour)}`
    comboMap.set(comboKey, ev)
    if (ev.sku) {
      skuMap.set(ev.sku.trim().toUpperCase(), ev)
    }
  }

  const matchedExistingIds = new Set<string>()
  const activeVariantIds: string[] = []
  let totalActiveStock = 0

  for (let i = 0; i < incomingVariants.length; i++) {
    const v = incomingVariants[i]
    const normSize = (v.size || '').trim()
    const normColour = (v.colour || v.color || '').trim()
    const comboKey = `${normalizeVal(normSize)}::${normalizeVal(normColour)}`
    const cleanSku = (v.sku || '').trim().toUpperCase()
    const qty = Math.max(0, parseInt(String(v.quantity || 0), 10) || 0)

    // Matching precedence:
    // 1. By variant ID (if provided and exists for this product)
    // 2. By (size, colour) combination
    // 3. By SKU
    let match = (v.id && idMap.get(v.id)) || comboMap.get(comboKey) || (cleanSku ? skuMap.get(cleanSku) : null)

    const priceOverride = v.price_override != null && v.price_override !== '' ? Number(v.price_override) : null
    const weightOverride = v.weight_grams_override != null && v.weight_grams_override !== '' ? Number(v.weight_grams_override) : null

    if (match) {
      matchedExistingIds.add(match.id)
      activeVariantIds.push(match.id)
      totalActiveStock += qty

      const targetSku = cleanSku || match.sku || `SENO-${baseSlug.slice(0, 4)}-${normSize.toUpperCase().slice(0, 3)}-${normColour.toUpperCase().slice(0, 3)}`

      const { error: updErr } = await supabase
        .from('product_variants')
        .update({
          size: normSize || null,
          colour: normColour || null,
          sku: targetSku,
          price_override: priceOverride,
          weight_grams_override: weightOverride,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', match.id)

      if (updErr) {
        throw new Error(`Failed to update variant: ${updErr.message}`)
      }

      // Upsert inventory
      const { data: invRow } = await supabase
        .from('inventory')
        .select('id')
        .eq('variant_id', match.id)
        .maybeSingle()

      if (invRow) {
        const { error: invUpdErr } = await supabase
          .from('inventory')
          .update({ quantity: qty, updated_at: new Date().toISOString() })
          .eq('variant_id', match.id)

        if (invUpdErr) throw new Error(`Failed to update inventory: ${invUpdErr.message}`)
      } else {
        const { error: invInsErr } = await supabase
          .from('inventory')
          .insert({ variant_id: match.id, quantity: qty, low_stock_threshold: 5 })

        if (invInsErr) throw new Error(`Failed to insert inventory: ${invInsErr.message}`)
      }
    } else {
      // Genuinely new variant
      const targetSku = cleanSku || `SENO-${baseSlug.slice(0, 4)}-${(normSize || 'STD').toUpperCase().slice(0, 3)}-${(normColour || 'DEF').toUpperCase().slice(0, 3)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

      const { data: newVar, error: insErr } = await supabase
        .from('product_variants')
        .insert({
          product_id: productId,
          size: normSize || null,
          colour: normColour || null,
          sku: targetSku,
          price_override: priceOverride,
          weight_grams_override: weightOverride,
          is_active: true
        })
        .select('id')
        .single()

      if (insErr || !newVar) {
        throw new Error(`Failed to create variant: ${insErr?.message || 'Insert error'}`)
      }

      matchedExistingIds.add(newVar.id)
      activeVariantIds.push(newVar.id)
      totalActiveStock += qty

      const { error: invInsErr } = await supabase
        .from('inventory')
        .insert({ variant_id: newVar.id, quantity: qty, low_stock_threshold: 5 })

      if (invInsErr) {
        throw new Error(`Failed to initialize inventory for new variant: ${invInsErr.message}`)
      }
    }
  }

  // Deactivate unselected variants
  const deactivatedVariantIds: string[] = []
  const unselectedVariants = existingList.filter(ev => !matchedExistingIds.has(ev.id))

  for (const ev of unselectedVariants) {
    // Only update if currently active
    if (ev.is_active) {
      await supabase
        .from('product_variants')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', ev.id)

      await supabase
        .from('inventory')
        .update({ quantity: 0, updated_at: new Date().toISOString() })
        .eq('variant_id', ev.id)

      deactivatedVariantIds.push(ev.id)
    }
  }

  // 4. Synchronize products.is_sold_out based on actual active inventory
  const shouldBeSoldOut = totalActiveStock === 0 || activeVariantIds.length === 0
  await supabase
    .from('products')
    .update({ is_sold_out: shouldBeSoldOut, updated_at: new Date().toISOString() })
    .eq('id', productId)

  return {
    success: true,
    activeVariantIds,
    deactivatedVariantIds,
    totalActiveStock,
    isSoldOut: shouldBeSoldOut
  }
}
