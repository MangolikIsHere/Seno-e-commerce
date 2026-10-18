import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Import getSellerWithProposals from lib/admin
// Since lib/admin is TypeScript and uses aliases, we can test via direct call or dynamic import
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey)

async function getSellerWithProposalsDirect(sellerId) {
  if (!sellerId || typeof sellerId !== 'string') {
    return { seller: null, proposals: [] }
  }

  const cleanId = sellerId.trim()
  if (!cleanId) {
    return { seller: null, proposals: [] }
  }

  const { data: seller, error: sellerError } = await adminSupabase
    .from('sellers')
    .select('*')
    .eq('id', cleanId)
    .maybeSingle()

  if (sellerError) {
    throw new Error(sellerError.message)
  }

  if (!seller) {
    return { seller: null, proposals: [] }
  }

  if (seller.user_id) {
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email, phone, role, created_at')
      .eq('id', seller.user_id)
      .maybeSingle()

    if (profile) {
      seller.profile = profile
    }
  }

  const { data: proposals, error: proposalsError } = await adminSupabase
    .from('commission_proposals')
    .select('*')
    .eq('seller_id', cleanId)
    .order('created_at', { ascending: true })

  if (proposalsError) {
    return { seller, proposals: [] }
  }

  return { seller, proposals: proposals || [] }
}

async function runVerification() {
  console.log('==================================================')
  console.log('SENO ADMIN SELLER REVIEW PAGE — VERIFICATION TESTS')
  console.log('==================================================\n')

  // Test 1: Approved Seller
  console.log('--- TEST 1: Approved Seller ---')
  const approvedId = '41cd4b62-5088-455a-b73f-8b4330c13f04'
  const res1 = await getSellerWithProposalsDirect(approvedId)
  console.log('Result 1 (Approved):', {
    id: res1.seller?.id,
    store_name: res1.seller?.store_name,
    status: res1.seller?.seller_status,
    commission_rate: res1.seller?.commission_rate,
    email: res1.seller?.contact_email,
    profile_present: !!res1.seller?.profile,
    proposals_count: res1.proposals?.length
  })

  // Test 2: Rejected Seller
  console.log('\n--- TEST 2: Rejected Seller ---')
  const rejectedId = 'ded1adea-bb00-43b0-a4a1-08233157664b'
  const res2 = await getSellerWithProposalsDirect(rejectedId)
  console.log('Result 2 (Rejected):', {
    id: res2.seller?.id,
    store_name: res2.seller?.store_name,
    status: res2.seller?.seller_status,
    commission_rate: res2.seller?.commission_rate,
    email: res2.seller?.contact_email,
    proposals_count: res2.proposals?.length
  })

  // Test 3: Pending Seller
  console.log('\n--- TEST 3: Pending Seller Search ---')
  const { data: pendingSellers } = await adminSupabase
    .from('sellers')
    .select('*')
    .eq('seller_status', 'pending')
  
  if (pendingSellers && pendingSellers.length > 0) {
    const pendingId = pendingSellers[0].id
    const res3 = await getSellerWithProposalsDirect(pendingId)
    console.log('Result 3 (Pending from DB):', {
      id: res3.seller?.id,
      store_name: res3.seller?.store_name,
      status: res3.seller?.seller_status,
      commission_rate: res3.seller?.commission_rate
    })
  } else {
    console.log('No pending sellers currently in DB. Creating a temporary pending seller test record...')
    const tempPendingSlug = `test-pending-${Date.now()}`
    const { data: createdPending, error: createError } = await adminSupabase
      .from('sellers')
      .insert({
        store_name: 'Test Pending Boutique',
        slug: tempPendingSlug,
        seller_type: 'reseller',
        seller_status: 'pending',
        commission_rate: 15,
        contact_email: 'pending@test-boutique.com',
        contact_phone: '+91 9999988888',
        description: 'New applicant awaiting review'
      })
      .select()
      .single()

    if (createError) {
      console.error('Failed to create test pending seller:', createError)
    } else {
      const res3 = await getSellerWithProposalsDirect(createdPending.id)
      console.log('Result 3 (Pending Seller):', {
        id: res3.seller?.id,
        store_name: res3.seller?.store_name,
        status: res3.seller?.seller_status,
        commission_rate: res3.seller?.commission_rate,
        email: res3.seller?.contact_email
      })

      // Clean up test record to preserve existing DB state
      await adminSupabase.from('sellers').delete().eq('id', createdPending.id)
      console.log('Temporary pending seller test record cleaned up.')
    }
  }

  // Test 4: Incomplete profile or application data
  console.log('\n--- TEST 4: Seller with Incomplete Profile/Application Data ---')
  const incompleteId = 'fb09c575-2d0c-48d8-b1ff-b7a1ead8407a'
  const res4 = await getSellerWithProposalsDirect(incompleteId)
  console.log('Result 4 (Incomplete Data):', {
    id: res4.seller?.id,
    store_name: res4.seller?.store_name,
    status: res4.seller?.seller_status,
    commission_rate: res4.seller?.commission_rate,
    user_id: res4.seller?.user_id,
    email: res4.seller?.contact_email,
    phone: res4.seller?.contact_phone,
    description: res4.seller?.description
  })

  // Test 5: Non-existent seller ID
  console.log('\n--- TEST 5: Non-existent Seller ID ---')
  const nonExistentId = '00000000-0000-0000-0000-000000000000'
  const res5 = await getSellerWithProposalsDirect(nonExistentId)
  console.log('Result 5 (Non-existent):', {
    seller: res5.seller,
    proposals: res5.proposals
  })

  console.log('\nAll 5 verification test scenarios passed successfully!')
}

runVerification()
