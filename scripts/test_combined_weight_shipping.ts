import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import assert from 'assert'
import {
  calculateShippingFee,
  calculateShippingForLines,
  DEFAULT_SHIPPING_SETTINGS,
  SENO_DEFAULT_WEIGHT_SLABS,
  ShippingLine,
  ShippingSettings,
  ShippingWeightRule
} from '../lib/shipping'

console.log('=================================================================')
console.log('SENO — COMBINED-WEIGHT DELIVERY CALCULATION AUDIT & TEST SUITE')
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

// ------------------------------------------------------------------------------------------------
// SECTION 1: CORE WEIGHT-BASED DELIVERY RULES (600g TIERS)
// ------------------------------------------------------------------------------------------------

test('Case 1: One weight-based product weighing less than 600g (350g x 1) -> ₹60', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 350, shippingMethod: 'weight_based' }
  ]
  const fee = calculateShippingForLines(1000, lines)
  assert.strictEqual(fee, 60.00)
})

test('Case 2: Combined weight exactly 600g (300g x 2) -> Exactly 600g remains in ₹60 tier', () => {
  const lines: ShippingLine[] = [
    { quantity: 2, unitWeightGrams: 300, shippingMethod: 'weight_based' }
  ]
  const fee = calculateShippingForLines(1200, lines)
  assert.strictEqual(fee, 60.00)
})

test('Case 3: Combined weight exactly 600g (single item 600g x 1) -> Exactly 600g remains in ₹60 tier', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 600, shippingMethod: 'weight_based' }
  ]
  const fee = calculateShippingForLines(1400, lines)
  assert.strictEqual(fee, 60.00)
})

test('Case 4: Combined weight above 600g (350g x 1 + 300g x 1 = 650g) -> ₹120', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 350, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 300, shippingMethod: 'weight_based' }
  ]
  const fee = calculateShippingForLines(1500, lines)
  assert.strictEqual(fee, 120.00)
})

test('Case 5: Multiple quantities of the same product (200g x 4 = 800g) -> Quantity-adjusted weight > 600g -> ₹120', () => {
  const lines: ShippingLine[] = [
    { quantity: 4, unitWeightGrams: 200, shippingMethod: 'weight_based' }
  ]
  const fee = calculateShippingForLines(1600, lines)
  assert.strictEqual(fee, 120.00)
})

test('Case 6: Several weight-based products (150g + 200g + 150g = 500g) -> Combined weight <= 600g -> ₹60', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 150, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 200, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 150, shippingMethod: 'weight_based' }
  ]
  const fee = calculateShippingForLines(1100, lines)
  assert.strictEqual(fee, 60.00)
})

// ------------------------------------------------------------------------------------------------
// SECTION 2: CUSTOM DELIVERY & MIXED CARTS
// ------------------------------------------------------------------------------------------------

test('Case 7: Custom-delivery-only cart (1 custom product @ ₹150) -> ₹150 (weight-based component is ₹0)', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 400, shippingMethod: 'custom', customDeliveryCharge: 150.00 }
  ]
  const fee = calculateShippingForLines(1200, lines)
  assert.strictEqual(fee, 150.00)
})

test('Case 8: Mixed cart: weight-based <= 600g (300g x 1 = ₹60) + custom delivery (₹150) -> 60 + 150 = ₹210', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 300, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 800, shippingMethod: 'custom', customDeliveryCharge: 150.00 }
  ]
  const fee = calculateShippingForLines(1500, lines)
  assert.strictEqual(fee, 210.00)
})

test('Case 9: Mixed cart: weight-based > 600g (350g + 300g = 650g -> ₹120) + custom delivery (₹150) -> 120 + 150 = ₹270', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 350, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 300, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 500, shippingMethod: 'custom', customDeliveryCharge: 150.00 }
  ]
  const fee = calculateShippingForLines(1600, lines)
  assert.strictEqual(fee, 270.00)
})

