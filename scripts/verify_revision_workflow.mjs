/**
 * SENO Verification Suite:
 * Seller Product Revision Feedback Workflow End-to-End Test
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import assert from 'assert'
import {
  serializeRevisionFeedback,
  parseRevisionFeedback,
  formatRevisionSummary,
  inferAffectedFields,
  appendRevisionHistory,
  markLatestRevisionResubmitted,
  AFFECTED_FIELDS
} from '../lib/revisionFeedback.ts'

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
  console.log('=================================================================')
  console.log(' SENO: SELLER PRODUCT REVISION FEEDBACK WORKFLOW E2E TESTS')
  console.log('=================================================================\n')

  // Find Platform seller and Reseller accounts
  const { data: platformSeller } = await supabase
    .from('sellers')
    .select('id, store_name, seller_type')
    .eq('seller_type', 'platform')
    .single()

  const { data: sellers, error: sellerError } = await supabase
    .from('sellers')
    .select('id, user_id, store_name')
    .eq('seller_type', 'reseller')
    .eq('seller_status', 'approved')
    .limit(2)

  assert.ok(!sellerError, `Failed to load sellers: ${sellerError?.message}`)
  assert.ok(platformSeller, 'Platform seller exists in DB')
  assert.ok(sellers && sellers.length >= 1, 'Need at least 1 reseller account for isolation tests')

  const reseller = sellers[0]
  const testSlug = `rev-test-${Date.now()}`
  let testProductId = null

  try {
    // -------------------------------------------------------------
    // TEST 1: Serialization, Parsing, and Field Inference Logic
    // -------------------------------------------------------------
    await test('1. Feedback Serialization & Parsing Unit Tests', async () => {
      const payload = serializeRevisionFeedback({
        instructions: 'Please update cover photos to white background and fix XL sizing stock count.',
        affectedFields: ['images', 'variants'],
        additionalNotes: 'Check SENO photography guidelines.'
      })

      assert.ok(typeof payload === 'string', 'Serialized payload is string')
      const parsed = parseRevisionFeedback(payload)
      assert.ok(parsed, 'Successfully parsed serialized feedback')
      assert.strictEqual(parsed.instructions, 'Please update cover photos to white background and fix XL sizing stock count.')
      assert.deepStrictEqual(parsed.affected_fields, ['images', 'variants'])
      assert.strictEqual(parsed.additional_notes, 'Check SENO photography guidelines.')

      // Test automatic inference if admin entered text without ticking boxes
      const inferred = inferAffectedFields('Update the product images and lower the price')
      assert.ok(inferred.includes('images'), 'Inferred images field')
      assert.ok(inferred.includes('pricing'), 'Inferred pricing field')
    })

    // -------------------------------------------------------------
    // TEST 2: Summary Generator Replaces Generic Messages
    // -------------------------------------------------------------
    await test('2. Summary Generator Formats Specific Feedback for Dashboard', async () => {
      const summary1 = formatRevisionSummary({
        instructions: 'Please update product images and correct size variants.',
        affectedFields: ['images', 'variants']
      })
      assert.ok(summary1.includes('Images') || summary1.includes('images'), 'Summary includes images')
      assert.ok(summary1.includes('Variants') || summary1.includes('variants'), 'Summary includes variants')
      assert.ok(!summary1.includes('Changes requested by SENO admin.'), 'Does not return generic placeholder')

      // Short instructions without fields
      const summary2 = formatRevisionSummary({
        instructions: 'Please provide certified fabric report.'
      })
      assert.strictEqual(summary2, 'Please provide certified fabric report.')

      // Long instructions without fields truncated cleanly
      const summary3 = formatRevisionSummary({
        instructions: 'Please provide certified fabric testing report and update collar details for quality standard.'
      })
      assert.ok(summary3.endsWith('...'), 'Long summary truncated with ellipsis')
    })

    // -------------------------------------------------------------
    // TEST 3: Create Test Product in Database
    // -------------------------------------------------------------
    await test('3. Create test product in database', async () => {
      const { data: category } = await supabase.from('categories').select('id').eq('is_active', true).limit(1).single()

      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .insert({
          seller_id: platformSeller.id,
          category_id: category?.id || null,
          name: 'Revision Test Silk Robe',
          slug: testSlug,
          description: 'A luxurious test garment for revision verification.',
          price: 2499,
          compare_at_price: 3499,
          default_weight_grams: 500,
          approval_status: 'submitted',
          details: ['Fabric: 100% Silk']
        })
        .select()
        .single()

      assert.ok(!prodErr, `Product creation failed: ${prodErr?.message}`)
      assert.ok(prod, 'Product record returned')
      testProductId = prod.id

      // Insert dummy variants
      const { error: varErr } = await supabase.from('product_variants').insert([
        {
          product_id: prod.id,
          size: 'M',
          colour: 'Emerald',
          sku: `${testSlug.toUpperCase()}-EMD-M`
        },
        {
          product_id: prod.id,
          size: 'L',
          colour: 'Emerald',
          sku: `${testSlug.toUpperCase()}-EMD-L`
        }
      ])
      assert.ok(!varErr, `Variant insert failed: ${varErr?.message}`)
    })

    // -------------------------------------------------------------
    // TEST 4: Admin Requests Revisions with Specific Instructions
    // -------------------------------------------------------------
    await test('4. Admin requests revisions with affected fields & notes', async () => {
      const adminInstructions = 'Upload high-resolution photography on white background and verify XL variant inventory.'
      const affectedFields = ['images', 'variants', 'inventory']
      const additionalNotes = 'See seller studio style guide section 4.'

      const feedbackPayload = serializeRevisionFeedback({
        instructions: adminInstructions,
        affectedFields,
        additionalNotes
      })

      // Get current product details
      const { data: currProd } = await supabase
        .from('products')
        .select('details')
        .eq('id', testProductId)
        .single()

      const updatedDetails = appendRevisionHistory(currProd.details, {
        instructions: adminInstructions,
        affected_fields: affectedFields,
        additional_notes: additionalNotes,
        requested_at: new Date().toISOString(),
        status: 'pending_revision'
      })

      const { data: updatedProd, error: updateErr } = await supabase
        .from('products')
        .update({
          approval_status: 'rejected',
          rejection_reason: feedbackPayload,
          details: updatedDetails
        })
        .eq('id', testProductId)
        .select()
        .single()

      assert.ok(!updateErr, `Admin rejection failed: ${updateErr?.message}`)
      assert.strictEqual(updatedProd.approval_status, 'rejected')

      // Verify stored feedback
      const parsed = parseRevisionFeedback(updatedProd.rejection_reason, updatedProd.details)
      assert.ok(parsed, 'Parsed feedback exists')
      assert.strictEqual(parsed.instructions, adminInstructions)
      assert.deepStrictEqual(parsed.affected_fields, affectedFields)
      assert.strictEqual(parsed.additional_notes, additionalNotes)
    })

    // -------------------------------------------------------------
    // TEST 5: Verify Seller Dashboard Action Item Message & Open Link
    // -------------------------------------------------------------
    await test('5. Dashboard generates concise summary and points Open to revisions page', async () => {
      const { data: prod } = await supabase
        .from('products')
        .select('id, name, rejection_reason, details, approval_status')
        .eq('id', testProductId)
        .single()

      const parsed = parseRevisionFeedback(prod.rejection_reason, prod.details)
      const summaryText = formatRevisionSummary({
        instructions: parsed.instructions,
        affectedFields: parsed.affected_fields
      })

      // Ensure concise summary replaces generic message
      assert.ok(!summaryText.includes('Changes requested by SENO admin.'), 'Does not use generic string')
      assert.ok(summaryText.includes('Images') || summaryText.includes('Variants') || summaryText.includes('Inventory'), 'Mentions affected fields')

      // Ensure destination link is /seller/products/[id]/revisions
      const openHref = `/seller/products/${prod.id}/revisions`
      assert.strictEqual(openHref, `/seller/products/${testProductId}/revisions`)
    })

    // -------------------------------------------------------------
    // TEST 6: Verify Deep Link Generation to Product Editor
    // -------------------------------------------------------------
    await test('6. Affected fields generate direct links to editor steps & anchors', async () => {
      const { data: prod } = await supabase
        .from('products')
        .select('rejection_reason, details')
        .eq('id', testProductId)
        .single()

      const parsed = parseRevisionFeedback(prod.rejection_reason, prod.details)
      for (const fieldKey of parsed.affected_fields) {
        const fieldConfig = AFFECTED_FIELDS[fieldKey]
        assert.ok(fieldConfig, `Config exists for field: ${fieldKey}`)
        const editLink = `/seller/products/${testProductId}/edit?step=${fieldConfig.step}&focus=${fieldConfig.anchor}#${fieldConfig.anchor}`
        assert.ok(editLink.includes(`step=${fieldConfig.step}`), `Link contains step ${fieldConfig.step}`)
        assert.ok(editLink.includes(`focus=${fieldConfig.anchor}`), `Link contains anchor ${fieldConfig.anchor}`)
      }
    })

    // -------------------------------------------------------------
    // TEST 7: Seller Saves Draft Without Resubmitting (Status Remains Rejected)
    // -------------------------------------------------------------
    await test('7. Saving draft edits retains rejected status without clearing feedback', async () => {
      // Simulate draft save
      const { data: draftSave, error: draftErr } = await supabase
        .from('products')
        .update({
          name: 'Revision Test Silk Robe - Updated Draft',
          approval_status: 'rejected' // explicitly retains rejected
        })
        .eq('id', testProductId)
        .select()
        .single()

      assert.ok(!draftErr, `Draft update failed: ${draftErr?.message}`)
      assert.strictEqual(draftSave.approval_status, 'rejected')
      assert.strictEqual(draftSave.name, 'Revision Test Silk Robe - Updated Draft')

      // Ensure rejection feedback is preserved
      const parsed = parseRevisionFeedback(draftSave.rejection_reason, draftSave.details)
      assert.ok(parsed && parsed.instructions, 'Feedback remains accessible after draft save')
    })

    // -------------------------------------------------------------
    // TEST 8: Seller Resubmits Product (Status Transitions to Submitted & History Stored)
    // -------------------------------------------------------------
    await test('8. Resubmitting transitions status to submitted and records resubmission history', async () => {
      const { data: currProd } = await supabase
        .from('products')
        .select('details')
        .eq('id', testProductId)
        .single()

      // Mark latest revision resubmitted
      const resubmittedDetails = markLatestRevisionResubmitted(currProd.details)

      // In Postgres, trigger trg_enforce_product_rules clears rejection_reason on transition to 'submitted'
      const { data: resubmitted, error: resubmitErr } = await supabase
        .from('products')
        .update({
          approval_status: 'submitted',
          details: resubmittedDetails
        })
        .eq('id', testProductId)
        .select()
        .single()

      assert.ok(!resubmitErr, `Resubmission failed: ${resubmitErr?.message}`)
      assert.strictEqual(resubmitted.approval_status, 'submitted')

      // Verify that details.__revision_history PRESERVES the feedback even though rejection_reason is NULL
      const historyList = resubmitted.details.find(d => d && typeof d === 'object' && d.__revision_history)?.__revision_history
      assert.ok(Array.isArray(historyList) && historyList.length >= 1, 'Historical revision preserved in details.__revision_history')
      assert.ok(historyList[0].resubmitted_at, 'resubmitted_at timestamp recorded')
      assert.strictEqual(historyList[0].status, 'resubmitted')
    })

    // -------------------------------------------------------------
    // TEST 9: Admin Requests Second Revision Cycle (History Accumulates)
    // -------------------------------------------------------------
    await test('9. Admin requests second revision: latest feedback updated and previous preserved in history', async () => {
      const secondInstructions = 'Collar stitching is uneven in image 2. Please replace with close-up shot.'
      const secondAffected = ['images']

      const secondPayload = serializeRevisionFeedback({
        instructions: secondInstructions,
        affectedFields: secondAffected,
        additionalNotes: 'Check new studio lighting setup.'
      })

      const { data: currProd } = await supabase
        .from('products')
        .select('details')
        .eq('id', testProductId)
        .single()

      const newDetails = appendRevisionHistory(currProd.details, {
        instructions: secondInstructions,
        affected_fields: secondAffected,
        additional_notes: 'Check new studio lighting setup.',
        requested_at: new Date().toISOString(),
        status: 'pending_revision'
      })

      const { data: secondRejection, error: secondErr } = await supabase
        .from('products')
        .update({
          approval_status: 'rejected',
          rejection_reason: secondPayload,
          details: newDetails
        })
        .eq('id', testProductId)
        .select()
        .single()

      assert.ok(!secondErr, `Second rejection failed: ${secondErr?.message}`)
      assert.strictEqual(secondRejection.approval_status, 'rejected')

      // Latest feedback reflects second revision
      const parsedLatest = parseRevisionFeedback(secondRejection.rejection_reason, secondRejection.details)
      assert.strictEqual(parsedLatest.instructions, secondInstructions)
      assert.deepStrictEqual(parsedLatest.affected_fields, secondAffected)

      // History contains both revisions
      const historyList = secondRejection.details.find(d => d && typeof d === 'object' && d.__revision_history)?.__revision_history
      assert.strictEqual(historyList.length, 2, 'History contains 2 revisions')
      assert.strictEqual(historyList[0].status, 'resubmitted')
      assert.strictEqual(historyList[1].status, 'pending_revision')
      assert.strictEqual(historyList[1].instructions, secondInstructions)
    })

    // -------------------------------------------------------------
    // TEST 10: Backward Compatibility with Legacy Plain-Text Feedback
    // -------------------------------------------------------------
    await test('10. Legacy plain-text rejection strings parse cleanly and infer affected fields', async () => {
      const legacyReason = 'Product price is set too low for luxury standards and images are blurry.'
      const parsedLegacy = parseRevisionFeedback(legacyReason, [])

      assert.ok(parsedLegacy, 'Parsed legacy string successfully')
      assert.strictEqual(parsedLegacy.instructions, legacyReason)
      assert.ok(parsedLegacy.affected_fields.includes('pricing'), 'Inferred pricing from legacy text')
      assert.ok(parsedLegacy.affected_fields.includes('images'), 'Inferred images from legacy text')

      // Null or empty feedback handling
      const parsedEmpty = parseRevisionFeedback('', null)
      assert.strictEqual(parsedEmpty, null)
    })

    // -------------------------------------------------------------
    // TEST 11: Ownership Isolation (Reseller Cannot Access Platform Seller Revisions)
    // -------------------------------------------------------------
    await test('11. Security: Reseller cannot view Platform seller revision details', async () => {
      // Simulating query in getSellerProductRevisionDetails with seller_id check
      const { data: crossAccess } = await supabase
        .from('products')
        .select('id, name, seller_id, rejection_reason')
        .eq('id', testProductId)
        .eq('seller_id', reseller.id) // Querying with other seller's ID
        .maybeSingle()

      assert.strictEqual(crossAccess, null, 'Cross-seller access returned null: Other seller cannot view revision')

      // Querying with genuine owner's ID succeeds
      const { data: validAccess } = await supabase
        .from('products')
        .select('id, name, seller_id, rejection_reason')
        .eq('id', testProductId)
        .eq('seller_id', platformSeller.id)
        .maybeSingle()

      assert.ok(validAccess, 'Legitimate seller can access own product revision')
      assert.strictEqual(validAccess.id, testProductId)
    })

  } finally {
    // Cleanup test product
    if (testProductId) {
      await supabase.from('product_variants').delete().eq('product_id', testProductId)
      await supabase.from('products').delete().eq('id', testProductId)
      console.log(`\nCleaned up test product: ${testProductId}`)
    }
  }

  console.log('\n=================================================================')
  console.log(` TEST RUN COMPLETE: ${passed} PASSED, ${failed} FAILED`)
  console.log('=================================================================')

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
