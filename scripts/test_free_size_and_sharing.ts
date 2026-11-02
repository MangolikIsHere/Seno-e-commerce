/**
 * Automated Regression Test Suite:
 * SENO — Product Addition UX Upgrade, Free Size Support & Premium Product Sharing
 */

import { 
  FREE_SIZE_CANONICAL, 
  FREE_SIZE_UPPER, 
  STANDARD_SIZES, 
  isFreeSize, 
  normalizeVariantSize, 
  formatSizeDisplay, 
  getSizeSkuSegment 
} from '../lib/variants-shared'

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`✓ ${message}`)
}

console.log('=== Running SENO Free Size & Sharing Test Suite ===\n')

// 1. Free Size Detection Tests
console.log('--- 1. Free Size Detection & Canonicalization ---')
assert(isFreeSize('Free Size') === true, 'isFreeSize("Free Size") is true')
assert(isFreeSize('free size') === true, 'isFreeSize("free size") is true')
assert(isFreeSize('FREE SIZE') === true, 'isFreeSize("FREE SIZE") is true')
assert(isFreeSize('free-size') === true, 'isFreeSize("free-size") is true')
assert(isFreeSize('One Size') === true, 'isFreeSize("One Size") is true')
assert(isFreeSize('onesize') === true, 'isFreeSize("onesize") is true')
assert(isFreeSize('os') === true, 'isFreeSize("os") is true')
assert(isFreeSize('S') === false, 'isFreeSize("S") is false')
assert(isFreeSize('M') === false, 'isFreeSize("M") is false')
assert(isFreeSize('XL') === false, 'isFreeSize("XL") is false')
assert(isFreeSize('') === false, 'isFreeSize("") is false')
assert(isFreeSize(null) === false, 'isFreeSize(null) is false')
assert(isFreeSize(undefined) === false, 'isFreeSize(undefined) is false')

// 2. Normalization & Display Formatting
console.log('\n--- 2. Normalization & Display Formatting ---')
assert(normalizeVariantSize('free size') === 'Free Size', 'normalizeVariantSize returns canonical "Free Size"')
assert(normalizeVariantSize('FREE SIZE') === 'Free Size', 'normalizeVariantSize("FREE SIZE") returns "Free Size"')
assert(normalizeVariantSize('M') === 'M', 'normalizeVariantSize("M") returns "M"')
assert(formatSizeDisplay('free size') === 'FREE SIZE', 'formatSizeDisplay returns upper "FREE SIZE"')
assert(formatSizeDisplay('Free Size') === 'FREE SIZE', 'formatSizeDisplay("Free Size") returns "FREE SIZE"')
assert(formatSizeDisplay('XL') === 'XL', 'formatSizeDisplay("XL") returns "XL"')

// 3. SKU Segment Generation
console.log('\n--- 3. SKU Segment Generation ---')
assert(getSizeSkuSegment('Free Size') === 'FS', 'getSizeSkuSegment("Free Size") is "FS"')
assert(getSizeSkuSegment('free size') === 'FS', 'getSizeSkuSegment("free size") is "FS"')
assert(getSizeSkuSegment('M') === 'M', 'getSizeSkuSegment("M") is "M"')
assert(getSizeSkuSegment('XXL') === 'XXL', 'getSizeSkuSegment("XXL") is "XXL"')

// 4. Multi-Colour Free Size Matrix
console.log('\n--- 4. Multi-Colour Free Size Matrix Creation ---')
const colours = ['Blue', 'Pink', 'Black']
const baseSlug = 'CROCHET-BAG'
const freeSizeVariants = colours.map((col, idx) => ({
  id: `mock-var-${idx + 1}`,
  colour: col,
  size: FREE_SIZE_CANONICAL,
  sku: `SENO-${baseSlug.slice(0, 4)}-${getSizeSkuSegment(FREE_SIZE_CANONICAL)}-${col.toUpperCase().slice(0, 3)}`,
  quantity: 10 + idx * 5,
  price_override: null,
  is_active: true
}))

assert(freeSizeVariants.length === 3, 'Created 3 colour variants')
assert(freeSizeVariants[0].sku === 'SENO-CROC-FS-BLU', 'Blue Free Size SKU is correct')
assert(freeSizeVariants[1].sku === 'SENO-CROC-FS-PIN', 'Pink Free Size SKU is correct')
assert(freeSizeVariants[2].sku === 'SENO-CROC-FS-BLA', 'Black Free Size SKU is correct')

const skus = new Set(freeSizeVariants.map(v => v.sku))
assert(skus.size === 3, 'All Free Size colour variants have unique SKUs')
assert(freeSizeVariants[0].quantity === 10, 'Blue stock is independent (10)')
assert(freeSizeVariants[1].quantity === 15, 'Pink stock is independent (15)')
assert(freeSizeVariants[2].quantity === 20, 'Black stock is independent (20)')

// 5. Storefront Single Free Size Preselection Logic
console.log('\n--- 5. Product Detail Page Auto-Selection Logic ---')
const onlyFsVariants = [
  { size: 'Free Size', colour: 'Blue', quantity: 5 },
  { size: 'Free Size', colour: 'Pink', quantity: 8 }
]
const isOnlyFreeSize = onlyFsVariants.length > 0 && onlyFsVariants.every(v => isFreeSize(v.size))
assert(isOnlyFreeSize === true, 'Detects product has only Free Size variants')

const mixedVariants = [
  { size: 'S', colour: 'Blue', quantity: 5 },
  { size: 'Free Size', colour: 'Blue', quantity: 5 }
]
const isMixedOnlyFs = mixedVariants.length > 0 && mixedVariants.every(v => isFreeSize(v.size))
assert(isMixedOnlyFs === false, 'Mixed variants correctly identified as not only Free Size')

// 6. Social Sharing Modal & Metadata
console.log('\n--- 6. Social Sharing & WhatsApp Message Construction ---')
const sampleProduct = {
  name: "Handcrafted Women's Crochet Bag",
  slug: 'handcrafted-womens-crochet-bag',
  price: 2499,
  compare_at_price: 3999
}
const siteUrl = 'https://www.seno.co.in'
const canonicalUrl = `${siteUrl}/products/${sampleProduct.slug}`

const discount = sampleProduct.compare_at_price - sampleProduct.price
const discountPct = Math.round((discount / sampleProduct.compare_at_price) * 100)
assert(discountPct === 38, 'Calculated discount percentage is 38%')
assert(discount === 1500, 'Calculated discount savings is ₹1500')

const whatsappMsg = [
  `*${sampleProduct.name}* on SENO`,
  '',
  `Price: ₹${sampleProduct.price.toLocaleString('en-IN')}${sampleProduct.compare_at_price ? ` (MRP: ₹${sampleProduct.compare_at_price.toLocaleString('en-IN')} · ${discountPct}% OFF)` : ''}`,
  'Crafted for refined everyday living.',
  '',
  `Discover piece: ${canonicalUrl}`
].join('\n')

const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMsg)}`
assert(whatsappUrl.includes('https%3A%2F%2Fwww.seno.co.in%2Fproducts%2Fhandcrafted-womens-crochet-bag'), 'WhatsApp URL includes encoded canonical URL')
assert(whatsappUrl.includes('38%25%20OFF'), 'WhatsApp URL includes discount badge')

console.log('\n======================================================')
console.log('🎉 ALL FREE SIZE & SHARING REGRESSION TESTS PASSED!')
console.log('======================================================\n')