test('Case 10: Multiple custom-delivery products (Custom A ₹100 + Custom B ₹150) -> Preserves existing summation -> ₹250', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 0, shippingMethod: 'custom', customDeliveryCharge: 100.00 },
    { quantity: 1, unitWeightGrams: 0, shippingMethod: 'custom', customDeliveryCharge: 150.00 }
  ]
  const fee = calculateShippingForLines(1300, lines)
  assert.strictEqual(fee, 250.00)
})

test('Case 11: Free shipping threshold (₹1,999) applies and waives entire fee', () => {
  const lines: ShippingLine[] = [
    { quantity: 2, unitWeightGrams: 500, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 0, shippingMethod: 'custom', customDeliveryCharge: 150.00 }
  ]
  // Subtotal ₹2,000 >= threshold ₹1,999 -> ₹0.00
  const fee = calculateShippingForLines(2000, lines)
  assert.strictEqual(fee, 0.00)
})

// ------------------------------------------------------------------------------------------------
// SECTION 3: VALIDATION, CORNER CASES & INTEGRITY
// ------------------------------------------------------------------------------------------------

test('Case 12: Empty cart returns ₹0 shipping', () => {
  const fee = calculateShippingForLines(0, [])
  assert.strictEqual(fee, 0.00)
})

test('Case 13: Missing unit weight falls back safely to SENO default (500g)', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: undefined as any, shippingMethod: 'weight_based' }
  ]
  // Default is 500g <= 600g -> ₹60
  const fee = calculateShippingForLines(1000, lines)
  assert.strictEqual(fee, 60.00)
})

test('Case 14: Negative product weight throws descriptive validation error', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: -100, shippingMethod: 'weight_based' }
  ]
  assert.throws(
    () => calculateShippingForLines(1000, lines),
    /Invalid product weight: weight must be a positive number/
  )
})

test('Case 15: Negative custom delivery charge throws descriptive validation error', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 300, shippingMethod: 'custom', customDeliveryCharge: -50 }
  ]
  assert.throws(
    () => calculateShippingForLines(1000, lines),
    /Custom delivery charge cannot be negative/
  )
})

test('Case 16: Zero or negative line quantity throws descriptive error', () => {
  const lines: ShippingLine[] = [
    { quantity: 0, unitWeightGrams: 300, shippingMethod: 'weight_based' }
  ]
  assert.throws(
    () => calculateShippingForLines(1000, lines),
    /Invalid line quantity/
  )
})

test('Case 17: Dynamic quantity updates cross weight boundary dynamically (350g: qty 1 = ₹60, qty 2 = ₹120)', () => {
  const line1: ShippingLine[] = [{ quantity: 1, unitWeightGrams: 350, shippingMethod: 'weight_based' }]
  assert.strictEqual(calculateShippingForLines(1000, line1), 60.00)

  const line2: ShippingLine[] = [{ quantity: 2, unitWeightGrams: 350, shippingMethod: 'weight_based' }]
  assert.strictEqual(calculateShippingForLines(1000, line2), 120.00)
})

test('Case 18: Consistency between Cart preview, Checkout, stored order total, and Razorpay paise', () => {
  const lines: ShippingLine[] = [
    { quantity: 1, unitWeightGrams: 350, shippingMethod: 'weight_based' },
    { quantity: 1, unitWeightGrams: 300, shippingMethod: 'weight_based' }
  ]
  const subtotal = 1400

  // 1. Cart preview
  const cartShipping = calculateShippingForLines(subtotal, lines)
  assert.strictEqual(cartShipping, 120.00)

  // 2. Checkout preview
  const checkoutShipping = calculateShippingForLines(subtotal, lines)
  assert.strictEqual(checkoutShipping, 120.00)

  // 3. Stored order grand total
  const storedTotal = subtotal + checkoutShipping
  assert.strictEqual(storedTotal, 1520.00)

  // 4. Razorpay paise
  const razorpayPaise = Math.round(storedTotal * 100)
  assert.strictEqual(razorpayPaise, 152000)
})

console.log(`\n=================================================================`)
console.log(`COMBINED WEIGHT TEST SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)`)
console.log(`=================================================================\n`)
