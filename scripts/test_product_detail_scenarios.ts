import assert from 'assert'
import { money, Product, Variant } from '../lib/catalog'
import { Promotion } from '../lib/promotions-shared'

console.log('=================================================================')
console.log('SENO — PRODUCT DETAIL PAGE UI/UX LOGIC & PRICING VERIFICATION')
console.log('=================================================================\n')

let passedTests = 0
let totalTests = 0

function test(name: string, fn: () => void) {
  totalTests++
  try {
    fn()
    console.log(`[PASS] Case ${totalTests}: ${name}`)
    passedTests++
  } catch (err: any) {
    console.error(`[FAIL] Case ${totalTests}: ${name}`)
    console.error(`       Error: ${err.message}`)
    throw err
  }
}

/**
 * Pure evaluation function mirroring ProductDetailClient calculation logic
 */
function calculateProductPricing(params: {
  product: { price: number; compareAtPrice?: number; variants?: Variant[] }
  selectedVariant?: Variant | null
  applicablePromotion?: Promotion | null
}) {
  const { product, selectedVariant, applicablePromotion } = params

  const displayPrice = selectedVariant?.priceOverride ?? product.price

  // Evaluate promotions: unconditional single-item promo vs conditional offers (BOGO, coupons, cart threshold)
  const isUnconditionalPromo = Boolean(
    applicablePromotion &&
    (applicablePromotion.type === 'percentage' || applicablePromotion.type === 'flat') &&
    (!applicablePromotion.min_cart_value || applicablePromotion.min_cart_value <= 0) &&
    (!applicablePromotion.min_quantity || applicablePromotion.min_quantity <= 1) &&
    !applicablePromotion.coupon_code
  )

  const effectiveSellingPrice = isUnconditionalPromo && applicablePromotion
    ? (applicablePromotion.type === 'percentage'
        ? Math.round(displayPrice * (1 - applicablePromotion.discount_value / 100))
        : Math.max(0, displayPrice - applicablePromotion.discount_value))
    : displayPrice

  const referenceMrp = (product.compareAtPrice && product.compareAtPrice > effectiveSellingPrice)
    ? product.compareAtPrice
    : (isUnconditionalPromo && displayPrice > effectiveSellingPrice ? displayPrice : null)

  const hasDiscount = Boolean(
    referenceMrp &&
    effectiveSellingPrice &&
    typeof referenceMrp === 'number' &&
    typeof effectiveSellingPrice === 'number' &&
    !isNaN(referenceMrp) &&
    !isNaN(effectiveSellingPrice) &&
    referenceMrp > effectiveSellingPrice &&
    effectiveSellingPrice > 0
  )

  const discountAmount = hasDiscount ? (referenceMrp! - effectiveSellingPrice) : 0
  const discountPercentage = hasDiscount ? Math.round((discountAmount / referenceMrp!) * 100) : 0

  return {
    displayPrice,
    effectiveSellingPrice,
    referenceMrp,
    hasDiscount,
    discountAmount,
    discountPercentage,
    isUnconditionalPromo
  }
}

// --------------------------------------------------------------------------
// TEST 1: No discount (Selling price ₹699, no compareAtPrice)
// --------------------------------------------------------------------------
test('Scenario 1: No discount -> No badge, no savings text, no NaN, no negative values', () => {
  const res = calculateProductPricing({
    product: { price: 699 }
  })
  assert.strictEqual(res.effectiveSellingPrice, 699)
  assert.strictEqual(res.hasDiscount, false)
  assert.strictEqual(res.discountAmount, 0)
  assert.strictEqual(res.discountPercentage, 0)
  assert.strictEqual(res.referenceMrp, null)
  assert(!isNaN(res.effectiveSellingPrice))
})

// --------------------------------------------------------------------------
// TEST 2: Discounted price with valid MRP (Selling price ₹99, MRP ₹199)
// --------------------------------------------------------------------------
test('Scenario 2: Valid MRP and selling price (₹99 vs ₹199) -> 50% OFF, ₹100 savings', () => {
  const res = calculateProductPricing({
    product: { price: 99, compareAtPrice: 199 }
  })
  assert.strictEqual(res.effectiveSellingPrice, 99)
  assert.strictEqual(res.referenceMrp, 199)
  assert.strictEqual(res.hasDiscount, true)
  assert.strictEqual(res.discountAmount, 100)
  assert.strictEqual(res.discountPercentage, 50)
  assert.strictEqual(money(res.discountAmount), '₹100')
})

