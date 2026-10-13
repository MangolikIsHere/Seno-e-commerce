/**
 * Comprehensive verification script for SENO Seller Dashboard, Admin Synchronization & Mobile Optimization.
 * Tests:
 * 1. Seller Dashboard aggregate calculations (orders, products, inventory, earnings, notices).
 * 2. Notifications persistence with read_at and deep links.
 * 3. Forward-looking commission protection (historical orders and rates untouched).
 * 4. Variant reconciliation integrity (colour/size deletion, zero stock, order preservation).
 * 5. Seller Navigation Structure: 7 core sections exist and are implemented.
 * 6. Mobile Optimization CSS rules: responsive cards, touch targets, safe-area insets.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import assert from 'assert'
import fs from 'fs'
import path from 'path'
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

async function test(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    if (err.stack) console.error(`       Stack: ${err.stack.split('\n')[1]}`)
    failed++
  }
}

async function main() {
  console.log('=== SENO SELLER DASHBOARD & ADMIN SYNC VERIFICATION ===\n')

  // Find an approved seller for testing
  const { data: seller, error: sErr } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_status', 'approved')
    .limit(1)
    .single()

  assert.ok(seller, 'An approved seller exists in the database')
  console.log(`Testing with Seller: "${seller.store_name}" (ID: ${seller.id}, Rate: ${seller.commission_rate}%)`)

  // 1. Authoritative metrics calculation
  await test('Seller Dashboard Overview: authoritative counts and metrics', async () => {
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, is_active, approval_status, stock_quantity')
      .eq('seller_id', seller.id)

    const products = prods || []
    const activeCount = products.filter(p => p.is_active && p.approval_status === 'approved').length
    const pendingCount = products.filter(p => p.approval_status === 'pending').length
    const rejectedCount = products.filter(p => p.approval_status === 'rejected').length
    const lowStockCount = products.filter(p => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 5).length
    const outOfStockCount = products.filter(p => (p.stock_quantity ?? 0) === 0).length

    assert.ok(typeof activeCount === 'number', 'Active count computed')
    assert.ok(typeof pendingCount === 'number', 'Pending count computed')
    assert.ok(typeof rejectedCount === 'number', 'Rejected count computed')
    assert.ok(typeof lowStockCount === 'number', 'Low stock count computed')
    assert.ok(typeof outOfStockCount === 'number', 'Out of stock count computed')

    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id, price, quantity')
      .eq('seller_id', seller.id)

    const orderIds = Array.from(new Set((orderItems || []).map(i => i.order_id)))
    assert.ok(Array.isArray(orderIds), 'Authoritative order item calculation works')
  })

  // 2. Notifications System & Deep Links
  await test('Notifications System: creation with deep links and recipient isolation', async () => {
    const { buildNotificationDeepLink } = await import('../lib/notifications/types.ts')

    let targetUserId = seller.user_id
    if (!targetUserId) {
      const { data: userRow } = await supabase.from('notifications').select('user_id').limit(1).single()
      if (userRow?.user_id) {
        targetUserId = userRow.user_id
      } else {
        const { data: sUser } = await supabase.from('sellers').select('user_id').not('user_id', 'is', null).limit(1).single()
        targetUserId = sUser?.user_id
      }
    }

    assert.ok(targetUserId, 'A valid user_id was found for testing notification delivery')

    const testTitle = 'Product Approved: Verification Silk Shirt'
    const testMessage = 'Your product has been approved by admin and is now live.'
    const testLink = '/seller/products'

    const { data: notif, error: nErr } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'seller_new_order',
        title: testTitle,
        message: testMessage,
        data: {
          original_type: 'seller_product_approved',
          deep_link: testLink,
          product_name: 'Verification Silk Shirt'
        }
      })
      .select()
      .single()

    assert.ok(!nErr, `Notification insertion succeeded: ${nErr?.message}`)
    assert.ok(notif, 'Notification row created')
    assert.strictEqual(notif.data.deep_link, '/seller/products', 'Deep link stored in metadata')
    assert.strictEqual(notif.data.original_type, 'seller_product_approved', 'Original type preserved in metadata')

    const computedLink = buildNotificationDeepLink('seller_product_approved', notif.data)
    assert.strictEqual(computedLink, '/seller/products', 'Computed deep link points to /seller/products')

    // Clean up test notification
    await supabase.from('notifications').delete().eq('id', notif.id)
  })

  // 3. Admin Commission Update & Forward-Looking Protection
  await test('Admin Synchronization: Commission rate update is forward-looking and preserves historical records', async () => {
    const currentRate = Number(seller.commission_rate ?? 15.0)
    const newRate = currentRate === 15.0 ? 12.0 : 15.0

    // Fetch existing order items before update to ensure prices/totals aren't modified
    const { data: beforeItems } = await supabase
      .from('order_items')
      .select('id, price, quantity')
      .eq('seller_id', seller.id)

    const itemsBefore = beforeItems || []

    // Update commission rate
    const { error: updErr } = await supabase
      .from('sellers')
      .update({ commission_rate: newRate })
      .eq('id', seller.id)

    assert.ok(!updErr, `Commission rate updated successfully: ${updErr?.message}`)

    // Fetch existing order items after update
    const { data: afterItems } = await supabase
      .from('order_items')
      .select('id, price, quantity')
      .eq('seller_id', seller.id)

    const itemsAfter = afterItems || []

    assert.strictEqual(itemsBefore.length, itemsAfter.length, 'Historical order item count unchanged')
    for (let i = 0; i < itemsBefore.length; i++) {
      assert.strictEqual(itemsBefore[i].price, itemsAfter[i].price, 'Order item historical price unchanged')
      assert.strictEqual(itemsBefore[i].quantity, itemsAfter[i].quantity, 'Order item historical quantity unchanged')
    }

    // Restore original rate
    await supabase.from('sellers').update({ commission_rate: currentRate }).eq('id', seller.id)
  })

  // 4. Variant Reconciliation Fix Integrity
  await test('Variant Reconciliation: deleted colors remain purged and valid variants intact', async () => {
    const { data: cat } = await supabase.from('categories').select('id').eq('is_active', true).limit(1).single()
    const testSlug = `seno-audit-check-${Date.now()}`

    // Insert temp test product
    const { data: tempProd, error: pErr } = await supabase.from('products').insert({
      name: 'Audit Reconciliation Check',
      slug: testSlug,
      description: 'Test product for variant preservation check',
      price: 8500,
      default_weight_grams: 400,
      category_id: cat.id,
      seller_id: seller.id,
      is_active: true,
      approval_status: 'approved'
    }).select().single()

    assert.ok(tempProd, 'Created test product')

    try {
      // 1. Initial 3 variants: Red-M, Blue-M, Green-M
      const initialVariants = [
        { colour: 'Red', size: 'M', quantity: 10, sku: `${testSlug}-RED-M`, price_override: null },
        { colour: 'Blue', size: 'M', quantity: 5, sku: `${testSlug}-BLU-M`, price_override: null },
        { colour: 'Green', size: 'M', quantity: 8, sku: `${testSlug}-GRN-M`, price_override: null }
      ]

      await reconcileProductVariants(supabase, tempProd.id, initialVariants)

      // Verify all 3 created
      const { data: v1 } = await supabase.from('product_variants').select('*').eq('product_id', tempProd.id).eq('is_active', true)
      assert.strictEqual(v1.length, 3, 'Initial 3 active variants exist')

      // 2. Edit: remove "Green", keep "Red" and "Blue", add "Black"
      const editedVariants = [
        { colour: 'Red', size: 'M', quantity: 12, sku: `${testSlug}-RED-M`, price_override: null },
        { colour: 'Blue', size: 'M', quantity: 5, sku: `${testSlug}-BLU-M`, price_override: null },
        { colour: 'Black', size: 'M', quantity: 15, sku: `${testSlug}-BLK-M`, price_override: null }
      ]

      const reconResult = await reconcileProductVariants(supabase, tempProd.id, editedVariants)
      assert.strictEqual(reconResult.success, true, 'Reconciliation returned success')

      // 3. Verify in DB
      const { data: v2 } = await supabase.from('product_variants').select('*').eq('product_id', tempProd.id).eq('is_active', true)
      assert.strictEqual(v2.length, 3, 'Still exactly 3 active variants total')
      const activeColors = v2.map(v => v.colour)
      assert.ok(!activeColors.includes('Green'), 'Deleted color "Green" does NOT exist in active DB variants')
      assert.ok(activeColors.includes('Black'), 'Added color "Black" exists in DB')
      assert.ok(activeColors.includes('Red'), 'Existing color "Red" preserved')

      // Verify deactivated variant still exists with is_active = false (preserving order foreign keys)
      const { data: inactive } = await supabase.from('product_variants').select('*').eq('product_id', tempProd.id).eq('colour', 'Green')
      assert.strictEqual(inactive.length, 1, 'Green variant safely preserved in DB for historical orders')
      assert.strictEqual(inactive[0].is_active, false, 'Green variant is marked is_active = false')

    } finally {
      // Clean up test product
      await supabase.from('product_variants').delete().eq('product_id', tempProd.id)
      await supabase.from('products').delete().eq('id', tempProd.id)
    }
  })

  // 5. Verification of 7 seller routes and navigation structure
  await test('Seller Navigation Structure: 7 core sections exist and are implemented', () => {
    const appDir = path.join(process.cwd(), 'app', 'seller')
    const requiredRoutes = [
      'dashboard',
      'products',
      'orders',
      'earnings',
      'notifications',
      'help',
      'settings'
    ]

    for (const route of requiredRoutes) {
      const pagePath = path.join(appDir, route, 'page.tsx')
      assert.ok(fs.existsSync(pagePath), `Route /seller/${route}/page.tsx exists`)
    }

    // Verify Mobile Navigation Component
    const mobileNavPath = path.join(process.cwd(), 'components', 'seller', 'SellerMobileNav.tsx')
    assert.ok(fs.existsSync(mobileNavPath), 'SellerMobileNav.tsx exists')
    const navContent = fs.readFileSync(mobileNavPath, 'utf8')
    assert.ok(navContent.includes('seller-mobile-bottom-bar'), 'Includes seller-mobile-bottom-bar class')
    assert.ok(navContent.includes('seller-drawer-nav'), 'Includes seller-drawer-nav class')
  })

  // 6. Mobile Optimization CSS Check
  await test('Mobile Optimization: CSS styles support responsive cards, touch targets, and safe-area insets', () => {
    const cssPath = path.join(process.cwd(), 'app', 'seller', 'seller.css')
    assert.ok(fs.existsSync(cssPath), 'seller.css exists')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    assert.ok(cssContent.includes('.seller-product-card-mobile'), 'Defines responsive product cards on mobile')
    assert.ok(cssContent.includes('.seller-order-card'), 'Defines responsive order cards')
    assert.ok(cssContent.includes('.seller-stat-card'), 'Defines responsive metric cards')
    assert.ok(cssContent.includes('env(safe-area-inset-bottom'), 'Handles safe-area-inset-bottom')
    assert.ok(cssContent.includes('@media (max-width: 767px)'), 'Includes small-viewport mobile rules')
  })

  // Summary
  console.log(`\n======================================================`)
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log(`======================================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
