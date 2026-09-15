const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMarketplace() {
  console.log('--- SENO MARKETPLACE PHASE VERIFICATION ---')
  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${message}`)
      failed++
    }
  }

  try {
    console.log('\\n1. Checking existing sellers...')
    const { data: sellers, error: sellersError } = await supabase.from('sellers_public').select('*')
    assert(!sellersError, 'Able to fetch sellers public view')
    
    console.log('\\n2. Checking existing products...')
    const { data: products, error: productsError } = await supabase.from('products').select('*')
    assert(!productsError, 'Able to fetch products public view')
    if (products) {
      assert(products.every(p => p.approval_status === 'approved'), 'Public products are all approved')
      assert(products.every(p => p.is_active === true), 'Public products are all active')
    }

    console.log('\\n3. Checking RLS protection...')
    const { data: pendingSellers, error: pendingError } = await supabase.from('sellers').select('*').eq('seller_status', 'pending')
    assert(pendingSellers && pendingSellers.length === 0, 'Cannot read pending sellers from public client')
    
  } catch (err) {
    console.error('Test execution failed:', err)
  }

  console.log(`\\n--- SUMMARY ---`)
  console.log(`Passed: ${passed}`)
  console.log(`Failed: ${failed}`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log('\\n🎉 All Marketplace Phase 2 checks passed!')
    process.exit(0)
  }
}

verifyMarketplace()
