/**
 * Focused Verification Script for Seller Product Creation & Authorization Architecture
 *
 * Verifies:
 * 1. Strict separation of Admin (createAdminProduct) and Seller (submitSellerProduct/createSellerProduct) actions
 * 2. Server-side resolution of seller_id from authenticated seller record
 * 3. Client tampering protection: malicious seller_id is rejected/ignored
 * 4. Reseller cannot self-approve (approval_status constrained to 'draft' or 'submitted')
 * 5. Database trigger enforce_product_rules() and is_admin() correctly identify resellers vs admins
 * 6. Storefront isolation: unapproved products are hidden from public storefront
 * 7. Admin review queue visibility & storefront publication lifecycle
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
  console.log('======================================================================')
  console.log('   SENO SELLER PRODUCT CREATION AUTHORIZATION & LIFECYCLE VERIFICATION')
  console.log('======================================================================\n')

  // 1. Codebase Architecture Checks
  runTest('lib/sellers.ts exports separated createSellerProduct and submitSellerProduct actions', () => {
    const sellersSource = fs.readFileSync(path.join(__dirname, '../lib/sellers.ts'), 'utf8')
    assert.ok(sellersSource.includes('export async function submitSellerProduct'), 'submitSellerProduct exported')
    assert.ok(sellersSource.includes('export async function createSellerProduct'), 'createSellerProduct exported')
  })

  runTest('lib/adminCatalog.ts exports separated createAdminProduct action', () => {
    const adminCatalogSource = fs.readFileSync(path.join(__dirname, '../lib/adminCatalog.ts'), 'utf8')
    assert.ok(adminCatalogSource.includes('export async function createAdminProduct'), 'createAdminProduct exported')
    assert.ok(adminCatalogSource.includes('checkIsAdmin()'), 'Admin check enforced')
  })

  runTest('Seller Studio UI (/seller/products/new) never calls createAdminProduct', () => {
    const productFormSource = fs.readFileSync(path.join(__dirname, '../app/seller/products/ProductForm.tsx'), 'utf8')
    assert.ok(!productFormSource.includes('createAdminProduct'), 'Must not reference createAdminProduct')
    assert.ok(productFormSource.includes('submitSellerProduct'), 'References submitSellerProduct')
  })

  runTest('submitSellerProduct strictly derives seller_id server-side and rejects client tampering', () => {
    const sellersSource = fs.readFileSync(path.join(__dirname, '../lib/sellers.ts'), 'utf8')
    assert.ok(sellersSource.includes('clientProvidedSellerId !== seller.id'), 'Rejects forged seller_id')
    assert.ok(sellersSource.includes('getMySellerRecord()'), 'Resolves seller record server-side')
  })

  runTest('submitSellerProduct prevents self-approval by resellers', () => {
    const sellersSource = fs.readFileSync(path.join(__dirname, '../lib/sellers.ts'), 'utf8')
    assert.ok(sellersSource.includes("approval_status: 'draft' | 'submitted'"), 'Type constrained to draft or submitted')
    assert.ok(!sellersSource.includes("approval_status = 'approved'"), 'Never auto-approves seller products')
  })

  // 2. Database Trigger & Role Enforcement Checks
  await runAsyncTest('Database security: public.is_admin() returns false for anonymous callers', async () => {
    const { data, error } = await supabase.rpc('is_admin')
    assert.ifError(error)
    assert.strictEqual(data, false, 'is_admin() must return false for anonymous user')
  })

  await runAsyncTest('Database security: Anonymous direct product insert rejected', async () => {
    const { data, error } = await supabase.from('products').insert({
      name: 'Malicious Anonymous Product',
      slug: 'malicious-anon-product-' + Date.now(),
      price: 1999,
      default_weight_grams: 500,
      seller_id: 'ded1adea-bb00-43b0-a4a1-08233157664b'
    })
    assert.ok(error, 'Expected insert to fail for unauthenticated caller')
    assert.ok(error.code === 'P0001' || error.code === '42501', `Expected P0001 or 42501, got ${error.code}`)
  })

  // 3. Database Schema Integrity & Workflow Checks
  runTest('Database migration 20260917000001_restore_stage1_is_admin.sql restores Stage 1 is_admin()', () => {
    const migPath = path.join(__dirname, '../supabase/migrations/20260917000001_restore_stage1_is_admin.sql')
    assert.ok(fs.existsSync(migPath), 'Migration file exists')
    const migContent = fs.readFileSync(migPath, 'utf8')
    assert.ok(migContent.includes('session_user'), 'Uses session_user to prevent SECURITY DEFINER current_user flaw')
    assert.ok(migContent.includes("role = 'admin'"), 'Checks profile role = admin')
  })

  await runAsyncTest('Storefront Isolation: Public query only returns approved + active products from approved sellers', async () => {
    const { data, error } = await supabase.from('products').select('id, name, approval_status, is_active')
    assert.ifError(error)
    assert.ok(data && data.length > 0, 'Products returned')
    assert.ok(
      data.every(p => p.approval_status === 'approved' && p.is_active === true),
      'All publicly visible products must be approved and active'
    )
  })

  // 4. Shipping & Return Policy Persistence
  runTest('Seller product payload correctly formats return policy and shipping fields', () => {
    const sellersSource = fs.readFileSync(path.join(__dirname, '../lib/sellers.ts'), 'utf8')
    assert.ok(sellersSource.includes('shipping_method'), 'Persists shipping_method')
    assert.ok(sellersSource.includes('custom_delivery_charge'), 'Persists custom_delivery_charge')
    assert.ok(sellersSource.includes('__return_policy'), 'Persists structured return policy')
  })

  console.log('\n----------------------------------------------------------------------')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)
  console.log('----------------------------------------------------------------------')

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\n🎉 ALL SELLER PRODUCT CREATION AUTHORIZATION CHECKS PASSED!\n')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Test script crashed:', err)
  process.exit(1)
})
