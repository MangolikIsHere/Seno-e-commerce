import { supabase } from '../lib/supabase'
import { getProduct, getRelatedProducts, getNewArrivals, getBestsellers, getCollectionProducts } from '../lib/catalog'

async function benchmark() {
  console.log('=== SENO RAW STOREFRONT QUERY BENCHMARK ===\n')

  // 1. Categories Query
  let t0 = performance.now()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, display_order, is_active')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
  let t1 = performance.now()
  console.log(`[Categories] Query: ${(t1 - t0).toFixed(1)}ms (${categories?.length || 0} categories)`)

  // 2. Promotions Query
  t0 = performance.now()
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .order('display_priority', { ascending: false })
  t1 = performance.now()
  console.log(`[Promotions] Query: ${(t1 - t0).toFixed(1)}ms (${promotions?.length || 0} promotions)`)

  // 3. New Arrivals (4)
  t0 = performance.now()
  const newArrivals = await getNewArrivals(4)
  t1 = performance.now()
  console.log(`[Homepage] getNewArrivals(4): ${(t1 - t0).toFixed(1)}ms (${newArrivals.length} products)`)

  // 4. Bestsellers (4)
  t0 = performance.now()
  const bestsellers = await getBestsellers(4)
  t1 = performance.now()
  console.log(`[Homepage] getBestsellers(4): ${(t1 - t0).toFixed(1)}ms (${bestsellers.length} products)`)

  // 5. Product Detail
  const testSlug = newArrivals[0]?.slug || 'minimalist-wool-overcoat'
  t0 = performance.now()
  const product = await getProduct(testSlug)
  t1 = performance.now()
  console.log(`[Product Page] getProduct("${testSlug}"): ${(t1 - t0).toFixed(1)}ms (${product ? 'found' : 'not found'})`)

  // 6. Related Products
  if (product) {
    t0 = performance.now()
    const related = await getRelatedProducts(product, 4)
    t1 = performance.now()
    console.log(`[Product Page] getRelatedProducts: ${(t1 - t0).toFixed(1)}ms (${related.length} products)`)
  }

  // 7. Collection Products (all)
  t0 = performance.now()
  const collection = await getCollectionProducts('all', {})
  t1 = performance.now()
  console.log(`[Collection Page] getCollectionProducts("all"): ${(t1 - t0).toFixed(1)}ms (${collection.length} products)`)

  console.log('\n=== BENCHMARK COMPLETE ===')
}

benchmark().catch(err => {
  console.error('Benchmark error:', err)
  process.exit(1)
})
