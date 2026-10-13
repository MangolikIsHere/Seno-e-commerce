import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import assert from 'assert'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, serviceKey)

async function run() {
  console.log('=== TEST: Admin Product Creation and Approval Flow ===\n')

  // 1. Get platform seller and category
  const { data: platformSeller } = await supabase
    .from('sellers')
    .select('id, seller_type')
    .eq('seller_type', 'platform')
    .single()

  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  const testSlug = `admin-test-flow-${Date.now()}`
  console.log(`Creating test product with slug: ${testSlug}`)

  // 2. Insert product as admin product creation does
  const { data: createdProduct, error: createErr } = await supabase
    .from('products')
    .insert({
      seller_id: platformSeller.id,
      category_id: category.id,
      name: 'Admin Test Flow Silk Robe',
      slug: testSlug,
      description: 'Test product created via admin flow',
      price: 4999,
      default_weight_grams: 350,
      approval_status: 'approved',
      is_active: true
    })
    .select()
    .single()

  if (createErr) {
    console.error('Create error:', createErr)
    return
  }

  console.log('Product created successfully:', createdProduct.id)

  try {
    // 3. Now test approval update via updateProductApproval logic
    console.log('\nTesting approval update on created product...')

    // Check what update does
    const { data: updatedProduct, error: updateErr } = await supabase
      .from('products')
      .update({
        approval_status: 'approved',
        rejection_reason: null
      })
      .eq('id', createdProduct.id)
      .select()
      .single()

    if (updateErr) {
      console.error('Update error:', updateErr)
    } else {
      console.log('Update result:', updatedProduct?.approval_status)
    }

    // 4. Now test what happens if an admin tries to fetch or verify this product via:
    // a) getAdminProductById (admin view)
    const { data: adminFetch } = await supabase
      .from('products')
      .select('*, sellers(id, store_name, seller_type)')
      .eq('id', createdProduct.id)
      .single()
    console.log('Admin fetch result exists:', !!adminFetch)

    // b) getSellerProducts (seller view) - should NOT appear for normal sellers!
    const { data: sellerFetch } = await supabase
      .from('products')
      .select('id')
      .eq('id', createdProduct.id)
      .neq('seller_id', platformSeller.id)
    console.log('Found under non-platform sellers:', sellerFetch?.length)

  } finally {
    // Clean up
    await supabase.from('products').delete().eq('id', createdProduct.id)
    console.log('Cleaned up test product.')
  }
}

run().catch(console.error)
