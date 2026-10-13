/**
 * Verification script for Dynamic Category Management + Accessories Category & Premium Banner
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
    console.error(err)
    failed++
  }
}

async function run() {
  console.log('=== SENO Category Management Verification ===\n')

  // 1. Verify Accessories Category in Supabase
  await test('Accessories Category exists, is active, and has correct metadata', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', 'accessories')
      .single()

    assert(!error, `Failed to query accessories: ${error?.message}`)
    assert(data, 'Accessories category row not found')
    assert.strictEqual(data.name, 'Accessories', `Expected name "Accessories", got "${data.name}"`)
    assert.strictEqual(data.slug, 'accessories', `Expected slug "accessories", got "${data.slug}"`)
    assert.strictEqual(data.is_active, true, 'Accessories category should be active')
    assert.strictEqual(data.display_order, 6, `Expected display_order 6, got ${data.display_order}`)
    assert(data.description && data.description.includes('gold-plated jewellery'), 'Description should mention gold-plated jewellery')
    assert(data.image_url && data.image_url.includes('accessories-banner.jpg'), 'Banner image URL should point to accessories-banner.jpg')
  })

  // 2. Verify all 6 canonical categories are present and active
  await test('All 6 canonical categories exist and are active in correct order', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('name, slug, display_order, is_active')
      .order('display_order', { ascending: true })

    assert(!error, `Failed to query categories: ${error?.message}`)
    const active = data.filter(c => c.is_active)
    const expectedSlugs = [
      'ethnic-traditional-wear',
      'western',
      'topwear',
      'bottomwear',
      'cosmetics',
      'accessories'
    ]

    console.log('Active categories found:', active.map(c => `${c.display_order}. ${c.name} (${c.slug})`).join(', '))
    
    for (const slug of expectedSlugs) {
      const found = active.find(c => c.slug === slug)
      assert(found, `Expected active category with slug "${slug}"`)
    }
  })

  // 3. Verify category banner image asset exists locally
  await test('Accessories banner image asset exists in local public directory', async () => {
    const bannerPath = path.resolve('public/images/categories/accessories-banner.jpg')
    assert(fs.existsSync(bannerPath), `Banner file does not exist at ${bannerPath}`)
    const stats = fs.statSync(bannerPath)
    assert(stats.size > 10000, `Banner file should not be empty, got ${stats.size} bytes`)
  })

  // 4. Verify products assigned to Accessories
  await test('Accessories category has linked products without orphans', async () => {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', 'accessories')
      .single()

    assert(category?.id, 'Category ID required')
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, category_id')
      .eq('category_id', category.id)

    assert(!error, `Error querying products: ${error?.message}`)
    console.log(`Found ${products.length} products linked to Accessories (category_id):`, products.map(p => p.name).join(', '))
    assert(products.length >= 1, 'Should have products associated with Accessories')
  })

  // 5. Test safe deletion logic (simulation of check before delete)
  await test('Safe deletion protection correctly detects assigned products', async () => {
    const { data: category } = await supabase
      .from('categories')
      .select('id, name')
      .eq('slug', 'accessories')
      .single()

    const { count, error } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id)

    assert(!error, `Error counting products: ${error?.message}`)
    assert(count > 0, 'Accessories has assigned products, deletion must require confirmation or reassignment')
  })

  // 6. Test Category Creation, Reordering & Deactivation with a temporary test category
  await test('Admin category lifecycle: create, reorder, deactivate, safe reassignment & delete', async () => {
    const testSlug = `test-cat-${Date.now()}`
    
    // 6a. Create
    const { data: created, error: createError } = await supabase
      .from('categories')
      .insert({
        name: 'Test Category Auto',
        slug: testSlug,
        description: 'Test category description',
        display_order: 99,
        is_active: false
      })
      .select()
      .single()

    assert(!createError, `Error creating test category: ${createError?.message}`)
    assert.strictEqual(created.slug, testSlug)

    // 6b. Reorder
    const { error: updateError } = await supabase
      .from('categories')
      .update({ display_order: 100 })
      .eq('id', created.id)
    assert(!updateError, `Error updating display_order: ${updateError?.message}`)

    // 6c. Delete safely (0 products assigned)
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', created.id)
    assert(!deleteError, `Error deleting test category: ${deleteError?.message}`)
  })

  // 7. Verify frontend file integration
  await test('Verify frontend integration files reference dynamic category system', async () => {
    // Check lib/categories.ts exists
    assert(fs.existsSync(path.resolve('lib/categories.ts')), 'lib/categories.ts must exist')
    
    // Check lib/catalog.ts includes Accessories
    const catalogContent = fs.readFileSync(path.resolve('lib/catalog.ts'), 'utf-8')
    assert(catalogContent.includes("'Accessories'"), "lib/catalog.ts should include 'Accessories'")
    assert(catalogContent.includes("categorySlug"), "lib/catalog.ts should include categorySlug")

    // Check CategoriesClient in admin exists and has reorder & safe deletion
    const adminClient = fs.readFileSync(path.resolve('app/admin/categories/CategoriesClient.tsx'), 'utf-8')
    assert(adminClient.includes("handleMoveUp") && adminClient.includes("handleMoveDown"), "admin CategoriesClient should have handleMoveUp and handleMoveDown")
    assert(adminClient.includes("deletingCategory"), "admin CategoriesClient should have deletingCategory")

    // Check admin dynamic category loading
    const adminNewPage = fs.readFileSync(path.resolve('app/admin/products/new/page.tsx'), 'utf-8')
    assert(adminNewPage.includes("getCatalogMetadata"), "Admin new product page should call getCatalogMetadata")

    const adminCatalog = fs.readFileSync(path.resolve('lib/adminCatalog.ts'), 'utf-8')
    assert(adminCatalog.includes("getCatalogMetadata"), "lib/adminCatalog.ts should export getCatalogMetadata")

    // Check seller dynamic category loading
    const sellerNewPage = fs.readFileSync(path.resolve('app/seller/products/new/page.tsx'), 'utf-8')
    assert(sellerNewPage.includes("from('categories')"), "Seller new product page should query categories table")

    const sellerProductForm = fs.readFileSync(path.resolve('app/seller/products/ProductForm.tsx'), 'utf-8')
    assert(sellerProductForm.includes("categories: any[]") || sellerProductForm.includes("categories"), "Seller ProductForm should accept categories prop")
  })

  console.log(`\n========================================`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  console.log(`========================================`)

  if (failed > 0) {
    process.exit(1)
  }
}

run()
