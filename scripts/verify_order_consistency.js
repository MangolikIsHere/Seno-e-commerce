/**
 * Focused Verification Suite for SENO Order / Payment / Inventory / Seller Consistency Fix
 * Tests acceptance criteria from Section X of specification.
 */

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('======================================================================')
console.log('   SENO ORDER / PAYMENT / INVENTORY / SELLER CONSISTENCY VERIFICATION')
console.log('======================================================================\n')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

let passed = 0
let failed = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`       ${err.message}`)
    failed++
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn()
    console.log(`✅ PASS: ${name}`)
    passed++
  } catch (err) {
    console.error(`❌ FAIL: ${name}`)
    console.error(`       ${err.message}`)
    failed++
  }
}

async function main() {
  // 1. Check Migration Presence & Content
  runTest('Corrective migration exists with strict order_items_reseller_select RLS policy', () => {
    const migPath = path.join(__dirname, '../supabase/migrations/20260918170000_seller_fulfillment_and_webhook_security.sql')
    assert.ok(fs.existsSync(migPath), 'Migration file missing')
    const sql = fs.readFileSync(migPath, 'utf8')
    assert.ok(sql.includes("o.payment_status = 'paid'"), 'Must enforce paid payment status')
    assert.ok(sql.includes("o.status NOT IN ('cancelled')"), 'Must reject cancelled orders')
    assert.ok(sql.includes("order_items_reseller_update"), 'Must guard reseller updates')
  })

  // 2. Check Service Role Key in Environment
  runTest('SUPABASE_SERVICE_ROLE_KEY is configured in environment', () => {
    assert.ok(supabaseServiceKey, 'SUPABASE_SERVICE_ROLE_KEY is required for webhook/server operations')
    assert.ok(supabaseServiceKey.length > 50, 'Key format invalid')
  })

  // 3. Check customer face order visibility is paid-only and server-authoritative
  runTest('lib/orders.ts customer queries enforce payment_status = paid and customer ownership', () => {
    const ordersSource = fs.readFileSync(path.join(__dirname, '../lib/orders.ts'), 'utf8')
    assert.ok(ordersSource.includes(".eq('customer_id', user.id)"), 'Customer list must scope to authenticated customer')
    assert.ok(ordersSource.includes(".eq('payment_status', 'paid')"), 'Customer-facing orders must be paid-only')
    assert.ok(ordersSource.includes(".eq('id', orderId)"), 'Order-detail lookup must include order ID')
  })

  // 4. Check getSellerOrders query in lib/sellers.ts
  runTest('lib/sellers.ts getSellerOrders strictly filters orders!inner with payment_status = paid', () => {
    const sellersSource = fs.readFileSync(path.join(__dirname, '../lib/sellers.ts'), 'utf8')
    assert.ok(sellersSource.includes("orders!inner"), 'Must use orders!inner join')
    assert.ok(sellersSource.includes(".eq('orders.payment_status', 'paid')"), 'Must filter by paid status')
    assert.ok(sellersSource.includes("confirmed"), 'Must verify confirmed fulfillment status')
  })

  // 5. Check Webhook Handler uses Service Role & Revalidation
  runTest('app/api/webhooks/razorpay/route.ts uses privileged admin client and revalidates caches', () => {
    const webhookSource = fs.readFileSync(path.join(__dirname, '../app/api/webhooks/razorpay/route.ts'), 'utf8')
    assert.ok(webhookSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Must support service role key')
    assert.ok(webhookSource.includes("revalidatePath('/seller/orders')"), 'Must revalidate seller orders')
    assert.ok(webhookSource.includes("revalidatePath('/admin/orders')"), 'Must revalidate admin orders')
  })

  // 5. Database Direct Integrity Queries
  const adminClient = createClient(supabaseUrl, supabaseServiceKey)

  await runAsyncTest('Database Audit: Paid order SENO-20260918-573178 belongs to Platform Seller', async () => {
    const { data, error } = await adminClient
      .from('orders')
      .select('order_number, status, payment_status, order_items(product_name, sku, seller_id)')
      .eq('order_number', 'SENO-20260918-573178')
      .single()

    assert.ifError(error)
    assert.strictEqual(data.payment_status, 'paid')
    assert.strictEqual(data.status, 'confirmed')
    assert.strictEqual(data.order_items[0].product_name, 'Russian tulip')
    assert.strictEqual(data.order_items[0].seller_id, 'fb09c575-2d0c-48d8-b1ff-b7a1ead8407a') // Platform seller
  })

  await runAsyncTest('Database Audit: Reseller query for MY FASHION BOUTIQUE returns 0 unpaid/cancelled orders', async () => {
    const resellerId = '41cd4b62-5088-455a-b73f-8b4330c13f04'
    const { data, error } = await adminClient
      .from('order_items')
      .select('*, orders!inner(order_number, status, payment_status)')
      .eq('seller_id', resellerId)
      .eq('orders.payment_status', 'paid')
      .in('orders.status', ['confirmed', 'processing', 'partially_shipped', 'shipped', 'delivered'])

    assert.ifError(error)
    assert.strictEqual(data.length, 0, 'Must have 0 fulfillable orders until customer pays')
  })

  await runAsyncTest('Database Audit: Customer order history preserves all placed orders (confirmed, pending, cancelled)', async () => {
    const customerId = '45a9c899-6565-4834-a058-32639c4d5433'
    const { data, error } = await adminClient
      .from('orders')
      .select('order_number, status, payment_status')
      .eq('customer_id', customerId)

    assert.ifError(error)
    assert.ok(data.length >= 3, 'Must retain all historical orders')
    const paid = data.find(o => o.order_number === 'SENO-20260918-573178')
    assert.ok(paid && paid.payment_status === 'paid', 'Confirmed order present')
    const cancelled = data.find(o => o.order_number === 'SENO-20260918-948231')
    assert.ok(cancelled && cancelled.status === 'cancelled', 'Cancelled order present')
  })

  await runAsyncTest('Database Audit: Inventory for SENO-3-PIECE is restored to 1 unit', async () => {
    const { data, error } = await adminClient
      .from('product_variants')
      .select('sku, inventory(quantity)')
      .eq('sku', 'SENO-3-PIECE')
      .single()

    assert.ifError(error)
    const qty = Array.isArray(data.inventory) ? data.inventory[0]?.quantity : data.inventory?.quantity
    assert.strictEqual(qty, 1, 'Inventory must be restored to 1 unit after cancellation of unpaid test order')
  })

  await runAsyncTest('Database Audit: Snapshot fidelity - unit price, commission rate, and payout amount are persisted', async () => {
    const { data, error } = await adminClient
      .from('order_items')
      .select('product_name, unit_price, commission_rate, commission_amount, seller_payout_amount')
      .eq('sku', 'SENO-3-PIECE')
      .limit(1)
      .single()

    assert.ifError(error)
    assert.strictEqual(Number(data.unit_price), 899)
    assert.strictEqual(Number(data.commission_rate), 10)
    assert.strictEqual(Number(data.commission_amount), 89.90)
    assert.strictEqual(Number(data.seller_payout_amount), 809.10)
  })

  console.log('\n----------------------------------------------------------------------')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log('----------------------------------------------------------------------')

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\n🎉 ALL ORDER / PAYMENT / INVENTORY / SELLER CONSISTENCY CHECKS PASSED!\n')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Test script crashed:', err)
  process.exit(1)
})