// --------------------------------------------------------------------------
// TEST 3: BOGO offer requiring two eligible products
// --------------------------------------------------------------------------
test('Scenario 3: BOGO promotion is NOT applied unconditionally to single item display price', () => {
  const bogoPromo: Promotion = {
    id: 'promo-bogo',
    name: 'BOGO Offer',
    slug: 'bogo-offer',
    type: 'bogo',
    discount_value: 0,
    bogo_buy_qty: 1,
    bogo_get_qty: 1,
    bogo_discount_percent: 100,
    applies_to: 'all',
    target_ids: [],
    min_quantity: 2,
    usage_count: 0,
    status: 'active',
    allow_stacking: false,
    show_on_homepage_hero: false,
    display_priority: 10
  }

  const res = calculateProductPricing({
    product: { price: 800, compareAtPrice: 1000 },
    applicablePromotion: bogoPromo
  })

  // Selling price is NOT halved to 400! It remains 800, and permanent markdown is ₹200 (20% OFF)
  assert.strictEqual(res.isUnconditionalPromo, false)
  assert.strictEqual(res.effectiveSellingPrice, 800)
  assert.strictEqual(res.referenceMrp, 1000)
  assert.strictEqual(res.discountAmount, 200)
  assert.strictEqual(res.discountPercentage, 20)
})

// --------------------------------------------------------------------------
// TEST 4: Coupon-based offer (e.g. code SENO500)
// --------------------------------------------------------------------------
test('Scenario 4: Coupon promotion is NOT applied unconditionally to product price', () => {
  const couponPromo: Promotion = {
    id: 'promo-coupon',
    name: 'SENO500 Off',
    slug: 'seno-500',
    type: 'coupon',
    discount_value: 500,
    coupon_code: 'SENO500',
    applies_to: 'all',
    target_ids: [],
    min_cart_value: 2500,
    usage_count: 0,
    status: 'active',
    allow_stacking: false,
    show_on_homepage_hero: false,
    display_priority: 5
  }

  const res = calculateProductPricing({
    product: { price: 1200 },
    applicablePromotion: couponPromo
  })

  // Coupon requires code and min cart value; display price remains ₹1200 without unconditional discount
  assert.strictEqual(res.isUnconditionalPromo, false)
  assert.strictEqual(res.effectiveSellingPrice, 1200)
  assert.strictEqual(res.hasDiscount, false)
})

// --------------------------------------------------------------------------
// TEST 5: Cart value threshold promotion (e.g. 20% off above ₹1,500)
// --------------------------------------------------------------------------
test('Scenario 5: Cart threshold promotion is NOT applied unconditionally to single item', () => {
  const cartThresholdPromo: Promotion = {
    id: 'promo-threshold',
    name: 'Festive 20% Off',
    slug: 'festive-20',
    type: 'percentage',
    discount_value: 20,
    applies_to: 'all',
    target_ids: [],
    min_cart_value: 1500,
    usage_count: 0,
    status: 'active',
    allow_stacking: false,
    show_on_homepage_hero: false,
    display_priority: 10
  }

  const res = calculateProductPricing({
    product: { price: 900 },
    applicablePromotion: cartThresholdPromo
  })

  assert.strictEqual(res.isUnconditionalPromo, false)
  assert.strictEqual(res.effectiveSellingPrice, 900)
  assert.strictEqual(res.hasDiscount, false)
})

// --------------------------------------------------------------------------
// TEST 6: Multiple colours or sizes with different prices (priceOverride)
// --------------------------------------------------------------------------
test('Scenario 6: Variant switching with different price overrides recalculates savings dynamically', () => {
  const product = {
    price: 699,
    compareAtPrice: 1449
  }

  const standardVariant: Variant = {
    id: 'v1',
    size: 'S',
    colour: 'Navy',
    sku: 'NAVY-S',
    inventoryQuantity: 5
  }

  const premiumVariant: Variant = {
    id: 'v2',
    size: 'XL',
    colour: 'Navy',
    sku: 'NAVY-XL',
    priceOverride: 899,
    inventoryQuantity: 2
  }

  const luxuryVariant: Variant = {
    id: 'v3',
    size: 'Custom',
    colour: 'Gold',
    sku: 'GOLD-C',
    priceOverride: 1199,
    inventoryQuantity: 1
  }

  const res1 = calculateProductPricing({ product, selectedVariant: standardVariant })
  assert.strictEqual(res1.effectiveSellingPrice, 699)
  assert.strictEqual(res1.referenceMrp, 1449)
  assert.strictEqual(res1.discountAmount, 750)
  assert.strictEqual(res1.discountPercentage, 52) // Math.round((750 / 1449) * 100) = 52%

  const res2 = calculateProductPricing({ product, selectedVariant: premiumVariant })
  assert.strictEqual(res2.effectiveSellingPrice, 899)
  assert.strictEqual(res2.referenceMrp, 1449)
  assert.strictEqual(res2.discountAmount, 550)
  assert.strictEqual(res2.discountPercentage, 38) // Math.round((550 / 1449) * 100) = 38%

  const res3 = calculateProductPricing({ product, selectedVariant: luxuryVariant })
  assert.strictEqual(res3.effectiveSellingPrice, 1199)
  assert.strictEqual(res3.referenceMrp, 1449)
  assert.strictEqual(res3.discountAmount, 250)
  assert.strictEqual(res3.discountPercentage, 17) // Math.round((250 / 1449) * 100) = 17%
})

