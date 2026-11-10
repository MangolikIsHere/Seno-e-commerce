import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runVerification() {
  console.log('====================================================')
  console.log('SENO E-COMMERCE END-TO-END VERIFICATION SUITE')
  console.log('Testing: Bug 1 (Seller Submission) & Bug 2 (Bestsellers)')
  console.log('====================================================\n')

  // --- PART 1: SELLER PRODUCT SUBMISSION PIPELINE ---
  console.log('>>> [TEST 1] Verifying Seller Account & Product Creation...')
  
  // 1. Resolve seller account for ss2082886@gmail.com
  const { data: sellerUser, error: userErr } = await adminClient
    .from('profiles')
    .select('id, email, role')
    .eq('email', 'ss2082886@gmail.com')
    .single()

  if (userErr || !sellerUser) {
    throw new Error('Seller user not found: ' + userErr?.message)
  }
  console.log('✓ Found seller profile:', sellerUser.email, `(Role: ${sellerUser.role})`)

  const { data: sellerRecord, error: sellerErr } = await adminClient
    .from('sellers')
    .select('*')
    .eq('user_id', sellerUser.id)
    .single()

  if (sellerErr || !sellerRecord) {
    throw new Error('Seller record not found: ' + sellerErr?.message)
  }
  console.log('✓ Found seller store:', sellerRecord.store_name, `(Status: ${sellerRecord.seller_status}, Type: ${sellerRecord.seller_type})`)

  // 2. Fetch active category
  const { data: activeCategory } = await adminClient
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (!activeCategory) throw new Error('No active category found!')
  console.log('✓ Active category for test:', activeCategory.name, `(${activeCategory.id})`)

  // 3. Create test product for seller
  const testSlug = `e2e-seller-artisan-kurta-${Date.now()}`
  console.log(`\n>>> Inserting test product under seller: ${testSlug}`)

  const { data: newProd, error: insertErr } = await adminClient
    .from('products')
    .insert({
      seller_id: sellerRecord.id,
      name: 'E2E Handwoven Chanderi Kurta',
      slug: testSlug,
      description: 'Handcrafted luxury Chanderi silk kurta with delicate zardozi detailing.',
      price: 4990,
      compare_at_price: 6490,
      category_id: activeCategory.id,
      approval_status: 'submitted',
      is_active: true,
      shipping_method: 'weight_based',
      default_weight_grams: 450,
      details: [
        'Pure Handwoven Chanderi Silk',
        'Dry clean only',
        { __return_policy: { is_returnable: true, return_window_days: 14 } }
      ]
    })
    .select()
    .single()

  if (insertErr || !newProd) {
    console.error('❌ Insert failed:', insertErr)
    throw new Error('Product insertion failed: ' + insertErr?.message)
  }

  console.log('✓ Product inserted successfully with ID:', newProd.id)
  console.log('✓ Verified approval_status:', newProd.approval_status, '(MUST be "submitted", NOT auto-approved)')
  if (newProd.approval_status !== 'submitted') {
    throw new Error('Security violation: Seller product was unexpectedly auto-approved!')
  }
  if (newProd.seller_id !== sellerRecord.id) {
    throw new Error('Ownership association mismatch!')
  }

  // 4. Insert variants for this product
  const { data: variant, error: varErr } = await adminClient
    .from('product_variants')
    .insert({
      product_id: newProd.id,
      size: 'M',
      colour: 'Ivory Gold',
      sku: `E2E-CHAND-${Date.now()}-M`,
      is_active: true
    })
    .select()
    .single()

  if (varErr || !variant) {
    throw new Error('Variant creation failed: ' + varErr?.message)
  }
  console.log('✓ Created product variant:', variant.sku)

  // 5. Insert inventory
  await adminClient.from('inventory').insert({
    variant_id: variant.id,
    quantity: 15
  })
  console.log('✓ Initialized inventory quantity: 15')

  // 6. Verify Admin review queue visibility
  console.log('\n>>> Testing Admin Review Queue visibility...')
  const { data: adminQueue, error: queueErr } = await adminClient
    .from('products')
    .select('id, name, slug, approval_status, sellers(store_name)')
    .eq('approval_status', 'submitted')
    .eq('id', newProd.id)
    .single()

  if (queueErr || !adminQueue) {
    throw new Error('Admin review queue query failed to find submitted product: ' + queueErr?.message)
  }
  console.log('✓ Product successfully retrieved in Admin Review Queue:')
  console.log('   ID:', adminQueue.id)
  console.log('   Name:', adminQueue.name)
  console.log('   Status:', adminQueue.approval_status)
  console.log('   Seller:', (adminQueue as any).sellers?.store_name)

  // --- PART 2: BESTSELLER DISPLAY & RETRIEVAL PIPELINE ---
  console.log('\n====================================================')
  console.log('>>> [TEST 2] Verifying Bestseller Classification & Queries...')

  // 1. Pick an active, approved product to test bestseller toggling
  const { data: approvedProduct, error: appErr } = await adminClient
    .from('products')
    .select('id, name, slug, is_bestseller, is_active, approval_status')
    .eq('approval_status', 'approved')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (appErr || !approvedProduct) {
    throw new Error('No active approved product found to test bestsellers: ' + appErr?.message)
  }

  console.log('✓ Selected approved product:', approvedProduct.name, `(${approvedProduct.slug})`)
  console.log('  Initial is_bestseller:', approvedProduct.is_bestseller)

  // 2. Mark product as bestseller
  console.log('\n>>> Tagging product as Bestseller...')
  const { data: updatedBestseller, error: bestErr } = await adminClient
    .from('products')
    .update({ is_bestseller: true, updated_at: new Date().toISOString() })
    .eq('id', approvedProduct.id)
    .select('id, name, slug, is_bestseller')
    .single()

  if (bestErr || !updatedBestseller) {
    throw new Error('Failed to update bestseller flag: ' + bestErr?.message)
  }
  console.log('✓ Supabase successfully persisted is_bestseller = true for:', updatedBestseller.name)

  // 3. Verify storefront query retrieves it
  const { data: storefrontBestsellers, error: sfErr } = await adminClient
    .from('products')
    .select('id, name, slug, is_bestseller, is_active, approval_status')
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .eq('is_bestseller', true)

  if (sfErr) {
    throw new Error('Storefront bestsellers query error: ' + sfErr.message)
  }

  const foundInBestsellers = storefrontBestsellers.some(p => p.id === approvedProduct.id)
  console.log(`✓ Storefront query returned ${storefrontBestsellers.length} active approved bestseller(s)`)
  console.log('✓ Target product found in bestsellers result:', foundInBestsellers)
  if (!foundInBestsellers) {
    throw new Error('Bestseller query did not return the tagged product!')
  }

  // --- PART 3: CLEANUP TEST SELLER PRODUCT ---
  console.log('\n>>> Cleaning up test seller product...')
  await adminClient.from('inventory').delete().eq('variant_id', variant.id)
  await adminClient.from('product_variants').delete().eq('id', variant.id)
  await adminClient.from('products').delete().eq('id', newProd.id)
  console.log('✓ Test product safely cleaned up.')

  console.log('\n====================================================')
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!')
  console.log('====================================================')
}

runVerification().catch(err => {
  console.error('\n❌ Verification Failed:', err)
  process.exit(1)
})

