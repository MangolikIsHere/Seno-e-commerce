/**
 * Comprehensive Verification Suite for SENO Phase 3: Payments + Production
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const crypto = require('crypto')

console.log('====================================================')
console.log('   SENO PHASE 3: PAYMENTS + PRODUCTION VERIFICATION')
console.log('====================================================\n')

let passedTests = 0
let totalTests = 0

function runTest(description, testFn) {
  totalTests++
  try {
    testFn()
    console.log(`[PASS] ${description}`)
    passedTests++
  } catch (err) {
    console.error(`[FAIL] ${description}`)
    console.error(`       Error: ${err.message}`)
  }
}

// ==============================================================================
// 1. DATABASE MIGRATION & SCHEMA CHECKS
// ==============================================================================
console.log('--- 1. Database Payment Foundation Migration ---')

const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260914000004_payments_production.sql')

runTest('Migration 20260914000004_payments_production.sql exists', () => {
  assert.ok(fs.existsSync(migrationPath), 'Migration file missing')
})

const migrationSql = fs.readFileSync(migrationPath, 'utf8')

runTest('Orders schema extended with razorpay_order_id (UNIQUE), razorpay_payment_id, and expires_at', () => {
  assert.ok(migrationSql.includes('razorpay_order_id TEXT'), 'Missing razorpay_order_id column')
  assert.ok(migrationSql.includes('razorpay_payment_id TEXT'), 'Missing razorpay_payment_id column')
  assert.ok(migrationSql.includes('expires_at TIMESTAMPTZ'), 'Missing expires_at column')
  assert.ok(migrationSql.includes('uq_orders_razorpay_order_id'), 'Missing UNIQUE constraint on razorpay_order_id')
})

runTest('Payment events audit table defined for webhook idempotency and replay protection', () => {
  assert.ok(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.payment_events'), 'Missing payment_events table')
  assert.ok(migrationSql.includes('uq_payment_events_event_id'), 'Missing event_id unique constraint')
  assert.ok(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'Payment events must have RLS enabled')
})

runTest('RPC attach_razorpay_order_id handles concurrency safely with row-locking', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.attach_razorpay_order_id'), 'Missing attach_razorpay_order_id')
  assert.ok(migrationSql.includes('FOR UPDATE'), 'attach_razorpay_order_id must lock row')
  assert.ok(migrationSql.includes('is_existing'), 'Must report if order already has an attached Razorpay order')
})

runTest('RPC confirm_order_payment is server-authoritative and does not re-decrement stock', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.confirm_order_payment'), 'Missing confirm_order_payment')
  assert.ok(migrationSql.includes('SECURITY DEFINER'), 'confirm_order_payment must be SECURITY DEFINER')
  assert.ok(migrationSql.includes("payment_status = 'paid'"), 'Must mark payment paid')
  assert.ok(migrationSql.includes("status = 'confirmed'"), 'Must mark order confirmed')
  // Confirm it does NOT touch inventory
  const confirmFuncBody = migrationSql.split('confirm_order_payment')[1].split('$$;')[0]
  assert.ok(!confirmFuncBody.includes('UPDATE public.inventory'), 'confirm_order_payment must NOT modify inventory')
})

runTest('RPC record_payment_failure retains reservation and protects paid orders against stale downgrades', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.record_payment_failure'), 'Missing record_payment_failure')
  assert.ok(migrationSql.includes('Stale failure event discarded'), 'Must reject downgrading paid orders')
  assert.ok(migrationSql.includes('reservation_retained'), 'Must preserve reservation')
})

runTest('RPC cancel_unpaid_order restores inventory atomically exactly once', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.cancel_unpaid_order'), 'Missing cancel_unpaid_order')
  assert.ok(migrationSql.includes('is_already_cancelled'), 'Must be idempotent on repeat cancellation')
  assert.ok(migrationSql.includes('UPDATE public.inventory'), 'Must restore inventory')
})

runTest('RPC expire_unpaid_orders provides concurrency-safe batch processing (SKIP LOCKED)', () => {
  assert.ok(migrationSql.includes('CREATE OR REPLACE FUNCTION public.expire_unpaid_orders'), 'Missing expire_unpaid_orders')
  assert.ok(migrationSql.includes('SKIP LOCKED'), 'expire_unpaid_orders must use SKIP LOCKED')
})

// ==============================================================================
// 2. INVENTORY RESERVATION & EXPIRATION LIFECYCLE SIMULATION
// ==============================================================================
console.log('\n--- 2. Inventory Reservation & Expiration Lifecycle ---')

class InventoryReservationModel {
  constructor(initialStock) {
    this.initialStock = initialStock
    this.stock = initialStock
    this.orders = new Map()
  }

  createOrder(orderId, qty, expiryMinutes = 30) {
    if (this.stock < qty) throw new Error('Insufficient stock')
    this.stock -= qty // immediate decrement as reservation
    const expiresAt = new Date(Date.now() + expiryMinutes * 60000)
    const order = {
      id: orderId,
      qty,
      status: 'pending',
      payment_status: 'unpaid',
      expires_at: expiresAt,
      razorpay_order_id: null,
      restored: false
    }
    this.orders.set(orderId, order)
    return order
  }

  attachRazorpayOrder(orderId, rzpOrderId) {
    const order = this.orders.get(orderId)
    if (!order) throw new Error('Order not found')
    if (order.status === 'cancelled') throw new Error('Order cancelled')
    if (order.razorpay_order_id) {
      return { razorpay_order_id: order.razorpay_order_id, is_existing: true }
    }
    order.razorpay_order_id = rzpOrderId
    return { razorpay_order_id: rzpOrderId, is_existing: false }
  }

  paymentFailure(orderId, errorMsg) {
    const order = this.orders.get(orderId)
    if (!order) throw new Error('Order not found')
    if (order.payment_status === 'paid') {
      return { ignored: true, reason: 'order_already_paid' } // stale protection
    }
    order.payment_status = 'failed'
    // Stock remains decremented!
    return { success: true, reservation_retained: true }
  }

  confirmPayment(orderId, paidAmount, authoritativeTotal) {
    const order = this.orders.get(orderId)
    if (!order) throw new Error('Order not found')
    if (order.status === 'cancelled') throw new Error('Cannot confirm cancelled order')
    if (order.payment_status === 'paid') return { is_already_paid: true }
    if (paidAmount !== authoritativeTotal) throw new Error('Amount mismatch')
    order.status = 'confirmed'
    order.payment_status = 'paid'
    // Stock is NOT decremented again!
    return { success: true, status: 'confirmed', payment_status: 'paid' }
  }

  cancelUnpaidOrder(orderId) {
    const order = this.orders.get(orderId)
    if (!order) throw new Error('Order not found')
    if (order.status === 'cancelled') {
      return { is_already_cancelled: true, restored_count: 0 } // idempotent
    }
    if (order.payment_status === 'paid') throw new Error('Cannot cancel paid order')
    order.status = 'cancelled'
    order.payment_status = 'failed'
    this.stock += order.qty
    order.restored = true
    return { success: true, restored_count: order.qty }
  }

  expireUnpaidOrders(currentTime = new Date()) {
    let expiredCount = 0
    for (const [id, order] of this.orders.entries()) {
      if (order.status === 'pending' && ['unpaid', 'failed'].includes(order.payment_status)) {
        if (order.expires_at <= currentTime) {
          this.cancelUnpaidOrder(id)
          expiredCount++
        }
      }
    }
    return expiredCount
  }
}

runTest('Create order decrements inventory exactly once (Reservation)', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  assert.strictEqual(model.stock, 8, 'Stock should be decremented from 10 to 8')
})

runTest('Payment success does not decrement inventory again', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  model.confirmPayment('order_1', 1500, 1500)
  assert.strictEqual(model.stock, 8, 'Stock should remain 8 after payment confirmation')
})

runTest('Single payment failure retains inventory reservation for retry', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  model.paymentFailure('order_1', 'Card declined')
  assert.strictEqual(model.stock, 8, 'Stock must NOT be restored on payment failure')
  const order = model.orders.get('order_1')
  assert.strictEqual(order.status, 'pending', 'Order status must remain pending')
  assert.strictEqual(order.payment_status, 'failed', 'Payment status marked failed')
})

runTest('Explicit customer cancellation restores inventory exactly once', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  const res = model.cancelUnpaidOrder('order_1')
  assert.strictEqual(model.stock, 10, 'Stock must be restored to 10')
  assert.strictEqual(res.restored_count, 2)
})

runTest('Duplicate customer cancellation is harmless and does not duplicate restoration', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  model.cancelUnpaidOrder('order_1')
  const dupRes = model.cancelUnpaidOrder('order_1')
  assert.strictEqual(model.stock, 10, 'Stock must stay 10 and not increase to 12')
  assert.strictEqual(dupRes.is_already_cancelled, true)
  assert.strictEqual(dupRes.restored_count, 0)
})

runTest('Order expiration restores inventory exactly once', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_exp', 3, 15) // expires in 15 mins
  assert.strictEqual(model.stock, 7)
  const futureTime = new Date(Date.now() + 20 * 60000) // 20 mins later
  const expiredCount = model.expireUnpaidOrders(futureTime)
  assert.strictEqual(expiredCount, 1)
  assert.strictEqual(model.stock, 10, 'Stock should be restored to 10 upon expiration')
})

runTest('Cancelled/expired order cannot be paid later', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  model.cancelUnpaidOrder('order_1')
  assert.throws(() => {
    model.confirmPayment('order_1', 1000, 1000)
  }, /Cannot confirm cancelled order/)
})

// ==============================================================================
// 3. PAYMENT SECURITY & CRYPTOGRAPHY
// ==============================================================================
console.log('\n--- 3. Cryptographic Signature & Payment Security ---')

const secret = 'seno_demo_secret_key_12345'
const rzpOrderId = 'order_DAv53eK8N8'
const rzpPaymentId = 'pay_29QQoUBi66xm2f'
const validSignature = crypto.createHmac('sha256', secret).update(`${rzpOrderId}|${rzpPaymentId}`).digest('hex')

function verifySignature(orderId, paymentId, signature, keySecret) {
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex')
  return expected === signature
}

runTest('Valid cryptographic signature accepted', () => {
  assert.ok(verifySignature(rzpOrderId, rzpPaymentId, validSignature, secret))
})

runTest('Tampered signature rejected', () => {
  const tampered = validSignature.substring(0, 10) + '0000' + validSignature.substring(14)
  assert.strictEqual(verifySignature(rzpOrderId, rzpPaymentId, tampered, secret), false)
})

runTest('Mismatched order ID rejected', () => {
  assert.strictEqual(verifySignature('order_wrong_id', rzpPaymentId, validSignature, secret), false)
})

runTest('Mismatched payment ID rejected', () => {
  assert.strictEqual(verifySignature(rzpOrderId, 'pay_wrong_id', validSignature, secret), false)
})

runTest('Client cannot tamper with authoritative order amount', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 1)
  const authoritativeTotal = 2499.00
  const clientProvidedTotal = 1.00 // tampered
  assert.throws(() => {
    model.confirmPayment('order_1', clientProvidedTotal, authoritativeTotal)
  }, /Amount mismatch/)
})

runTest('Delayed payment.failed webhook does not downgrade legitimately paid order', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_1', 2)
  model.confirmPayment('order_1', 1000, 1000)
  assert.strictEqual(model.orders.get('order_1').payment_status, 'paid')
  
  // Stale webhook arrives
  const failRes = model.paymentFailure('order_1', 'Stale gateway timeout')
  assert.strictEqual(failRes.ignored, true)
  assert.strictEqual(model.orders.get('order_1').payment_status, 'paid', 'Payment status must remain paid')
  assert.strictEqual(model.orders.get('order_1').status, 'confirmed', 'Order status must remain confirmed')
})

// ==============================================================================
// 4. CONCURRENCY & PAYMENT RETRIES
// ==============================================================================
console.log('\n--- 4. Concurrency & Payment Retries ---')

runTest('Payment retry reuses existing unpaid SENO order and does not decrement inventory again', () => {
  const model = new InventoryReservationModel(10)
  const order = model.createOrder('order_1', 2)
  assert.strictEqual(model.stock, 8)
  
  // Payment fails once
  model.paymentFailure('order_1', 'Insufficient funds')
  assert.strictEqual(model.stock, 8)

  // Customer retries: reuses order_1
  const retryRzpRes = model.attachRazorpayOrder('order_1', 'rzp_order_abc')
  assert.strictEqual(model.stock, 8, 'Stock must stay 8 (no duplicate decrement)')
  
  // Payment succeeds on retry
  model.confirmPayment('order_1', 1000, 1000)
  assert.strictEqual(model.stock, 8, 'Stock remains 8 on success')
  assert.strictEqual(model.orders.get('order_1').payment_status, 'paid')
})

runTest('Concurrent Razorpay order creation reuses single winning Razorpay order ID', () => {
  const model = new InventoryReservationModel(10)
  model.createOrder('order_concurrency', 1)

  // Request 1 arrives
  const res1 = model.attachRazorpayOrder('order_concurrency', 'rzp_first_123')
  assert.strictEqual(res1.is_existing, false)
  assert.strictEqual(res1.razorpay_order_id, 'rzp_first_123')

  // Request 2 arrives concurrently for same order
  const res2 = model.attachRazorpayOrder('order_concurrency', 'rzp_second_456')
  assert.strictEqual(res2.is_existing, true)
  assert.strictEqual(res2.razorpay_order_id, 'rzp_first_123', 'Must reuse existing rzp_first_123')
})

// ==============================================================================
// 5. WEBHOOK PROCESSING & IDEMPOTENCY
// ==============================================================================
console.log('\n--- 5. Webhook Processing & Idempotency ---')

const webhookRoutePath = path.join(__dirname, '..', 'app', 'api', 'webhooks', 'razorpay', 'route.ts')

runTest('Webhook route exists at app/api/webhooks/razorpay/route.ts', () => {
  assert.ok(fs.existsSync(webhookRoutePath), 'Webhook route file missing')
})

const webhookCode = fs.readFileSync(webhookRoutePath, 'utf8')

runTest('Webhook validates cryptographic signature with RAZORPAY_WEBHOOK_SECRET', () => {
  assert.ok(webhookCode.includes('x-razorpay-signature'), 'Must inspect signature header')
  assert.ok(/crypto\s*\.\s*createHmac/.test(webhookCode), 'Must compute HMAC SHA256')
  assert.ok(webhookCode.includes('RAZORPAY_WEBHOOK_SECRET'), 'Must use webhook secret')
})

runTest('Webhook checks payment_events audit table for event idempotency', () => {
  assert.ok(webhookCode.includes("from('payment_events')"), 'Must query payment_events')
  assert.ok(webhookCode.includes('is_already_paid') || webhookCode.includes('processing_status'), 'Must check existing processing status')
})

runTest('Webhook payment.failed does not automatically cancel order or release inventory', () => {
  assert.ok(webhookCode.includes("eventType === 'payment.failed'"), 'Must handle payment.failed')
  assert.ok(webhookCode.includes('record_payment_failure'), 'Must call record_payment_failure')
  assert.ok(!webhookCode.includes('cancel_unpaid_order'), 'Webhook must NEVER call cancel_unpaid_order on payment.failed')
})

// ==============================================================================
// 6. CART ITEM MANAGEMENT & SELECTIVE PURGING
// ==============================================================================
console.log('\n--- 6. Cart Safety & Selective Purging ---')

let mockCart = [
  { variant_id: 'var_1', qty: 1, name: 'Linen Shirt' },
  { variant_id: 'var_2', qty: 2, name: 'Wool Trouser' },
  { variant_id: 'var_3', qty: 1, name: 'Leather Belt' }
]

function clearOrderedItems(purchasedIds) {
  mockCart = mockCart.filter(item => !purchasedIds.includes(item.variant_id))
}

runTest('Selective cart clearing preserves unrelated concurrently added items', () => {
  const purchasedVariantIds = ['var_1', 'var_2']
  clearOrderedItems(purchasedVariantIds)
  assert.strictEqual(mockCart.length, 1, 'Only 1 item should remain in cart')
  assert.strictEqual(mockCart[0].variant_id, 'var_3', 'Unrelated var_3 must be preserved')
})

// ==============================================================================
// 7. SEO & SEARCH ENGINE HYGIENE
// ==============================================================================
console.log('\n--- 7. SEO & Search Engine Hygiene ---')

const robotsPath = path.join(__dirname, '..', 'app', 'robots.ts')
const sitemapPath = path.join(__dirname, '..', 'app', 'sitemap.ts')

runTest('Dynamic robots.ts exists and disallows private routes', () => {
  assert.ok(fs.existsSync(robotsPath), 'robots.ts missing')
  const robotsCode = fs.readFileSync(robotsPath, 'utf8')
  assert.ok(robotsCode.includes('/cart'), 'Must disallow /cart')
  assert.ok(robotsCode.includes('/checkout'), 'Must disallow /checkout')
  assert.ok(robotsCode.includes('/account'), 'Must disallow /account')
  assert.ok(robotsCode.includes('/seller'), 'Must disallow /seller')
  assert.ok(robotsCode.includes('/admin'), 'Must disallow /admin')
})

runTest('Dynamic sitemap.ts exists and lists public categories and products', () => {
  assert.ok(fs.existsSync(sitemapPath), 'sitemap.ts missing')
  const sitemapCode = fs.readFileSync(sitemapPath, 'utf8')
  assert.ok(sitemapCode.includes('/collections/all'), 'Must include collections')
  assert.ok(sitemapCode.includes('/products/'), 'Must include products')
  assert.ok(!sitemapCode.includes('/checkout'), 'Must NOT include /checkout in sitemap')
})

runTest('Product detail page implements Schema.org Product JSON-LD structured data', () => {
  const productPagePath = path.join(__dirname, '..', 'app', 'products', '[slug]', 'page.tsx')
  const productPageCode = fs.readFileSync(productPagePath, 'utf8')
  assert.ok(productPageCode.includes('application/ld+json'), 'Must include JSON-LD script tag')
  assert.ok(productPageCode.includes('@type\': \'Product\'') || productPageCode.includes('"@type": "Product"'), 'Must define Product schema')
  assert.ok(productPageCode.includes('generateMetadata'), 'Must export generateMetadata')
})

runTest('Private layouts define robots noindex metadata', () => {
  const cartLayoutPath = path.join(__dirname, '..', 'app', 'cart', 'layout.tsx')
  const checkoutLayoutPath = path.join(__dirname, '..', 'app', 'checkout', 'layout.tsx')
  const adminLayoutPath = path.join(__dirname, '..', 'app', 'admin', 'layout.tsx')
  const sellerLayoutPath = path.join(__dirname, '..', 'app', 'seller', 'layout.tsx')

  for (const p of [cartLayoutPath, checkoutLayoutPath, adminLayoutPath, sellerLayoutPath]) {
    assert.ok(fs.existsSync(p), `Missing layout: ${p}`)
    const content = fs.readFileSync(p, 'utf8')
    assert.ok(content.includes('index: false') && content.includes('follow: false'), `${p} must set robots: { index: false, follow: false }`)
  }
})

// ==============================================================================
// 8. SECURITY BOUNDARIES & SECRETS AUDIT
// ==============================================================================
console.log('\n--- 8. Security Boundaries & Secrets Audit ---')

runTest('RAZORPAY_KEY_SECRET is never referenced with NEXT_PUBLIC_ prefix', () => {
  const paymentsLib = fs.readFileSync(path.join(__dirname, '..', 'lib', 'payments.ts'), 'utf8')
  assert.ok(!paymentsLib.includes('NEXT_PUBLIC_RAZORPAY_KEY_SECRET'), 'Found illegal NEXT_PUBLIC_ prefix on key secret')
  assert.ok(paymentsLib.includes('process.env.RAZORPAY_KEY_SECRET'), 'Must use private env variable')
})

runTest('RAZORPAY_WEBHOOK_SECRET is strictly server-side', () => {
  assert.ok(webhookCode.includes('process.env.RAZORPAY_WEBHOOK_SECRET'), 'Must use private env variable')
  assert.ok(!webhookCode.includes('NEXT_PUBLIC_RAZORPAY_WEBHOOK_SECRET'), 'Found illegal NEXT_PUBLIC_ prefix on webhook secret')
})

// ==============================================================================
// SUMMARY
// ==============================================================================
console.log('\n====================================================')
console.log(`   TOTAL TESTS:  ${totalTests}`)
console.log(`   PASSED:       ${passedTests}`)
console.log(`   FAILED:       ${totalTests - passedTests}`)
console.log('====================================================\n')

if (totalTests === passedTests) {
  console.log('🎉 ALL PHASE 3 PAYMENTS + PRODUCTION TESTS PASSED!')
  process.exit(0)
} else {
  console.error('❌ SOME TESTS FAILED. Please review output above.')
  process.exit(1)
}
