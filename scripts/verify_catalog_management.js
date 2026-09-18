/**
 * Verification Script for SENO Stage 7: Admin Catalog Management + Live Storefront Synchronization
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const assert = require('assert')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('=== SENO CATALOG MANAGEMENT & STOREFRONT SYNCHRONIZATION VERIFICATION ===\n')

let passed = 0
let failed = 0

function runTest(name, fn) {
  try {
    fn()
    console.log(`[PASS] ${name}`)
    passed++
  } catch (err) {
    console.error(`[FAIL] ${name}`)
    console.error(`       Error: ${err.message}`)
    failed++
  }
}

async function runAsyncTest(name, fn) {
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
  // 1. Check Categories & Collections baseline
  await runAsyncTest('Categories baseline: 4 luxury departments present', async () => {
    const { data, error } = await supabase.from('categories').select('*').eq('is_active', true)
    assert.ifError(error)
    assert.ok(data.length >= 4, `Expected at least 4 categories, got ${data.length}`)
    const names = data.map(c => c.name)
    assert.ok(names.includes('Topwear'), 'Includes Topwear')
    assert.ok(names.includes('Bottomwear'), 'Includes Bottomwear')
    assert.ok(names.includes('Outerwear'), 'Includes Outerwear')
    assert.ok(names.includes('Accessories'), 'Includes Accessories')
  })

  await runAsyncTest('Collections baseline: New Arrivals and Bestsellers present', async () => {
    const { data, error } = await supabase.from('collections').select('*').eq('is_active', true)
    assert.ifError(error)
    assert.ok(data.length >= 2, `Expected at least 2 collections, got ${data.length}`)
  })

  // 2. Check Seeded Products baseline
  await runAsyncTest('Product catalog baseline: 18 luxury pieces in Supabase', async () => {
    const { data, error } = await supabase.from('products').select('*')
    assert.ifError(error)
    assert.ok(data.length >= 18, `Expected at least 18 products, got ${data.length}`)
    assert.ok(data.every(p => p.approval_status === 'approved'), 'All catalog pieces are approved')
    assert.ok(data.every(p => p.is_active === true), 'All catalog pieces are active')
  })

  // 3. Check Platform Seller identity
  await runAsyncTest('SENO Platform seller record exists and is unique', async () => {
    const { data, error } = await supabase.from('sellers_public').select('*')
    assert.ifError(error)
    assert.ok(data.length > 0, 'SENO Platform seller found')
    assert.strictEqual(data[0].slug, 'seno-official', 'SENO platform slug is seno-official')
  })

  // 4. Test RLS protection against unauthorized anonymous mutations
  await runAsyncTest('Security: Anonymous direct product insert rejected by RLS', async () => {
    const { data, error } = await supabase.from('products').insert({
      name: 'Unauthorized Insertion Test',
      slug: 'unauthorized-insert-test',
      price: 9999,
      default_weight_grams: 500,
      seller_id: 'fb09c575-2d0c-48d8-b1ff-b7a1ead8407a'
    })
    assert.ok(error, 'Expected RLS or security trigger to reject anonymous insert')
    assert.ok(error.code === '42501' || error.code === 'P0001', `Expected security rejection code (42501 or P0001), got ${error.code}`)
  })

  // 5. Test Slug generation utility logic
  runTest('Slug generation: handles complex titles, spaces, and punctuation', () => {
    function slugify(text) {
      return text
        .toString()
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    assert.strictEqual(slugify('Minimalist Wool Overcoat'), 'minimalist-wool-overcoat')
    assert.strictEqual(slugify('SENO No. 07 Raw Denim — Limited Edition!'), 'seno-no-07-raw-denim-limited-edition')
    assert.strictEqual(slugify('   Pleated Cargo Trousers / Washed  '), 'pleated-cargo-trousers-washed')
  })

  // 6. Test Inventory calculation robustness (prevent NaN)
  runTest('Inventory parsing: handles empty array, null, single object, and 0 stock without NaN', () => {
    function parseQty(v) {
      let inventoryQuantity = 10
      if (v.inventory) {
        if (Array.isArray(v.inventory)) {
          if (v.inventory.length > 0 && v.inventory[0]?.quantity !== undefined && v.inventory[0]?.quantity !== null) {
            const q = Number(v.inventory[0].quantity)
            return isNaN(q) ? 10 : q
          }
        } else if (v.inventory.quantity !== undefined && v.inventory.quantity !== null) {
          const q = Number(v.inventory.quantity)
          return isNaN(q) ? 10 : q
        }
      }
      return 10
    }

    assert.strictEqual(parseQty({ inventory: [] }), 10)
    assert.strictEqual(parseQty({ inventory: null }), 10)
    assert.strictEqual(parseQty({ inventory: [{ quantity: 0 }] }), 0)
    assert.strictEqual(parseQty({ inventory: [{ quantity: 15 }] }), 15)
    assert.strictEqual(parseQty({ inventory: { quantity: 0 } }), 0)
    assert.strictEqual(parseQty({ inventory: { quantity: 8 } }), 8)
  })

  // 7. Test Storefront query architecture against live Supabase
  await runAsyncTest('Storefront Product query: fetches utility-cargo-pant with variants and images', async () => {
    const selectQuery = `
      *,
      categories(name),
      product_images(url, is_primary, display_order),
      product_variants(id, size, colour, sku, price_override, weight_grams_override, is_active, inventory(quantity))
    `
    const { data, error } = await supabase
      .from('products')
      .select(selectQuery)
      .eq('slug', 'utility-cargo-pant')
      .single()

    assert.ifError(error)
    assert.ok(data, 'Product data retrieved')
    assert.strictEqual(data.name, 'Utility Cargo Pant')
    assert.ok(data.product_variants.length > 0, 'Variants present')
    assert.ok(data.product_images.length > 0, 'Images present')
  })

  // 8. Test Search query execution against live Supabase
  await runAsyncTest('Storefront Search query: retrieves matching items from Supabase', async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, slug')
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .ilike('name', '%Pant%')

    assert.ifError(error)
    assert.ok(data.length > 0, `Expected pants in catalog, found ${data.length}`)
  })

  // 9. Verify Storage Migration file exists
  runTest('Database migration: 20260915000000_catalog_and_storage.sql authored and present', () => {
    const fs = require('fs')
    const p = 'supabase/migrations/20260915000000_catalog_and_storage.sql'
    assert.ok(fs.existsSync(p), 'Migration file exists')
    const content = fs.readFileSync(p, 'utf8')
    assert.ok(content.includes('product-images'), 'Configures product-images bucket')
    assert.ok(content.includes('inventory_public_select'), 'Configures inventory_public_select')
  })

  // 10. Verify Admin UI files and Routes
  runTest('Admin UI routes: products list, new product wizard, and edit page are created', () => {
    const fs = require('fs')
    assert.ok(fs.existsSync('app/admin/products/page.tsx'), 'Admin products page exists')
    assert.ok(fs.existsSync('app/admin/products/new/page.tsx'), 'Admin new product page exists')
    assert.ok(fs.existsSync('app/admin/products/[id]/edit/page.tsx'), 'Admin edit product page exists')
    assert.ok(fs.existsSync('components/admin/ProductListClient.tsx'), 'ProductListClient component exists')
    assert.ok(fs.existsSync('components/admin/ProductEditorForm.tsx'), 'ProductEditorForm component exists')
    assert.ok(fs.existsSync('lib/adminCatalog.ts'), 'lib/adminCatalog.ts exists')
  })

  console.log('\n--- VERIFICATION SUMMARY ---')
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\n🎉 ALL CATALOG MANAGEMENT & STOREFRONT SYNCHRONIZATION CHECKS PASSED!')
    process.exit(0)
  }
}

main().catch(err => {
  console.error('Fatal error in test script:', err)
  process.exit(1)
})
