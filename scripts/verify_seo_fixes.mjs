import fs from 'node:fs'

const html = fs.readFileSync('updated_homepage.html', 'utf8')

console.log('=== VERIFYING HOMEPAGE SEO AUDIT FIXES ===\n')

// 1. Check H1 tags
const h1Matches = [...html.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/gi)]
console.log(`[H1 Check] Total H1 tags found: ${h1Matches.length}`)
h1Matches.forEach((m, i) => {
  console.log(`  H1 #${i + 1}: ${m[0].replace(/\s+/g, ' ')}`)
})

if (h1Matches.length === 1) {
  console.log('✅ PASS: Exactly ONE primary H1 tag exists on the homepage.')
} else {
  console.error(`❌ FAIL: Expected 1 H1 tag, found ${h1Matches.length}`)
  process.exit(1)
}

// Check that secondary hero slide uses H2
const heroHeadlines = [...html.matchAll(/<(h[1-6])\b[^>]*class="[^"]*hero-headline[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi)]
console.log(`\n[Hero Slide Headings] Total slides: ${heroHeadlines.length}`)
heroHeadlines.forEach((h, i) => {
  console.log(`  Slide #${i + 1} tag: <${h[1]}> -> "${h[2].trim().replace(/\s+/g, ' ')}"`)
})

if (heroHeadlines.length > 1) {
  if (heroHeadlines[0][1] === 'h1' && heroHeadlines.slice(1).every(h => h[1] === 'h2')) {
    console.log('✅ PASS: Slide 1 uses <h1>, and all secondary slides use <h2>.')
  } else {
    console.error('❌ FAIL: Slide heading hierarchy is incorrect.')
  }
}

// 2. Check all IMG tags
const imgMatches = [...html.matchAll(/<img\b([^>]*)>/gi)]
console.log(`\n[Image Alt Check] Total <img> elements: ${imgMatches.length}`)

let missingAltCount = 0
let emptyAltCount = 0
let validAltCount = 0

imgMatches.forEach((m, i) => {
  const attrs = m[1]
  const hasAltAttr = /\balt\s*=/i.test(attrs)
  const match = attrs.match(/\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
  const alt = hasAltAttr ? (match ? (match[1] ?? match[2] ?? match[3] ?? '') : '') : null
  const src = attrs.match(/src="([^"]*)"/i)?.[1] || 'no-src'
  const cls = attrs.match(/class="([^"]*)"/i)?.[1] || ''

  if (alt === null) {
    missingAltCount++
    console.log(`  ❌ MISSING ALT ATTR: [${i + 1}] class="${cls}" src="${src}"`)
  } else if (alt.trim() === '') {
    emptyAltCount++
    console.log(`  ⚠️ EMPTY ALT: [${i + 1}] class="${cls}" src="${src}"`)
  } else {
    validAltCount++
    console.log(`  ✅ VALID ALT: [${i + 1}] alt="${alt}" | class="${cls}"`)
  }
})

console.log(`\nSummary:`)
console.log(`  Valid Alt Attributes: ${validAltCount}`)
console.log(`  Empty Alt Attributes: ${emptyAltCount}`)
console.log(`  Missing Alt Attributes: ${missingAltCount}`)

if (missingAltCount === 0 && emptyAltCount === 0) {
  console.log('\n🎉 ALL IMAGES HAVE MEANINGFUL, NON-EMPTY ALT ATTRIBUTES!')
} else {
  console.error('\n❌ FAIL: Found images with missing or empty alt attributes.')
  process.exit(1)
}
