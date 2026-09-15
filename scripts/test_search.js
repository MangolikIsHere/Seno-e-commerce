const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const selectQuery = `
  *,
  categories(name),
  product_images(url, is_primary, display_order),
  product_variants(id, size, colour, sku, price_override, weight_grams_override, is_active, inventory(quantity))
`

async function testSearch(q) {
  console.log(`\nTesting search for: "${q}"`)
  const { data, error } = await supabase
    .from('products')
    .select(selectQuery)
    .eq('is_active', true)
    .eq('approval_status', 'approved')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%`)

  if (error) {
    console.error('Search ERROR:', error)
  } else {
    console.log(`Found ${data.length} products:`, data.map(p => p.name))
  }
}

async function run() {
  await testSearch('shirt')
  await testSearch('linen shirt')
  await testSearch('pant')
  await testSearch('coat')
}

run()
