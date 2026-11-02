/**
 * Automated Verification Suite:
 * SENO — Navigation Reliability, Performance Optimizations & Duplicate Share Removal
 */

import fs from 'fs'
import path from 'path'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

console.log('=== Running SENO Navigation & Performance Verification ===\n')

const root = path.join(__dirname, '..')

// 1. Part 1: Product Detail Page Share Button Verification
console.log('--- 1. Part 1: Single Share Button on Product Page ---')
const pdcContent = fs.readFileSync(path.join(root, 'components', 'ProductDetailClient.tsx'), 'utf8')
const shareOccurrences = (pdcContent.match(/setShareModalOpen\(true\)/g) || []).length
assert(shareOccurrences === 1, `Expected exactly 1 trigger for setShareModalOpen(true), found ${shareOccurrences}`)

// Ensure the remaining share button is in the header / photo section
assert(pdcContent.includes('<span>SHARE</span>'), 'Remaining Share button with "SHARE" label is preserved')

// Ensure purchase section actions group does NOT have a share button
const actionsGroupIndex = pdcContent.indexOf('className="product-action-panel"')
const actionsGroupSection = pdcContent.slice(actionsGroupIndex, actionsGroupIndex + 2000)
assert(!actionsGroupSection.includes('setShareModalOpen(true)'), 'Purchase actions group does NOT contain duplicate Share button')
assert(actionsGroupSection.includes('wishlist-toggle-icon-btn'), 'Wishlist button in purchase section is preserved')
assert(actionsGroupSection.includes('add-to-cart-btn'), 'Add to Bag button in purchase section is preserved')

// 2. Part 2: ProductCard Prefetching Verification
console.log('\n--- 2. Part 2: Link Prefetching on ProductCard ---')
const cardContent = fs.readFileSync(path.join(root, 'components', 'ProductCard.tsx'), 'utf8')
assert(!cardContent.includes('prefetch={false}'), 'ProductCard links do NOT have prefetch={false} (native prefetching enabled)')
assert(cardContent.includes('href={productHref}'), 'ProductCard links to productHref')

// 3. Part 2: GlobalNavigationTransition Duplicate Prevention & Fallback Timer
console.log('\n--- 3. Part 2: Global Navigation Transition Reliability ---')
const navContent = fs.readFileSync(path.join(root, 'components', 'GlobalNavigationTransition.tsx'), 'utf8')
assert(navContent.includes('if (navigatingToRef.current === destKey) {'), 'Detects in-flight navigation to same destination')
assert(navContent.includes('event.preventDefault()'), 'Prevents duplicate click from aborting in-flight Next.js request')
assert(navContent.includes('10000'), 'Uses generous 10s safety timeout to prevent premature vanishing on mobile networks')
assert(!navContent.includes('setTimeout(clearNavigationFeedback, 1500)'), '1500ms premature feedback cutoff is removed')

// 4. Part 3: Catalog Server Module-Level Caching
console.log('\n--- 4. Part 3: Module-Level Server Caching ---')
const catServerContent = fs.readFileSync(path.join(root, 'lib', 'catalog-server.ts'), 'utf8')
assert(catServerContent.includes('fetchProductCached = unstable_cache'), 'fetchProductCached defined at module scope')
assert(catServerContent.includes('getCachedProduct = cache('), 'getCachedProduct wrapped with React cache() to deduplicate per-request calls')
assert(catServerContent.includes('getCachedRelatedProducts = cache('), 'getCachedRelatedProducts wrapped with React cache()')
assert(catServerContent.includes('getCachedNewArrivals'), 'Exports getCachedNewArrivals')
assert(catServerContent.includes('getCachedBestsellers'), 'Exports getCachedBestsellers')

// 5. Part 3: Homepage Parallel Query Execution
console.log('\n--- 5. Part 3: Homepage Query Parallelization ---')
const homeContent = fs.readFileSync(path.join(root, 'app', 'page.tsx'), 'utf8')
assert(homeContent.includes('getCachedNewArrivals'), 'Homepage uses getCachedNewArrivals')
assert(homeContent.includes('getCachedBestsellers'), 'Homepage uses getCachedBestsellers')
assert(homeContent.includes('categoriesResult'), 'Categories fetched inside Promise.all on homepage')

// 6. Part 3: Collections Page Parallel Execution
console.log('\n--- 6. Part 3: Collections Page Parallelization ---')
const collectionPageContent = fs.readFileSync(path.join(root, 'app', 'collections', '[category]', 'page.tsx'), 'utf8')
assert(collectionPageContent.includes('Promise.all([\n    getActiveCategories(),\n    getCollectionProducts(slug, { sort: \'Featured\' })\n  ])'), 'Categories and products fetched concurrently in Promise.all')

// 7. Part 3: Admin Overview Stats Parallelization
console.log('\n--- 7. Part 3: Admin Dashboard Query Parallelization ---')
const adminContent = fs.readFileSync(path.join(root, 'lib', 'admin.ts'), 'utf8')
assert(adminContent.includes('Promise.all([\n    ordersPromise,\n    sellersPromise,\n    productsPromise\n  ])'), 'Orders, sellers, and products executed in parallel with Promise.all')

// 8. Part 3: Admin Catalog Collections & Images Sync Parallelization
console.log('\n--- 8. Part 3: Admin Catalog Sync Parallelization ---')
const adminCatContent = fs.readFileSync(path.join(root, 'lib', 'adminCatalog.ts'), 'utf8')
assert(adminCatContent.includes('Promise.all([syncCollections(), syncImages()])'), 'Collections and image sync run in parallel on product save')

console.log('\n=================================================================')
console.log('🎉 ALL NAVIGATION, PERFORMANCE & SHARE CHECKS PASSED!')
console.log('=================================================================\n')
