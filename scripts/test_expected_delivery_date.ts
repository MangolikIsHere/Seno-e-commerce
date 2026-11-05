/**
 * End-to-End Verification Test Suite:
 * SENO Expected Delivery Date Management System
 *
 * Verifies:
 * 1. Date calculation utility & Asia/Kolkata timezone
 * 2. Leap years, month boundaries, year-end transitions
 * 3. Range constraints & input normalization (1-60 days, default 7)
 * 4. Multi-item cart evaluation (MAX rule for overall order, individual item ETAs)
 * 5. Order snapshot persistence & immutability across subsequent days
 * 6. Compatibility with existing shipping calculation logic
 */

import {
  normalizeDeliveryDays,
  calculateExpectedDeliveryDate,
  formatDeliveryByDate,
  formatExpectedDeliveryDate,
  evaluateOrderDelivery,
  DEFAULT_DELIVERY_DAYS,
  MIN_DELIVERY_DAYS,
  MAX_DELIVERY_DAYS,
  enrichOrderWithDeliverySnapshot
} from '../lib/deliveryDate'

import { calculateShippingFee, DEFAULT_SHIPPING_SETTINGS } from '../lib/shipping'

let passed = 0
let failed = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || 'Assertion failed'}`)
    failed++
  }
}

console.log('--- TEST SUITE 1: Normalization & Boundary Constraints ---')

assert(
  normalizeDeliveryDays(undefined) === DEFAULT_DELIVERY_DAYS,
  'Undefined defaults to 7 days'
)
assert(
  normalizeDeliveryDays(null) === DEFAULT_DELIVERY_DAYS,
  'Null defaults to 7 days'
)
assert(
  normalizeDeliveryDays('') === DEFAULT_DELIVERY_DAYS,
  'Empty string defaults to 7 days'
)
assert(
  normalizeDeliveryDays('abc') === DEFAULT_DELIVERY_DAYS,
  'Invalid NaN string defaults to 7 days'
)
assert(
  normalizeDeliveryDays(0) === MIN_DELIVERY_DAYS,
  '0 is clamped to minimum 1 day'
)
assert(
  normalizeDeliveryDays(-10) === MIN_DELIVERY_DAYS,
  'Negative days clamped to minimum 1 day'
)
assert(
  normalizeDeliveryDays(1) === 1,
  '1 day accepted as minimum boundary'
)
assert(
  normalizeDeliveryDays(60) === 60,
  '60 days accepted as maximum boundary'
)
assert(
  normalizeDeliveryDays(61) === MAX_DELIVERY_DAYS,
  '61 days clamped to maximum 60 days'
)
assert(
  normalizeDeliveryDays(999) === MAX_DELIVERY_DAYS,
  '999 days clamped to maximum 60 days'
)
assert(
  normalizeDeliveryDays(' 14 ') === 14,
  'Numeric string " 14 " correctly parsed to 14'
)
assert(
  normalizeDeliveryDays(5.7) === 5,
  'Floating point 5.7 floored to integer 5'
)

console.log('\n--- TEST SUITE 2: Asia/Kolkata Calendar Calculations & Boundaries ---')

// Leap Year 2024: Feb 28, 2024 + 1 day should be Feb 29, 2024
const leapYearBase = '2024-02-28T10:00:00.000Z'
const leapYearResult = calculateExpectedDeliveryDate(leapYearBase, 1)
assert(
  leapYearResult.getUTCFullYear() === 2024 &&
  leapYearResult.getUTCMonth() === 1 && // February (0-indexed)
  leapYearResult.getUTCDate() === 29,
  'Leap Year: Feb 28, 2024 + 1 calendar day is Feb 29, 2024'
)

// Non-Leap Year 2025: Feb 28, 2025 + 1 day should be March 1, 2025
const nonLeapYearBase = '2025-02-28T10:00:00.000Z'
const nonLeapYearResult = calculateExpectedDeliveryDate(nonLeapYearBase, 1)
assert(
  nonLeapYearResult.getUTCFullYear() === 2025 &&
  nonLeapYearResult.getUTCMonth() === 2 && // March (0-indexed)
  nonLeapYearResult.getUTCDate() === 1,
  'Non-Leap Year: Feb 28, 2025 + 1 calendar day is March 1, 2025'
)

// Month Boundary: Jan 30, 2026 + 5 days should be Feb 4, 2026
const monthEndBase = '2026-01-30T10:00:00.000Z'
const monthEndResult = calculateExpectedDeliveryDate(monthEndBase, 5)
assert(
  monthEndResult.getUTCFullYear() === 2026 &&
  monthEndResult.getUTCMonth() === 1 && // February
  monthEndResult.getUTCDate() === 4,
  'Month Transition: Jan 30, 2026 + 5 calendar days is Feb 4, 2026'
)

// Year Boundary: Dec 28, 2026 + 7 days should be Jan 4, 2027
const yearEndBase = '2026-12-28T10:00:00.000Z'
const yearEndResult = calculateExpectedDeliveryDate(yearEndBase, 7)
assert(
  yearEndResult.getUTCFullYear() === 2027 &&
  yearEndResult.getUTCMonth() === 0 && // January
  yearEndResult.getUTCDate() === 4,
  'Year-End Transition: Dec 28, 2026 + 7 calendar days is Jan 4, 2027'
)

console.log('\n--- TEST SUITE 3: UI Formatting for PDP & Storefront ---')

const sampleDate = '2026-11-12T12:00:00.000Z'
const deliveryByText = formatDeliveryByDate(sampleDate)
assert(
  deliveryByText.startsWith('Delivery by '),
  'Product details format starts with "Delivery by "'
)
assert(
  deliveryByText.includes('Nov') || deliveryByText.includes('November'),
  'Includes month name in Asia/Kolkata'
)
console.log(`    [Preview]: "${deliveryByText}"`)

const standardFormat = formatExpectedDeliveryDate(sampleDate)
assert(
  typeof standardFormat === 'string' && standardFormat.length > 5,
  'Standard format outputs readable date string'
)
console.log(`    [Preview Standard]: "${standardFormat}"`)

console.log('\n--- TEST SUITE 4: Multi-Item Mixed Cart Evaluation ---')

const mockCart = [
  {
    product: { id: 'p1', name: 'Cotton Silk Shirt', expectedDeliveryDays: 3 },
    quantity: 1
  },
  {
    product: { id: 'p2', name: 'Handcrafted Trench Coat', expectedDeliveryDays: 10 },
    quantity: 1
  },
  {
    product: { id: 'p3', name: 'Crochet Bag', expectedDeliveryDays: 5 },
    quantity: 2
  }
]

const evaluation = evaluateOrderDelivery(mockCart)

assert(
  evaluation.maxDeliveryDays === 10,
  'Overall order delivery days is MAX(3, 10, 5) = 10'
)
assert(
  evaluation.itemDeliveryMap['p1']?.days === 3,
  'Item 1 retains individual 3 days delivery duration'
)
assert(
  evaluation.itemDeliveryMap['p2']?.days === 10,
  'Item 2 retains individual 10 days delivery duration'
)
assert(
  evaluation.itemDeliveryMap['p3']?.days === 5,
  'Item 3 retains individual 5 days delivery duration'
)
assert(
  evaluation.earliestDate <= evaluation.latestDate,
  'Earliest date is before or equal to latest delivery date'
)

console.log('\n--- TEST SUITE 5: Order Snapshot Persistence & Historical Immutability ---')

// Order placed 30 days ago with expected 7 days
const historicalPlacedDate = '2026-10-01T12:00:00.000Z'
const historicalOrder = {
  id: 'ord_historical_001',
  order_number: 'SENO-26-8819',
  created_at: historicalPlacedDate,
  expected_delivery_date: null, // Legacy order before migration
  expected_delivery_days: null,
  order_items: [
    {
      id: 'itm_001',
      product_name: 'Classic Linen Trouser',
      created_at: historicalPlacedDate,
      estimated_delivery_date: null,
      expected_delivery_days: null
    }
  ]
}

const enriched = enrichOrderWithDeliverySnapshot(historicalOrder)

assert(
  enriched.expected_delivery_date !== null && enriched.expected_delivery_date !== undefined,
  'Historical order receives an authoritative snapshot date'
)
assert(
  enriched.expected_delivery_days === 7,
  'Historical order receives standard default 7 days duration'
)
assert(
  new Date(enriched.expected_delivery_date!).getUTCMonth() === 9 && // October
  new Date(enriched.expected_delivery_date!).getUTCDate() === 8,
  'Snapshot anchors permanently to created_at (Oct 1 + 7 days = Oct 8), NOT today'
)

// Verify repeated enrichments yield the EXACT same fixed timestamp
const enrichedSecondTime = enrichOrderWithDeliverySnapshot(enriched)
assert(
  enrichedSecondTime.expected_delivery_date === enriched.expected_delivery_date,
  'Existing snapshot is immutable and NEVER changes on subsequent views or days'
)

console.log('\n--- TEST SUITE 6: Compatibility with Existing Shipping Fee Logic ---')

const feeBelowThreshold = calculateShippingFee(1000, 400)
assert(
  typeof feeBelowThreshold === 'number' && feeBelowThreshold > 0,
  `Combined shipping fee below threshold calculated properly: ₹${feeBelowThreshold}`
)

const feeAboveThreshold = calculateShippingFee(5000, 1200)
assert(
  feeAboveThreshold === 0,
  'Free shipping threshold remains intact (₹0 fee for eligible subtotal)'
)

console.log('\n======================================================')
console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`)
console.log('======================================================')

if (failed > 0) {
  process.exit(1)
} else {
  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!')
}
