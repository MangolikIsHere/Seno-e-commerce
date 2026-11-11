import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { notifyAdminProductSubmitted, notifySellerProductDecision } from '../lib/notifications/service'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function runApprovalSuite() {
  console.log('====================================================')
  console.log('SENO ADMIN PRODUCT APPROVAL WORKFLOW VERIFICATION')
  console.log('====================================================\n')

  const cleanupProductIds: string[] = []

  try {
    // 1. Identify Admin & Seller profiles
    console.log('>>> [STEP 1] Fetching Admin and Seller profiles...')
    const { data: adminProfiles, error: adminErr } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin')

    if (adminErr || !adminProfiles || adminProfiles.length === 0) {
      throw new Error('No admin accounts found: ' + adminErr?.message)
    }
    console.log(`✓ Found ${adminProfiles.length} admin accounts:`, adminProfiles.map(a => a.email).join(', '))

    const { data: sellerUser, error: sellerErr } = await adminClient
      .from('profiles')
      .select('id, email, role')
      .eq('email', 'ss2082886@gmail.com')
      .single()

    if (sellerErr || !sellerUser) {
      throw new Error('Seller profile not found: ' + sellerErr?.message)
    }

    const { data: sellerRecord, error: sellerRecErr } = await adminClient
      .from('sellers')
      .select('id, store_name')
      .eq('user_id', sellerUser.id)
      .single()

    if (sellerRecErr || !sellerRecord) {
      throw new Error('Seller store record not found: ' + sellerRecErr?.message)
    }
    console.log(`✓ Found seller: ${sellerRecord.store_name} (User: ${sellerUser.email})`)

    const { data: category } = await adminClient
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!category) throw new Error('No active category found!')
    console.log(`✓ Active category: ${category.name} (${category.id})\n`)

    // =========================================================================
    // TEST 1 & 2: SELLER SUBMISSION & ADMIN NOTIFICATION
    // =========================================================================
    console.log('>>> [TEST 1 & 2] Simulating Seller Product Submission & Admin Notification...')
    const testSlug1 = `test-approval-item-${Date.now()}`
    
    // Insert submitted product
    const { data: prod1, error: p1Err } = await adminClient
      .from('products')
      .insert({
        name: 'Artisan Embroidered Silk Tunic',
        slug: testSlug1,
        description: 'Handcrafted pure mulberry silk tunic with delicate zardozi needlework.',
        price: 4990,
        category_id: category.id,
        seller_id: sellerRecord.id,
        approval_status: 'submitted',
        is_active: true, // will be forced false by enforce_product_rules() trigger!
        shipping_method: 'weight_based',
        default_weight_grams: 400
      })
      .select()
      .single()

    if (p1Err || !prod1) {
      throw new Error('Failed to insert test product: ' + p1Err?.message)
    }
    cleanupProductIds.push(prod1.id)

    console.log(`✓ Created submitted product: "${prod1.name}" (${prod1.id})`)
    console.log(`  - DB approval_status: ${prod1.approval_status}`)
    console.log(`  - DB is_active: ${prod1.is_active}`)

    if (prod1.is_active !== false) {
      throw new Error(`FAIL: DB trigger did not enforce is_active=false on submitted product! Got ${prod1.is_active}`)
    }
    console.log('  ✓ Verified: Product is NOT active/live while approval_status = "submitted".')

    // Dispatch admin notification via service
    console.log('  -> Dispatching notifyAdminProductSubmitted...')
    await notifyAdminProductSubmitted(prod1.id)

    // Verify admin notifications exist
    const { data: adminNotifs, error: anErr } = await adminClient
      .from('notifications')
      .select('*')
      .eq('type', 'admin_product_submitted')
      .order('created_at', { ascending: false })
      .limit(adminProfiles.length)

    if (anErr || !adminNotifs || adminNotifs.length === 0) {
      throw new Error('Failed to query admin notifications: ' + anErr?.message)
    }

    const matchingAdminNotif = adminNotifs.find(n => n.data?.product_id === prod1.id)
    if (!matchingAdminNotif) {
      throw new Error('FAIL: Admin notification for submitted product was not found in DB!')
    }

    console.log(`✓ Admin notification verified in DB:`)
    console.log(`  - Title: "${matchingAdminNotif.title}"`)
    console.log(`  - Message: "${matchingAdminNotif.message}"`)
    console.log(`  - Deep link: "${matchingAdminNotif.data?.link || matchingAdminNotif.data?.deep_link}"`)
    console.log(`  - Unread (read_at is null): ${matchingAdminNotif.read_at === null}`)

    // =========================================================================
    // TEST 3 & 4: ADMIN APPROVAL WORKFLOW
    // =========================================================================
    console.log('\n>>> [TEST 3 & 4] Simulating Admin Approval...')
    const publishedAt = new Date().toISOString()
    const { data: approvedProd, error: appErr } = await adminClient
      .from('products')
      .update({
        approval_status: 'approved',
        is_active: true,
        rejection_reason: null,
        published_at: publishedAt
      })
      .eq('id', prod1.id)
      .select()
      .single()

    if (appErr || !approvedProd) {
      throw new Error('Failed to approve product: ' + appErr?.message)
    }

    console.log(`✓ Product approved successfully:`)
    console.log(`  - approval_status: ${approvedProd.approval_status}`)
    console.log(`  - is_active: ${approvedProd.is_active}`)
    console.log(`  - published_at: ${approvedProd.published_at}`)

    if (approvedProd.approval_status !== 'approved' || approvedProd.is_active !== true) {
      throw new Error('FAIL: Approved product did not become active!')
    }

    // Dispatch seller approval notification
    console.log('  -> Dispatching notifySellerProductDecision(approved)...')
    await notifySellerProductDecision(prod1.id, 'approved')

    // Verify seller notification
    const { data: sellerNotifs } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', sellerUser.id)
      .eq('type', 'seller_product_approved')
      .order('created_at', { ascending: false })
      .limit(1)

    const sellerApprovalNotif = sellerNotifs?.[0]
    if (!sellerApprovalNotif || sellerApprovalNotif.data?.product_id !== prod1.id) {
      throw new Error('FAIL: Seller approval notification not found!')
    }
    console.log(`✓ Seller notification verified: "${sellerApprovalNotif.title}" -> "${sellerApprovalNotif.message}"`)

    // Verify storefront query eligibility
    const { data: storefrontProd } = await adminClient
      .from('products')
      .select('id, name, is_active, approval_status')
      .eq('id', prod1.id)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .single()

    if (!storefrontProd) {
      throw new Error('FAIL: Product not queryable in storefront filter!')
    }
    console.log('✓ Storefront query verification passed: Product is visible on live storefront.')

    // =========================================================================
    // TEST 5 & 6: ADMIN REJECTION WORKFLOW
    // =========================================================================
    console.log('\n>>> [TEST 5 & 6] Simulating Seller Product Submission & Admin Rejection...')
    const testSlug2 = `test-rejection-item-${Date.now()}`
    const { data: prod2, error: p2Err } = await adminClient
      .from('products')
      .insert({
        name: 'Hand-block Printed Indigo Scarf',
        slug: testSlug2,
        description: 'Cotton scarf made with natural dyes.',
        price: 1200,
        category_id: category.id,
        seller_id: sellerRecord.id,
        approval_status: 'submitted',
        is_active: false,
        shipping_method: 'weight_based',
        default_weight_grams: 150
      })
      .select()
      .single()

    if (p2Err || !prod2) throw new Error('Failed to create second test product: ' + p2Err?.message)
    cleanupProductIds.push(prod2.id)

    const rejectionReason = 'Please upload at least 3 high-resolution studio photos on a neutral backdrop and provide fabric wash care details.'
    const { data: rejectedProd, error: rejErr } = await adminClient
      .from('products')
      .update({
        approval_status: 'rejected',
        is_active: false,
        rejection_reason: rejectionReason,
        published_at: null
      })
      .eq('id', prod2.id)
      .select()
      .single()

    if (rejErr || !rejectedProd) throw new Error('Failed to reject product: ' + rejErr?.message)

    console.log(`✓ Product rejected successfully:`)
    console.log(`  - approval_status: ${rejectedProd.approval_status}`)
    console.log(`  - is_active: ${rejectedProd.is_active}`)
    console.log(`  - rejection_reason: ${rejectedProd.rejection_reason}`)

    if (rejectedProd.approval_status !== 'rejected' || rejectedProd.is_active !== false) {
      throw new Error('FAIL: Rejected product state incorrect!')
    }

    // Dispatch seller rejection notification
    console.log('  -> Dispatching notifySellerProductDecision(rejected)...')
    await notifySellerProductDecision(prod2.id, 'rejected', rejectionReason)

    // Verify seller notification
    const { data: sellerRejNotifs } = await adminClient
      .from('notifications')
      .select('*')
      .eq('user_id', sellerUser.id)
      .eq('type', 'seller_product_rejected')
      .order('created_at', { ascending: false })
      .limit(1)

    const sellerRejNotif = sellerRejNotifs?.[0]
    if (!sellerRejNotif || sellerRejNotif.data?.product_id !== prod2.id) {
      throw new Error('FAIL: Seller rejection notification not found!')
    }
    console.log(`✓ Seller notification verified: "${sellerRejNotif.title}" -> "${sellerRejNotif.message}"`)

    // Verify storefront query excludes rejected product
    const { data: storefrontRej } = await adminClient
      .from('products')
      .select('id')
      .eq('id', prod2.id)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .maybeSingle()

    if (storefrontRej) {
      throw new Error('FAIL: Rejected product appeared in storefront query!')
    }
    console.log('✓ Storefront query verification passed: Rejected product is completely hidden from storefront.')

    // =========================================================================
    // TEST 7: DB CONSTRAINT / TRIGGER INTEGRITY CHECK
    // =========================================================================
    console.log('\n>>> [TEST 7] Verifying DB Trigger blocks is_active=true for unapproved products...')
    const { data: forcedActiveProd, error: forceErr } = await adminClient
      .from('products')
      .update({ is_active: true })
      .eq('id', prod2.id) // product is rejected
      .select()
      .single()

    if (forceErr) {
      console.log('✓ DB correctly blocked activate on unapproved product:', forceErr.message)
    } else if (forcedActiveProd && forcedActiveProd.is_active === false) {
      console.log('✓ Trigger successfully clamped is_active to false despite update attempt!')
    } else {
      throw new Error(`FAIL: Product was permitted to have is_active=true while status is ${forcedActiveProd?.approval_status}`)
    }

    console.log('\n====================================================')
    console.log('ALL APPROVAL WORKFLOW TESTS PASSED SUCCESSFULLY! ✓')
    console.log('====================================================\n')
  } finally {
    // Cleanup
    console.log('Cleaning up test data...')
    if (cleanupProductIds.length > 0) {
      await adminClient.from('products').delete().in('id', cleanupProductIds)
      console.log(`Cleaned up ${cleanupProductIds.length} test products.`)
    }
  }
}

runApprovalSuite().catch(err => {
  console.error('\nVerification failed:', err)
  process.exit(1)
})