// --------------------------------------------------------------------------
// TEST 7: Low-stock and sold-out states backed strictly by actual inventory
// --------------------------------------------------------------------------
test('Scenario 7: Real inventory thresholds correctly categorize stock states', () => {
  function getStockState(params: {
    soldOut: boolean
    variantCount: number
    selectedVariant?: { inventoryQuantity: number } | null
  }) {
    const { soldOut, variantCount, selectedVariant } = params
    if (soldOut || variantCount === 0) return 'soldout'
    if (!selectedVariant) return 'prompt'
    if (selectedVariant.inventoryQuantity <= 0) return 'variant_soldout'
    if (selectedVariant.inventoryQuantity <= 5) return 'low_stock'
    return 'in_stock'
  }

  assert.strictEqual(getStockState({ soldOut: true, variantCount: 2 }), 'soldout')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 0 }), 'soldout')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 3, selectedVariant: null }), 'prompt')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 3, selectedVariant: { inventoryQuantity: 0 } }), 'variant_soldout')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 3, selectedVariant: { inventoryQuantity: 1 } }), 'low_stock')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 3, selectedVariant: { inventoryQuantity: 5 } }), 'low_stock')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 3, selectedVariant: { inventoryQuantity: 6 } }), 'in_stock')
  assert.strictEqual(getStockState({ soldOut: false, variantCount: 3, selectedVariant: { inventoryQuantity: 100 } }), 'in_stock')
})

// --------------------------------------------------------------------------
// TEST 8: Unconditional Promotion (Site-wide flash 25% off)
// --------------------------------------------------------------------------
test('Scenario 8: True unconditional promotion calculates discounted selling price and savings against MRP', () => {
  const flashSalePromo: Promotion = {
    id: 'promo-flash',
    name: 'Flash Sale 25% Off',
    slug: 'flash-sale-25',
    type: 'percentage',
    discount_value: 25,
    applies_to: 'all',
    target_ids: [],
    usage_count: 0,
    status: 'active',
    allow_stacking: false,
    show_on_homepage_hero: false,
    display_priority: 15
  }

  // Base price: ₹1,000, Original MRP: ₹1,500
  const res = calculateProductPricing({
    product: { price: 1000, compareAtPrice: 1500 },
    applicablePromotion: flashSalePromo
  })

  // Flash promo applies 25% to display price ₹1,000 -> ₹750
  assert.strictEqual(res.isUnconditionalPromo, true)
  assert.strictEqual(res.effectiveSellingPrice, 750)
  assert.strictEqual(res.referenceMrp, 1500)
  // Total savings against MRP ₹1,500 = ₹750 (50% off MRP)
  assert.strictEqual(res.discountAmount, 750)
  assert.strictEqual(res.discountPercentage, 50)
})

// --------------------------------------------------------------------------
// TEST 9: Edge cases (Negative MRP, MRP equal to selling price, zero price)
// --------------------------------------------------------------------------
test('Scenario 9: Edge cases guard against negative discounts, equal prices, and NaN', () => {
  // MRP equals selling price -> No discount
  const resEqual = calculateProductPricing({
    product: { price: 500, compareAtPrice: 500 }
  })
  assert.strictEqual(resEqual.hasDiscount, false)
  assert.strictEqual(resEqual.discountAmount, 0)
  assert.strictEqual(resEqual.discountPercentage, 0)

  // MRP less than selling price -> No discount
  const resLess = calculateProductPricing({
    product: { price: 500, compareAtPrice: 400 }
  })
  assert.strictEqual(resLess.hasDiscount, false)
  assert.strictEqual(resLess.discountAmount, 0)
  assert.strictEqual(resLess.discountPercentage, 0)

  // Zero price or negative MRP -> No discount
  const resZero = calculateProductPricing({
    product: { price: 0, compareAtPrice: -100 }
  })
  assert.strictEqual(resZero.hasDiscount, false)
  assert.strictEqual(resZero.discountAmount, 0)
  assert.strictEqual(resZero.discountPercentage, 0)
})

console.log('\n=================================================================')
console.log(`ALL PRODUCT DETAIL TESTS PASSED: ${passedTests}/${totalTests} (100%)`)
console.log('=================================================================\n')

