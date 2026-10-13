/**
 * Comprehensive verification for:
 * Critical Fix: Active Category Fetching Errors on Homepage and Other Pages
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import assert from 'assert'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('Missing Supabase configuration in .env.local')
  process.exit(1)
}

const anonClient = createClient(supabaseUrl, anonKey)
const adminClient = createClient(supabaseUrl, serviceKey)

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(err)
    failed++
  }
}

async function run() {
  console.log('=== SENO Active Categories Fetching Verification ===\n')

  // 1. Root Cause Proof & Schema Health
  await test('Confirm error handling: selecting non-existent column triggers code 42703 with formatted error', async () => {
    const { data, error } = await anonClient
      .from('categories')
      .select('id, name, non_existent_column_for_test')
      .limit(1)

    assert(error, 'Expected error when selecting non-existent column')
    assert.strictEqual(error.code, '42703', `Expected error code 42703, got ${error.code}`)
    assert(
      error.message.includes('column categories.non_existent_column_for_test does not exist'),
      `Unexpected error message: ${error.message}`
    )
    console.log('Confirmed error behavior on non-existent column:', { code: error.code, message: error.message })
  })

  // 2. Verified query with supported columns succeeds and returns all 6 active categories
  await test('Public query with supported columns returns exactly 6 active categories in display order', async () => {
    const { data, error } = await anonClient
      .from('categories')
      .select('id, name, slug, description, image_url, display_order, is_active, created_at, updated_at')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })

    assert(!error, `Query failed: ${error?.message}`)
    assert(Array.isArray(data), 'Expected array of categories')
    assert.strictEqual(data.length, 6, `Expected 6 active categories, got ${data.length}`)

    const expectedOrder = [
      'ethnic-traditional-wear',
      'western',
      'topwear',
      'bottomwear',
      'cosmetics',
      'accessories'
    ]

    for (let i = 0; i < expectedOrder.length; i++) {
      assert.strictEqual(
        data[i].slug,
        expectedOrder[i],
        `At index ${i}: expected slug ${expectedOrder[i]}, got ${data[i].slug}`
      )
      assert.strictEqual(data[i].is_active, true, `Category ${data[i].name} should be active`)
      assert.strictEqual(data[i].display_order, i + 1, `Category ${data[i].name} should have display_order ${i + 1}`)
    }

    console.log('Active categories verified in order:', data.map(c => `${c.display_order}. ${c.name} (${c.slug})`).join(', '))
  })

  // 3. Inactive categories exclusion
  await test('Inactive categories are properly excluded from public queries', async () => {
    const { data: allCats } = await adminClient
      .from('categories')
      .select('id, name, slug, is_active')

    const inactiveCats = (allCats || []).filter(c => !c.is_active)
    console.log('Inactive categories in database:', inactiveCats.map(c => c.name).join(', ') || 'None')

    const { data: activeCats } = await anonClient
      .from('categories')
      .select('id, slug, is_active')
      .eq('is_active', true)

    for (const inactive of inactiveCats) {
      const found = activeCats.find(c => c.id === inactive.id)
      assert(!found, `Inactive category "${inactive.name}" must not be returned in public query`)
    }
  })

  // 4. Accessories category content & banner verification
  await test('Accessories category has valid banner URL and description', async () => {
    const { data, error } = await anonClient
      .from('categories')
      .select('id, name, slug, description, image_url, display_order, is_active')
      .eq('slug', 'accessories')
      .single()

    assert(!error, `Failed to query accessories: ${error?.message}`)
    assert.strictEqual(data.name, 'Accessories')
    assert(data.image_url && data.image_url.includes('accessories-banner.jpg'), 'Accessories image_url must point to accessories-banner.jpg')
    assert(data.description && data.description.includes('gold-plated jewellery'), 'Accessories description must mention gold-plated jewellery')
  })

  // 5. Admin categories query with product counts
  await test('Admin categories query returns categories with product count join', async () => {
    const { data, error } = await adminClient
      .from('categories')
      .select('id, name, slug, description, image_url, display_order, is_active, created_at, updated_at, products(count)')
      .order('display_order', { ascending: true })

    assert(!error, `Admin query failed: ${error?.message}`)
    assert(data.length >= 6, `Expected at least 6 categories, got ${data.length}`)
    
    const accessories = data.find(c => c.slug === 'accessories')
    assert(accessories, 'Accessories not found in admin categories')
    const productCount = accessories.products?.[0]?.count ?? 0
    console.log(`Accessories category has ${productCount} assigned products.`)
    assert(productCount > 0, 'Accessories should have assigned products')
  })

  // 6. HTTP Storefront verification (Dev server)
  await test('Homepage renders HTTP 200 and displays all 6 categories in HTML without error overlays', async () => {
    const res = await fetch('http://localhost:3000/')
    assert.strictEqual(res.status, 200, `Homepage returned HTTP ${res.status}`)
    const html = await res.text()

    assert(!html.includes('Error fetching active categories'), 'Homepage must NOT include category fetching error')
    assert(html.includes('accessories'), 'Homepage HTML must include accessories collection link')
    assert(html.includes('ETHNIC &amp; TRADITIONAL WEAR') || html.includes('Ethnic &amp; Traditional Wear'), 'Homepage must render Ethnic & Traditional Wear')
    assert(html.includes('WESTERN') || html.includes('Western'), 'Homepage must render Western')
    assert(html.includes('TOPWEAR') || html.includes('Topwear'), 'Homepage must render Topwear')
    assert(html.includes('BOTTOMWEAR') || html.includes('Bottomwear'), 'Homepage must render Bottomwear')
    assert(html.includes('COSMETICS') || html.includes('Cosmetics'), 'Homepage must render Cosmetics')
    assert(html.includes('ACCESSORIES') || html.includes('Accessories'), 'Homepage must render Accessories')
  })

  // 7. HTTP Category Listing & Accessories Collection Route verification
  await test('Categories listing and Accessories collection page load HTTP 200 with banner', async () => {
    const catRes = await fetch('http://localhost:3000/categories')
    assert.strictEqual(catRes.status, 200, `/categories returned HTTP ${catRes.status}`)
    const catHtml = await catRes.text()
    assert(catHtml.includes('accessories'), '/categories must include accessories')

    const accRes = await fetch('http://localhost:3000/collections/accessories')
    assert.strictEqual(accRes.status, 200, `/collections/accessories returned HTTP ${accRes.status}`)
    const accHtml = await accRes.text()
    assert(accHtml.includes('accessories-banner.jpg'), 'Accessories collection page must include accessories banner image')
  })

  console.log(`\n========================================`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

run()
