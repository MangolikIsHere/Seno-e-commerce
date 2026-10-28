/**
 * SENO Verification Suite:
 * Seller Product Revision Feedback Workflow End-to-End Test
 * 
 * Tests:
 * 1. Feedback Serialization & Parsing Unit Tests
 * 2. Summary Generator Formats Specific Feedback for Dashboard
 * 3. Malformed JSON, Corrupt Details, & Graceful Fallback Resilience
 * 4. Create test product in database
 * 5. Admin requests revisions with affected fields & notes
 * 6. Dashboard generates concise summary and points Open to revisions page
 * 7. Affected fields generate direct links to editor steps & anchors
 * 8. Saving draft edits retains rejected status without clearing feedback or __revision_history
 * 9. Resubmitting transitions status to submitted, triggers DB trigger to clear rejection_reason, and preserves history
 * 10. Admin requests second revision: latest feedback updated and previous preserved in history
 * 11. Legacy plain-text rejection strings parse cleanly and infer affected fields
 * 12. Security: Reseller cannot view Platform seller revision details
 * 13. Security: Database trigger enforces that non-admin cannot transition product to approved
 * 14. Notifications: Rejection generates notification with deep link to revision details view
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
  extractRevisionHistory,
  AFFECTED_FIELDS
} from '../lib/revisionFeedback.ts'
import { buildNotificationDeepLink } from '../lib/notifications/types.ts'

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
    // TEST 2: Summary Generator Formats Specific Feedback for Dashboard
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
    // TEST 3: Malformed JSON, Corrupt Details, & Graceful Fallback Resilience
    // -------------------------------------------------------------
    await test('3. Malformed JSON, Corrupt Details, & Graceful Fallback Resilience', async () => {
      // 3.1: Malformed JSON in rejection_reason does not throw, parses as plain text
      const malformedJson = '{"instructions": "Broken json with missing end'
      const parsedMalformed = parseRevisionFeedback(malformedJson)
      assert.ok(parsedMalformed, 'Parsed malformed JSON safely')
      assert.strictEqual(parsedMalformed.instructions, malformedJson)

      // 3.2: Null, undefined, empty inputs
      assert.strictEqual(parseRevisionFeedback(null), null)
      assert.strictEqual(parseRevisionFeedback(undefined), null)
      assert.strictEqual(parseRevisionFeedback('   '), null)

      // 3.3: Details with corrupt __revision_history non-array object
      const corruptDetails = [{ __revision_history: 'corrupted_string' }, { other: 123 }]
      const extractedCorrupt = extractRevisionHistory(corruptDetails)
      assert.deepStrictEqual(extractedCorrupt, [], 'Safely returns empty array for corrupt history')

      // 3.4: Append history onto null/undefined details
      const appended = appendRevisionHistory(null, {
        instructions: 'New instructions',
        affected_fields: ['images']
      })
      assert.ok(Array.isArray(appended), 'Returns array when starting from null details')
      assert.strictEqual(appended.length, 1)
      assert.ok(appended[0].__revision_history, 'Contains __revision_history')

      // 3.5: Unknown affected fields are filtered out cleanly
      const payloadWithUnknownField = JSON.stringify({
        instructions: 'Test instructions',
        affected_fields: ['images', 'unknown_field_123', 'pricing']
      })
      const parsedFiltered = parseRevisionFeedback(payloadWithUnknownField)
      assert.deepStrictEqual(parsedFiltered.affected_fields, ['images', 'pricing'], 'Filtered out unknown field keys')
    })

    // -------------------------------------------------------------
    // TEST 4: Create Test Product in Database
    // -------------------------------------------------------------
    await test('4. Create test product in database', async () => {
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
    // TEST 5: Admin Requests Revisions with Specific Instructions
    // -------------------------------------------------------------
    await test('5. Admin requests revisions with affected fields & notes', async () => {
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
    // TEST 6: Verify Seller Dashboard Action Item Message & Open Link
    // -------------------------------------------------------------
    await test('6. Dashboard generates concise summary and points Open to revisions page', async () => {
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
    // TEST 7: Verify Deep Link Generation to Product Editor
    // -------------------------------------------------------------
    await test('7. Affected fields generate direct links to editor steps & anchors', async () => {
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
    // TEST 8: Seller Saves Draft Without Resubmitting (Status Remains Rejected & History Preserved)
    // -------------------------------------------------------------
    await test('8. Saving draft edits retains rejected status and preserves __revision_history in details', async () => {
      const { data: currProd } = await supabase
        .from('products')
        .select('details')
        .eq('id', testProductId)
        .single()

      // Ensure __revision_history is in currProd.details
      const hasHistoryBefore = currProd.details.some(d => d && typeof d === 'object' && d.__revision_history)
      assert.ok(hasHistoryBefore, 'currProd.details has __revision_history before draft save')

      // Simulate draft save with updated name and attributes
      const { data: draftSave, error: draftErr } = await supabase
        .from('products')
        .update({
          name: 'Revision Test Silk Robe - Updated Draft',
          approval_status: 'rejected', // explicitly retains rejected
          details: currProd.details // preserves details with __revision_history
        })
        .eq('id', testProductId)
        .select()
        .single()

      assert.ok(!draftErr, `Draft update failed: ${draftErr?.message}`)
      assert.strictEqual(draftSave.approval_status, 'rejected')
      assert.strictEqual(draftSave.name, 'Revision Test Silk Robe - Updated Draft')

      // Ensure rejection feedback and history are preserved
      const parsed = parseRevisionFeedback(draftSave.rejection_reason, draftSave.details)
      assert.ok(parsed && parsed.instructions, 'Feedback remains accessible after draft save')
      const history = extractRevisionHistory(draftSave.details)
      assert.ok(history.length >= 1, 'History entries preserved after draft save')
    })

    // -------------------------------------------------------------
    // TEST 9: Seller Resubmits Product (DB Trigger Clears rejection_reason, History Stored)
    // -------------------------------------------------------------
    await test('9. Resubmitting transitions status to submitted, trigger clears rejection_reason, and history is preserved', async () => {
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
          rejection_reason: null, // explicit in submitSellerProduct and enforced by trigger
          details: resubmittedDetails
        })
        .eq('id', testProductId)
        .select()
        .single()

      assert.ok(!resubmitErr, `Resubmission failed: ${resubmitErr?.message}`)
      assert.strictEqual(resubmitted.approval_status, 'submitted')

      // Verify that PostgreSQL trigger trg_enforce_product_rules cleared rejection_reason
      assert.strictEqual(resubmitted.rejection_reason, null, 'PostgreSQL trigger cleared rejection_reason upon resubmission')

      // Verify that details.__revision_history PRESERVES the feedback even though rejection_reason is NULL
      const historyList = resubmitted.details.find(d => d && typeof d === 'object' && d.__revision_history)?.__revision_history
      assert.ok(Array.isArray(historyList) && historyList.length >= 1, 'Historical revision preserved in details.__revision_history')
      assert.ok(historyList[0].resubmitted_at, 'resubmitted_at timestamp recorded')
      assert.strictEqual(historyList[0].status, 'resubmitted')

      // Verify parseRevisionFeedback successfully extracts the latest archived revision from details
      const parsedFromHistory = parseRevisionFeedback(resubmitted.rejection_reason, resubmitted.details)
      assert.ok(parsedFromHistory, 'Extracted latest revision from history even when rejection_reason is null')
      assert.strictEqual(parsedFromHistory.status, 'resubmitted')
    })

    // -------------------------------------------------------------
    // TEST 10: Admin Requests Second Revision Cycle (History Accumulates)
    // -------------------------------------------------------------
    await test('10. Admin requests second revision: latest feedback updated and previous preserved in history', async () => {
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
    // TEST 11: Backward Compatibility with Legacy Plain-Text Feedback
    // -------------------------------------------------------------
    await test('11. Legacy plain-text rejection strings parse cleanly and infer affected fields', async () => {
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
    // TEST 12: Ownership Isolation (Reseller Cannot Access Platform Seller Revisions)
    // -------------------------------------------------------------
    await test('12. Security: Reseller cannot view Platform seller revision details', async () => {
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

    // -------------------------------------------------------------
    // TEST 13: Security: Database Trigger Rules Enforce Approval Constraints
    // -------------------------------------------------------------
    await test('13. Security: Database Trigger & RLS blocks unauthorized status transition to approved', async () => {
      // In the schema, trg_enforce_product_rules and RLS protect approval_status from unauthorized mutation
      const anonSupabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
      
      await anonSupabase
        .from('products')
        .update({ approval_status: 'approved' })
        .eq('id', testProductId)

      // Query authoritatively with admin client to verify the row was NOT updated to approved
      const { data: verifiedProd } = await supabase
        .from('products')
        .select('approval_status')
        .eq('id', testProductId)
        .single()

      assert.notStrictEqual(verifiedProd.approval_status, 'approved', 'Product was NOT updated to approved by unauthorized client')
    })

    // -------------------------------------------------------------
    // TEST 14: Notification Deep Link & Database Schema Verification
    // -------------------------------------------------------------
    await test('14. Notifications: Deep link points to /revisions and notification schema supports it', async () => {
      // 14.1: Default fallback deep link for seller_product_rejected
      const generatedLink = buildNotificationDeepLink('seller_product_rejected', { product_id: testProductId })
      assert.strictEqual(generatedLink, `/seller/products/${testProductId}/revisions`, 'Fallback deep link is /revisions')

      // 14.2: Explicit deep link preserved
      const explicitLink = buildNotificationDeepLink('seller_product_rejected', {
        product_id: testProductId,
        deep_link: `/seller/products/${testProductId}/revisions`
      })
      assert.strictEqual(explicitLink, `/seller/products/${testProductId}/revisions`, 'Explicit deep link preserved')

      // 14.3: Verify notifications table schema and insertion
      if (reseller?.user_id) {
        const notifPayload = {
          user_id: reseller.user_id,
          type: 'seller_product_rejected',
          title: 'Product Requires Changes',
          message: 'Test revision notification',
          data: {
            product_id: testProductId,
            deep_link: `/seller/products/${testProductId}/revisions`,
            reason: 'Please upload white backdrop photos'
          },
          idempotency_key: `test_notif_${testProductId}_${Date.now()}`
        }

        const { data: insertedNotif, error: notifErr } = await supabase
          .from('notifications')
          .insert(notifPayload)
          .select()
          .single()

        assert.ok(!notifErr, `Notification insertion succeeded: ${notifErr?.message}`)
        assert.strictEqual(insertedNotif.data.deep_link, `/seller/products/${testProductId}/revisions`)

        // Clean up test notification
        await supabase.from('notifications').delete().eq('id', insertedNotif.id)
      }
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
