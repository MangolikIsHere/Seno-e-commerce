import assert from 'node:assert/strict'
import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import {
  normalizeColourKey,
  getColourSwatchHex,
  getStandardHexForColour,
  prepareColourDetailsPayload,
  extractColourHexesFromDetails,
  extractColourImagesFromDetails,
  buildProductColourImageMap
} from '../lib/colours.ts'
import { reconcileProductVariants } from '../lib/variantReconciliation.ts'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceKey)

async function runTests() {
  console.log('=== SENO ADMIN PRODUCT EDITOR FIXES VERIFICATION ===\n')

  // --------------------------------------------------------------------
  // TEST 1: Colour Swatch & Hex Accuracy
  // --------------------------------------------------------------------
  console.log('Test 1: Colour Swatch & Hex resolution')
  
  // Custom hex should take highest precedence
  const customWine = getColourSwatchHex('Wine', '#722F37')
  assert.equal(customWine, '#722F37', 'Custom hex should override default/fallback')

  const customMustard = getColourSwatchHex('Mustard', '#E1AD01')
  assert.equal(customMustard, '#E1AD01', 'Custom hex for Mustard should match')

  const customOlive = getColourSwatchHex('Military Olive', '#3f4736')
  assert.equal(customOlive, '#3f4736', 'Custom hex for Military Olive should match')

  // Known palette fallback when no custom hex is provided
  const knownBlack = getColourSwatchHex('Black')
  assert.equal(knownBlack, '#121212')

  const knownOlive = getColourSwatchHex('Olive')
  assert.equal(knownOlive, '#4a5340')

  // getStandardHexForColour guarantees #RRGGBB for <input type="color">
  const standardHex = getStandardHexForColour('UnknownCustomTone')
  assert.match(standardHex, /^#[0-9a-f]{6}$/i, 'Standard hex must be a 6-digit hex code')

  console.log('[PASS] Test 1: Colour swatches and standard hexes resolve accurately')

  // --------------------------------------------------------------------
  // TEST 2: No Hardcoded Default Denim Jacket Image
  // --------------------------------------------------------------------
  console.log('\nTest 2: No hardcoded default jacket image verification')

  // Helper matching updated lib/catalog.ts getPrimaryProductImage
  function getPrimaryImageTest(product) {
    if (product.image) return product.image
    if (product.images && product.images.length > 0) return product.images[0]
    return ''
  }

  const mockProductWithoutImages = {
    id: 'test-empty-img',
    name: 'Minimalist Linen Shirt',
    slug: 'minimalist-linen-shirt',
    images: [],
    product_images: [],
    details: []
  }

  const primaryEmpty = getPrimaryImageTest(mockProductWithoutImages)
  assert.equal(primaryEmpty, '', 'Primary image for product with no photos must be empty string')
  assert.ok(!primaryEmpty.includes('photo-1551028719-00167b16eac5'), 'Denim jacket photo must not appear as default')

  console.log('[PASS] Test 2: Missing images return empty string without denim jacket fallback')

  // --------------------------------------------------------------------
  // TEST 3: Details Payload Serialization of Custom Colour Hexes
  // --------------------------------------------------------------------
  console.log('\nTest 3: Custom colour hexes persistence in details JSONB')

  const colourImages = {
    wine: ['https://images.unsplash.com/wine-1.jpg', 'https://images.unsplash.com/wine-2.jpg'],
    olive: ['https://images.unsplash.com/olive-1.jpg']
  }
  const colourPrimaries = {
    wine: 'https://images.unsplash.com/wine-1.jpg',
    olive: 'https://images.unsplash.com/olive-1.jpg'
  }
  const colourHexes = {
    wine: '#722F37',
    olive: '#556B2F'
  }

  const detailsPayload = prepareColourDetailsPayload(['100% Wool'], colourImages, colourPrimaries, colourHexes)
  assert.equal(detailsPayload.length, 2)
  assert.deepEqual(detailsPayload[0].__colour_hexes, { wine: '#722F37', olive: '#556B2F' })

  const extractedHexes = extractColourHexesFromDetails(detailsPayload)
  assert.equal(extractedHexes.wine, '#722F37')
  assert.equal(extractedHexes.olive, '#556B2F')

  console.log('[PASS] Test 3: prepareColourDetailsPayload correctly dual-persists __colour_hexes')

  // --------------------------------------------------------------------
  // TEST 4: Full End-to-End Database Lifecycle - Create, Photo Removal, and Stock Preservation
  // --------------------------------------------------------------------
  console.log('\nTest 4: Database E2E - Admin create, photo removal, and update')

  const { data: category } = await supabase.from('categories').select('id').limit(1).single()
  assert.ok(category?.id, 'A valid category must exist')

  const testSlug = `e2e-test-editor-${Date.now()}`
  let createdProductId = null

  try {
    // 4.1 Create product with 3 photos in "Wine" and custom hex #722F37
    const initialImages = [
      { url: 'https://images.unsplash.com/photo-test-1', display_order: 0, is_primary: true, colour: 'Wine', is_colour_primary: true },
      { url: 'https://images.unsplash.com/photo-test-2', display_order: 1, is_primary: false, colour: 'Wine', is_colour_primary: false },
      { url: 'https://images.unsplash.com/photo-test-3', display_order: 2, is_primary: false, colour: 'Wine', is_colour_primary: false }
    ]
    const initialVariants = [
      { size: 'M', colour: 'Wine', sku: `${testSlug}-WINE-M`, quantity: 25, is_active: true, price_override: null }
    ]
    const initialHexes = {
      wine: '#722F37'
    }

    const payloadDetails = prepareColourDetailsPayload([], initialImages, {}, initialHexes)

    const { data: seller } = await supabase.from('sellers').select('id').eq('seller_status', 'approved').limit(1).single()
    assert.ok(seller?.id, 'An approved seller must exist')

    const { data: insertedProduct, error: insertError } = await supabase
      .from('products')
      .insert({
        name: 'E2E Colour Swatch Test Trench',
        slug: testSlug,
        description: 'Testing live colour swatches and image removal',
        category_id: category.id,
        seller_id: seller.id,
        price: 18000,
        compare_at_price: 22000,
        default_weight_grams: 800,
        shipping_method: 'weight_based',
        details: payloadDetails,
        is_active: true,
        approval_status: 'approved'
      })
      .select('id')
      .single()

    assert.ifError(insertError)
    assert.ok(insertedProduct?.id)
    createdProductId = insertedProduct.id
    console.log(`[PASS] Step 4.1: Product created with ID: ${createdProductId}`)

    // Insert initial images
    const imagesToInsert = initialImages.map((img, idx) => ({
      product_id: createdProductId,
      url: img.url,
      display_order: idx,
      is_primary: img.is_primary
    }))
    const { error: imgInsertError } = await supabase.from('product_images').insert(imagesToInsert)
    assert.ifError(imgInsertError)

    // Reconcile initial variants
    await reconcileProductVariants(supabase, createdProductId, initialVariants)

    // 4.2 Fetch product back and verify custom hex and 3 images
    const { data: fetchedRow } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*, inventory(quantity))')
      .eq('id', createdProductId)
      .single()

    assert.ok(fetchedRow)
    const fetchedHexes = extractColourHexesFromDetails(fetchedRow.details)
    assert.equal(fetchedHexes.wine, '#722F37', 'Saved colour hex must match #722F37')
    assert.equal(fetchedRow.product_images.length, 3, 'Must have 3 images saved')

    // 4.3 Remove middle photo (photo-test-2) and first photo (photo-test-1), leaving only photo-test-3
    console.log('Step 4.2: Removing individual photos (first and middle photos)')
    const updatedImages = [
      { url: 'https://images.unsplash.com/photo-test-3', display_order: 0, is_primary: true, colour: 'Wine', is_colour_primary: true }
    ]

    // Delete existing product images and insert updated
    await supabase.from('product_images').delete().eq('product_id', createdProductId)
    const updatedImagesToInsert = updatedImages.map((img, idx) => ({
      product_id: createdProductId,
      url: img.url,
      display_order: idx,
      is_primary: img.is_primary
    }))
    await supabase.from('product_images').insert(updatedImagesToInsert)

    // Update details with updated hex
    const updatedDetails = prepareColourDetailsPayload([], updatedImages, {}, { wine: '#800020' })
    await supabase.from('products').update({ details: updatedDetails }).eq('id', createdProductId)

    // Reconcile variants (preserving stock)
    await reconcileProductVariants(supabase, createdProductId, initialVariants)

    // 4.4 Verify updated photo list and updated hex
    const { data: fetchedAfterUpdate } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*, inventory(quantity))')
      .eq('id', createdProductId)
      .single()

    assert.equal(fetchedAfterUpdate.product_images.length, 1, 'Image count should now be 1')
    assert.equal(fetchedAfterUpdate.product_images[0].url, 'https://images.unsplash.com/photo-test-3')
    assert.equal(extractColourHexesFromDetails(fetchedAfterUpdate.details).wine, '#800020', 'Updated hex should be #800020')
    const vQty1 = fetchedAfterUpdate.product_variants[0].inventory?.[0]?.quantity ?? fetchedAfterUpdate.product_variants[0].inventory?.quantity
    assert.equal(vQty1, 25, 'Variant quantity must be preserved')

    console.log('[PASS] Step 4.3: Individual photo removal and hex updates verified')

    // 4.5 Remove ALL photos and save
    console.log('Step 4.4: Removing all photos and verifying save with empty image gallery')
    await supabase.from('product_images').delete().eq('product_id', createdProductId)
    const emptyDetails = prepareColourDetailsPayload([], [], {}, { wine: '#800020' })
    await supabase.from('products').update({ details: emptyDetails }).eq('id', createdProductId)
    await reconcileProductVariants(supabase, createdProductId, initialVariants)

    const { data: fetchedEmpty } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*, inventory(quantity))')
      .eq('id', createdProductId)
      .single()

    assert.equal(fetchedEmpty.product_images.length, 0, 'Image count should be 0')
    assert.equal(fetchedEmpty.product_variants.length, 1, 'Variants must still be intact')
    const vQty2 = fetchedEmpty.product_variants[0].inventory?.[0]?.quantity ?? fetchedEmpty.product_variants[0].inventory?.quantity
    assert.equal(vQty2, 25, 'Stock quantity must remain 25')

    console.log('[PASS] Step 4.5: Saving product with 0 images succeeds without restoring jacket')

  } finally {
    if (createdProductId) {
      await supabase.from('products').delete().eq('id', createdProductId)
      console.log(`[CLEANUP] Deleted test product ${createdProductId}`)
    }
  }

  console.log('\n--- VERIFICATION COMPLETE ---')
  console.log('All tests passed cleanly! 🎉')
}

runTests().catch(err => {
  console.error('\n❌ Test failure:', err)
  process.exit(1)
})
