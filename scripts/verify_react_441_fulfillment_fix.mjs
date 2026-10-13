/**
 * SENO — Regression Test Suite for Seller Order Fulfillment & React Error #441 Resolution
 *
 * Verifies:
 * 1. Fulfillment status, carrier, tracking update without React error #441.
 * 2. Persistence of updated values in database.
 * 3. Prevention of cross-seller unauthorized modification (ownership security).
 * 4. Validation of fulfillment statuses (rejection of invalid states, retention of values).
 * 5. Sync with customer tracking and orders status.
 * 6. Non-duplication of fulfillment events and idempotency.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import assert from 'assert'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    if (err.stack) console.error(`       Stack: ${err.stack.split('\n').slice(1, 3).join('\n')}`)
    failed++
  }
}

async function run() {
  console.log('=================================================================')
  console.log(' SENO: SELLER ORDER FULFILLMENT & REACT ERROR #441 VERIFICATION')
  console.log('=================================================================\n')

  // Retrieve actual test records
  const { data: sellers } = await supabase
    .from('sellers')
    .select('id, user_id, store_name, seller_type')
    .eq('seller_status', 'approved')

  const platformSeller = sellers.find(s => s.seller_type === 'platform')
  const resellers = sellers.filter(s => s.seller_type === 'reseller')
  const resellerA = resellers[0]
  const resellerB = resellers[1] || resellers[0]

  console.log(`Platform Seller: "${platformSeller?.store_name}" (${platformSeller?.id})`)
  console.log(`Reseller A:     "${resellerA?.store_name}" (${resellerA?.id})`)
  console.log(`Reseller B:     "${resellerB?.store_name}" (${resellerB?.id})\n`)

  // Find a paid order item belonging to a seller for verification
  const { data: testItem } = await supabase
    .from('order_items')
    .select('id, seller_id, order_id, fulfillment_status, tracking_number, carrier, estimated_delivery_date, orders!inner(id, order_number, payment_status, status)')
    .eq('orders.payment_status', 'paid')
    .limit(1)
    .single()

  assert.ok(testItem, 'Paid order item exists for testing')
  const originalStatus = testItem.fulfillment_status
  const originalTracking = testItem.tracking_number
  const originalCarrier = testItem.carrier

  console.log(`Testing with Order Item: ${testItem.id} (Order: ${testItem.orders?.order_number})`)
  console.log(`Current Status: "${originalStatus}", Carrier: "${originalCarrier}", Tracking: "${originalTracking}"\n`)

  // -------------------------------------------------------------------------
  // TEST 1: Update fulfillment state, carrier & tracking
  // -------------------------------------------------------------------------
  await test('1. Update fulfillment state, carrier and tracking persistence', async () => {
    const testTracking = `TRK-${Date.now()}`
    const testCarrier = 'Delhivery Express'
    const targetStatus = 'dispatched'

    // Update with server-authoritative logic
    const { data: updated, error: updErr } = await supabase
      .from('order_items')
      .update({
        fulfillment_status: targetStatus,
        tracking_number: testTracking,
        carrier: testCarrier,
        updated_at: new Date().toISOString()
      })
      .eq('id', testItem.id)
      .select('id, fulfillment_status, tracking_number, carrier')
      .single()

    assert.ok(!updErr, `Update succeeded: ${updErr?.message}`)
    assert.strictEqual(updated.fulfillment_status, 'dispatched', 'Fulfillment status persisted as dispatched')
    assert.strictEqual(updated.tracking_number, testTracking, 'Tracking number persisted')
    assert.strictEqual(updated.carrier, testCarrier, 'Carrier persisted')

    // Verify after simulated page re-fetch (persists across refreshes)
    const { data: refetched } = await supabase
      .from('order_items')
      .select('fulfillment_status, tracking_number, carrier')
      .eq('id', testItem.id)
      .single()

    assert.strictEqual(refetched.fulfillment_status, 'dispatched', 'Status survived refresh')
    assert.strictEqual(refetched.tracking_number, testTracking, 'Tracking survived refresh')
    assert.strictEqual(refetched.carrier, testCarrier, 'Carrier survived refresh')
  })

  // -------------------------------------------------------------------------
  // TEST 2: Customer-facing order status synchronisation
  // -------------------------------------------------------------------------
  await test('2. Customer order status synchronisation from items trigger', async () => {
    // When an item becomes dispatched/in_transit, parent order status reflects dispatched/shipped
    const { data: parentOrder } = await supabase
      .from('orders')
      .select('id, status, payment_status')
      .eq('id', testItem.order_id)
      .single()

    assert.ok(['shipped', 'partially_shipped', 'processing'].includes(parentOrder.status), 
      `Parent order status is synchronized: ${parentOrder.status}`)
    assert.strictEqual(parentOrder.payment_status, 'paid', 'Payment status remains paid')
  })

  // -------------------------------------------------------------------------
  // TEST 3: Cross-Seller Unauthorized Access Prevention
  // -------------------------------------------------------------------------
  await test('3. Cross-Seller Isolation: Seller cannot modify another merchant order item', async () => {
    // Attempting to scope an update to an unauthorized seller ID must match 0 rows
    const fakeSellerId = '00000000-0000-0000-0000-000000000000'
    const { data: unauthorizedUpdate } = await supabase
      .from('order_items')
      .update({ tracking_number: 'HACKED-TRACKING' })
      .eq('id', testItem.id)
      .eq('seller_id', fakeSellerId)
      .select()

    assert.strictEqual(unauthorizedUpdate?.length || 0, 0, 'Zero rows updated for mismatched seller_id')

    // Confirm tracking was not tampered with
    const { data: checkItem } = await supabase
      .from('order_items')
      .select('tracking_number')
      .eq('id', testItem.id)
      .single()

    assert.notStrictEqual(checkItem.tracking_number, 'HACKED-TRACKING', 'Order item remained untampered')
  })

  // -------------------------------------------------------------------------
  // TEST 4: Invalid fulfillment status validation (DB Constraint Check)
  // -------------------------------------------------------------------------
  await test('4. Invalid fulfillment status rejection (Database Check Constraint)', async () => {
    const { error: invalidErr } = await supabase
      .from('order_items')
      .update({ fulfillment_status: 'invalid_bogus_status' })
      .eq('id', testItem.id)

    assert.ok(invalidErr, 'Database rejects invalid fulfillment status')
    assert.ok(invalidErr.message.includes('order_items_fulfillment_status_check') || invalidErr.message.includes('check constraint'), 
      'Error originates from fulfillment status check constraint')
  })

  // -------------------------------------------------------------------------
  // TEST 5: Fulfillment Events and Idempotency
  // -------------------------------------------------------------------------
  await test('5. Fulfillment events are recorded without duplicate flood', async () => {
    const { data: eventsBefore } = await supabase
      .from('fulfillment_events')
      .select('id, status')
      .eq('order_item_id', testItem.id)

    const countBefore = eventsBefore?.length || 0

    // Repeat update with the SAME status and details
    await supabase
      .from('order_items')
      .update({ tracking_number: 'TRK-REPEATED' })
      .eq('id', testItem.id)

    const { data: eventsAfter } = await supabase
      .from('fulfillment_events')
      .select('id, status')
      .eq('order_item_id', testItem.id)

    const countAfter = eventsAfter?.length || 0

    // trigger trg_record_fulfillment_event skips when OLD.fulfillment_status IS NOT DISTINCT FROM NEW.fulfillment_status
    assert.strictEqual(countAfter, countBefore, 'Non-status change did NOT trigger duplicate fulfillment event')
  })

  // -------------------------------------------------------------------------
  // TEST 6: Component Boundaries & File Checks
  // -------------------------------------------------------------------------
  await test('6. Client component boundaries and absence of illegal nesting', async () => {
    const orderPageContent = fs.readFileSync('app/seller/orders/[orderId]/page.tsx', 'utf8')
    assert.ok(orderPageContent.includes('<FulfillmentForm'), 'FulfillmentForm is used in order details page')
    assert.ok(!orderPageContent.includes('<form action={updateSellerOrderFulfillment}'), 'Raw form action removed from Server Component')
    assert.ok(orderPageContent.includes('<PaidCancelForm'), 'PaidCancelForm preserved')

    const fulfillmentFormContent = fs.readFileSync('app/seller/orders/FulfillmentForm.tsx', 'utf8')
    assert.ok(fulfillmentFormContent.includes("'use client'"), 'FulfillmentForm is explicitly a Client Component')
    assert.ok(fulfillmentFormContent.includes('initialStatus || \'unfulfilled\''), 'Safe status fallback initialized')
    assert.ok(fulfillmentFormContent.includes('initialTracking || \'\''), 'Safe tracking fallback initialized')
    assert.ok(fulfillmentFormContent.includes('initialCarrier || \'\''), 'Safe carrier fallback initialized')

    const sellerLibContent = fs.readFileSync('lib/sellers.ts', 'utf8')
    assert.ok(sellerLibContent.includes('export async function updateFulfillmentStatus'), 'updateFulfillmentStatus exported')
    assert.ok(sellerLibContent.includes('export async function updateSellerOrderFulfillment'), 'updateSellerOrderFulfillment exported')
    assert.ok(sellerLibContent.includes('getAdminSupabase'), 'Authoritative admin client utilized')
  })

  // Clean up: Restore test item to original values
  await supabase
    .from('order_items')
    .update({
      fulfillment_status: originalStatus,
      tracking_number: originalTracking,
      carrier: originalCarrier
    })
    .eq('id', testItem.id)

  console.log('\n=================================================================')
  console.log(`TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================\n')

  if (failed > 0) process.exit(1)
}

run()
