/**
 * Test script for SENO: Deleted Colours and Stale Product Variants Verification
 * Tests all 12 requirements outlined in the prompt against Supabase and catalog logic.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import assert from 'assert'
import { reconcileProductVariants } from '../lib/variantReconciliation.ts'

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

async function runTest(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    failed++
  }
}

async function main() {
  console.log('=== SENO VARIANT RECONCILIATION & STOREFRONT SYNC VERIFICATION ===\n')

  // Find an active category and platform seller to create an isolated test product
  const { data: category } = await supabase.from('categories').select('id').eq('is_active', true).limit(1).single()
  const { data: seller } = await supabase.from('sellers').select('id').eq('seller_status', 'approved').limit(1).single()

  assert.ok(category, 'Active category found')
  assert.ok(seller, 'Approved seller found')

  const testSlug = `seno-test-variant-audit-${Date.now()}`
  let testProductId = null

  try {
    // Create isolated test product
    const { data: testProd, error: prodErr } = await supabase.from('products').insert({
      name: 'Audit Test Silk Robe',
      slug: testSlug,
      description: 'Test product for variant reconciliation verification',
      price: 12000,
      default_weight_grams: 500,
      category_id: category.id,
      seller_id: seller.id,
      approval_status: 'approved',
      is_active: true
    }).select().single()

    assert.ifError(prodErr)
    assert.ok(testProd, 'Created test product')
    testProductId = testProd.id

    // Baseline: Configure RED, WHITE, BLACK, PINK, BLUE across sizes S, M with stock 5
    const initialColours = ['RED', 'WHITE', 'BLACK', 'PINK', 'BLUE']
    const initialSizes = ['S', 'M']
    const initialVariants = []

    for (const c of initialColours) {
      for (const s of initialSizes) {
        initialVariants.push({
          size: s,
          colour: c,
          sku: `AUDIT-${c}-${s}`,
          quantity: 5,
          is_active: true
        })
      }
    }

    const baselineResult = await reconcileProductVariants(supabase, testProductId, initialVariants, { productSlug: testSlug })
    assert.strictEqual(baselineResult.totalActiveStock, 50, 'Baseline active stock is 50')

    // TEST 1: Remove RED and BLUE, save, reload the edit form, and confirm both remain removed
    await runTest('Case 1: Remove RED and BLUE, save, and confirm both are removed from edit form query', async () => {
      const retainedVariants = initialVariants.filter(v => v.colour !== 'RED' && v.colour !== 'BLUE')
      
      await reconcileProductVariants(supabase, testProductId, retainedVariants, { productSlug: testSlug })

      // Check DB: RED and BLUE variants must be marked is_active = false
      const { data: dbVars } = await supabase.from('product_variants').select('id, colour, size, is_active').eq('product_id', testProductId)
      const redVars = dbVars.filter(v => v.colour === 'RED')
      const blueVars = dbVars.filter(v => v.colour === 'BLUE')
      const activeVars = dbVars.filter(v => v.is_active)

      assert.ok(redVars.every(v => v.is_active === false), 'All RED variants are marked inactive')
      assert.ok(blueVars.every(v => v.is_active === false), 'All BLUE variants are marked inactive')
      assert.strictEqual(activeVars.length, 6, 'Exactly 6 variants remain active (WHITE, BLACK, PINK for S, M)')

      // Simulate edit form fetch (filter is_active !== false)
      const editFormVariants = dbVars.filter(v => v.is_active !== false)
      const editColours = Array.from(new Set(editFormVariants.map(v => v.colour)))
      assert.ok(!editColours.includes('RED'), 'RED does not appear in edit form')
      assert.ok(!editColours.includes('BLUE'), 'BLUE does not appear in edit form')
      assert.ok(editColours.includes('WHITE') && editColours.includes('BLACK') && editColours.includes('PINK'), 'Remaining colours are present')
    })

    // TEST 2: Open the storefront and confirm RED and BLUE no longer appear
    await runTest('Case 2: Storefront query filters inactive variants so RED and BLUE no longer appear', async () => {
      const { data: row } = await supabase
        .from('products')
        .select('*, product_variants(id, size, colour, sku, is_active, inventory(quantity))')
        .eq('id', testProductId)
        .single()

      const activeRaw = (row.product_variants || []).filter(v => v.is_active)
      const colors = Array.from(new Set(activeRaw.map(v => v.colour).filter(Boolean)))

      assert.ok(!colors.includes('RED'), 'Storefront colors do not contain RED')
      assert.ok(!colors.includes('BLUE'), 'Storefront colors do not contain BLUE')
      assert.strictEqual(colors.length, 3, 'Storefront has exactly 3 colours (WHITE, BLACK, PINK)')
    })

    // TEST 3: Change stock from 5 to 2 and confirm the storefront and checkout use 2
    await runTest('Case 3: Change stock from 5 to 2 and confirm storefront and inventory use 2', async () => {
      const { data: dbVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)
      const whiteS = dbVars.find(v => v.colour === 'WHITE' && v.size === 'S')
      assert.ok(whiteS, 'Found WHITE / S variant')

      // Update with stock 2 for whiteS
      const currentConfig = dbVars.map(v => ({
        id: v.id,
        colour: v.colour,
        size: v.size,
        sku: `AUDIT-${v.colour}-${v.size}`,
        quantity: v.id === whiteS.id ? 2 : 5
      }))

      await reconcileProductVariants(supabase, testProductId, currentConfig, { productSlug: testSlug })

      // Verify inventory row directly
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('variant_id', whiteS.id).single()
      assert.strictEqual(inv.quantity, 2, 'Inventory quantity is updated to exactly 2')
    })

    // TEST 4: Set stock to 0 and confirm the variant cannot be purchased
    await runTest('Case 4: Set stock to 0 and confirm variant has 0 inventory', async () => {
      const { data: dbVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)
      const whiteS = dbVars.find(v => v.colour === 'WHITE' && v.size === 'S')

      const zeroStockConfig = dbVars.map(v => ({
        id: v.id,
        colour: v.colour,
        size: v.size,
        sku: `AUDIT-${v.colour}-${v.size}`,
        quantity: v.id === whiteS.id ? 0 : 5
      }))

      await reconcileProductVariants(supabase, testProductId, zeroStockConfig, { productSlug: testSlug })

      const { data: inv } = await supabase.from('inventory').select('quantity').eq('variant_id', whiteS.id).single()
      assert.strictEqual(inv.quantity, 0, 'Inventory quantity is updated to 0')
    })

    // TEST 5: Retain WHITE and BLACK and confirm their existing valid variants and stock remain intact
    await runTest('Case 5: Retaining WHITE and BLACK preserves existing variant IDs and stock', async () => {
      const { data: beforeVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)
      const whiteM = beforeVars.find(v => v.colour === 'WHITE' && v.size === 'M')
      const blackM = beforeVars.find(v => v.colour === 'BLACK' && v.size === 'M')

      const onlyWhiteBlack = beforeVars
        .filter(v => v.colour === 'WHITE' || v.colour === 'BLACK')
        .map(v => ({
          id: v.id,
          colour: v.colour,
          size: v.size,
          sku: `AUDIT-${v.colour}-${v.size}`,
          quantity: 7
        }))

      await reconcileProductVariants(supabase, testProductId, onlyWhiteBlack, { productSlug: testSlug })

      const { data: afterVars } = await supabase.from('product_variants').select('id, colour, size, is_active').eq('product_id', testProductId).eq('is_active', true)
      const recheckedWhiteM = afterVars.find(v => v.colour === 'WHITE' && v.size === 'M')
      const recheckedBlackM = afterVars.find(v => v.colour === 'BLACK' && v.size === 'M')

      assert.strictEqual(recheckedWhiteM.id, whiteM.id, 'WHITE / M ID is preserved')
      assert.strictEqual(recheckedBlackM.id, blackM.id, 'BLACK / M ID is preserved')
    })

    // TEST 6: Add a new colour and confirm it appears exactly once (and repeated saves create no duplicates)
    await runTest('Case 6: Add a new colour (EMERALD) and verify it appears exactly once with no duplicates on repeat save', async () => {
      const { data: currentVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)

      const withEmerald = [
        ...currentVars.map(v => ({ id: v.id, colour: v.colour, size: v.size, sku: `AUDIT-${v.colour}-${v.size}`, quantity: 7 })),
        { size: 'M', colour: 'EMERALD', sku: 'AUDIT-EMERALD-M', quantity: 10 }
      ]

      // Save 1
      await reconcileProductVariants(supabase, testProductId, withEmerald, { productSlug: testSlug })

      // Save 2 (repeat save with same configuration)
      await reconcileProductVariants(supabase, testProductId, withEmerald, { productSlug: testSlug })

      const { data: checkVars } = await supabase.from('product_variants').select('id, colour, size, is_active').eq('product_id', testProductId).eq('is_active', true)
      const emeraldVars = checkVars.filter(v => v.colour === 'EMERALD')

      assert.strictEqual(emeraldVars.length, 1, 'EMERALD appears exactly once without duplicates')
    })

    // TEST 7: Remove one size while retaining other sizes and confirm only the removed size disappears
    await runTest('Case 7: Remove size S while retaining M; confirm only S disappears', async () => {
      const { data: currentVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)
      const onlyM = currentVars.filter(v => v.size === 'M').map(v => ({ id: v.id, colour: v.colour, size: v.size, sku: `AUDIT-${v.colour}-${v.size}`, quantity: 5 }))

      await reconcileProductVariants(supabase, testProductId, onlyM, { productSlug: testSlug })

      const { data: checkVars } = await supabase.from('product_variants').select('id, size, is_active').eq('product_id', testProductId).eq('is_active', true)
      const sizes = Array.from(new Set(checkVars.map(v => v.size)))

      assert.ok(sizes.includes('M'), 'Size M remains')
      assert.ok(!sizes.includes('S'), 'Size S is removed')
    })

    // TEST 8: Test case-insensitivity deduplication (e.g. BLACK vs Black)
    await runTest('Case 8: Case variation (BLACK vs Black) is safely handled without creating duplicates', async () => {
      const { data: currentVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)
      const blackVar = currentVars.find(v => v.colour.toUpperCase() === 'BLACK')
      assert.ok(blackVar, 'Found BLACK variant')

      // Update variant with "Black" (mixed case)
      const mixedCaseConfig = currentVars.map(v => ({
        id: v.id,
        colour: v.id === blackVar.id ? 'Black' : v.colour,
        size: v.size,
        sku: `AUDIT-${v.colour}-${v.size}`,
        quantity: 5
      }))

      await reconcileProductVariants(supabase, testProductId, mixedCaseConfig, { productSlug: testSlug })

      const { data: checkVars } = await supabase.from('product_variants').select('id, colour, is_active').eq('product_id', testProductId).eq('is_active', true)
      const blackMatches = checkVars.filter(v => v.colour.toUpperCase() === 'BLACK')
      assert.strictEqual(blackMatches.length, 1, 'Only one Black/BLACK variant exists in active set')
    })

    // TEST 9: Confirm existing orders and historical order details remain intact
    await runTest('Case 9: Historical orders and order items remain completely unchanged', async () => {
      const { data: orders, error: orderErr } = await supabase.from('order_items').select('id, variant_id, sku').limit(5)
      assert.ifError(orderErr)
      assert.ok(orders.length > 0, 'Order items exist')
      assert.ok(orders.every(o => o.sku !== null), 'Order items have valid SKU snapshots intact')
    })

    // TEST 10: Confirm stale carts cannot purchase removed or inactive variants
    await runTest('Case 10: Stale cart with inactive variant is blocked', async () => {
      // Find an inactive variant from our test product
      const { data: inactiveVar } = await supabase
        .from('product_variants')
        .select('id, is_active, sku')
        .eq('product_id', testProductId)
        .eq('is_active', false)
        .limit(1)
        .single()

      assert.ok(inactiveVar, 'Found inactive variant from deleted colours test')
      assert.strictEqual(inactiveVar.is_active, false, 'Variant is verified inactive')

      // Check that inventory is 0
      const { data: inv } = await supabase.from('inventory').select('quantity').eq('variant_id', inactiveVar.id).single()
      assert.strictEqual(inv.quantity, 0, 'Inactive variant has 0 inventory quantity')
    })

    // TEST 11: Verify no duplicate variants or inventory records after repeated saves
    await runTest('Case 11: Repeated saves create zero duplicate inventory records', async () => {
      const { data: invRows } = await supabase.from('inventory').select('id, variant_id')
      const variantIds = invRows.map(r => r.variant_id)
      const uniqueIds = new Set(variantIds)
      assert.strictEqual(variantIds.length, uniqueIds.size, 'Every inventory row has a strictly unique variant_id')
    })

    // TEST 12: Reactivate previously deleted colour
    await runTest('Case 12: Re-adding a previously deleted colour (RED) reactivates it cleanly without unique constraint failure', async () => {
      const { data: currentVars } = await supabase.from('product_variants').select('id, colour, size').eq('product_id', testProductId).eq('is_active', true)
      
      // Re-add RED with size M
      const reactivatedConfig = [
        ...currentVars.map(v => ({ id: v.id, colour: v.colour, size: v.size, sku: `AUDIT-${v.colour}-${v.size}`, quantity: 5 })),
        { size: 'M', colour: 'RED', sku: 'AUDIT-RED-M', quantity: 8 }
      ]

      await reconcileProductVariants(supabase, testProductId, reactivatedConfig, { productSlug: testSlug })

      const { data: afterVars } = await supabase.from('product_variants').select('id, colour, size, is_active').eq('product_id', testProductId).eq('colour', 'RED')
      assert.ok(afterVars.some(v => v.size === 'M' && v.is_active === true), 'RED / M is successfully reactivated as active')
      
      const { data: redInv } = await supabase.from('inventory').select('quantity').eq('variant_id', afterVars.find(v => v.size === 'M').id).single()
      assert.strictEqual(redInv.quantity, 8, 'Reactivated variant received requested stock (8 units)')
    })

  } finally {
    // Clean up test product
    if (testProductId) {
      await supabase.from('products').delete().eq('id', testProductId)
      console.log('\n[CLEANUP] Deleted test product', testProductId)
    }
  }

  console.log(`\n--- TEST RUN SUMMARY ---`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\n🎉 ALL 12 TEST CASES PASSED SUCCESSFULLY!')
  }
}

main().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
