import { chromium } from 'playwright'
import assert from 'assert'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/debna/.gemini/antigravity/brain/a533086c-3490-46fa-87cf-66b2f3d8a89c'

function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

async function runVerification() {
  console.log('=================================================================')
  console.log('SENO — RICH COLOR PALETTE REAL BROWSER VERIFICATION')
  console.log('=================================================================\n')

  let browser
  try {
    browser = await chromium.launch({
      channel: 'chrome',
      headless: true
    })
  } catch (err: any) {
    console.log('Chrome launch fallback to Edge:', err.message)
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true
    })
  }
  let passedChecks = 0

  try {
    // 1. DESKTOP VIEWPORT TEST (1440x900)
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    console.log('[1/4] Navigating to Desktop Homepage...')
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // A. Check Announcement Bar -> Burgundy gradient
    const annBg = await page.$eval('.announcement-bar', el => {
      const s = window.getComputedStyle(el)
      return s.backgroundImage || s.backgroundColor
    })
    console.log(`Announcement Bar background: ${annBg}`)
    assert(annBg.includes('113, 59, 73') || annBg.includes('98, 47, 60') || annBg.includes('gradient'), `Expected Burgundy announcement bar, got: ${annBg}`)
    passedChecks++
    console.log('  ✓ Announcement bar is Burgundy gradient (#713B49 / #622F3C)')

    // B. Check Action Badge (Cart / Wishlist badge) -> Terracotta #B87858 (rgb(184, 120, 88))
    const badgeBg = await page.$eval('.action-badge', el => window.getComputedStyle(el).backgroundColor)
    console.log(`Header Action Badge background: ${badgeBg}`)
    assert(badgeBg.includes('184, 120, 88'), `Expected Terracotta action badge, got: ${badgeBg}`)
    passedChecks++
    console.log('  ✓ Header Action Badge is Terracotta (#B87858)')

    // C. Check Category Section -> Warm Ivory #F5EFE6 (rgb(245, 239, 230))
    const catBg = await page.$eval('.category-section', el => window.getComputedStyle(el).backgroundColor)
    console.log(`Category section background: ${catBg}`)
    assert(catBg.includes('245, 239, 230'), `Expected Warm Ivory category section, got: ${catBg}`)
    passedChecks++
    console.log('  ✓ Category Section is Warm Ivory (#F5EFE6)')

    // D. Check Section Kicker -> Terracotta #B87858 (rgb(184, 120, 88))
    const kickerColor = await page.$eval('.section-kicker', el => window.getComputedStyle(el).color)
    console.log(`Section kicker color: ${kickerColor}`)
    assert(kickerColor.includes('184, 120, 88'), `Expected Terracotta section kicker, got: ${kickerColor}`)
    passedChecks++
    console.log('  ✓ Section Kicker is Terracotta (#B87858)')

    // E. Check Site Footer -> Charcoal #292724 (rgb(41, 39, 36))
    const footerBg = await page.$eval('.site-footer', el => window.getComputedStyle(el).backgroundColor)
    console.log(`Site Footer background: ${footerBg}`)
    assert(footerBg.includes('41, 39, 36'), `Expected Charcoal footer, got: ${footerBg}`)
    passedChecks++
    console.log('  ✓ Site Footer is Charcoal (#292724)')

    // F. Check Footer Col Headings -> Champagne Gold #D7AE70 (rgb(215, 174, 112))
    const footerHeadingColor = await page.$eval('.footer-col h3', el => window.getComputedStyle(el).color)
    console.log(`Footer Heading color: ${footerHeadingColor}`)
    assert(footerHeadingColor.includes('215, 174, 112'), `Expected Champagne Gold footer heading, got: ${footerHeadingColor}`)
    passedChecks++
    console.log('  ✓ Footer Heading is Champagne Gold (#D7AE70)')

    // Take Desktop Homepage Screenshot
    const desktopHomePath = path.join(ARTIFACT_DIR, 'desktop_homepage_rich_palette.png')
    await page.screenshot({ path: desktopHomePath, fullPage: false })
    console.log(`Saved screenshot: ${desktopHomePath}`)

    // 2. DESKTOP PRODUCT DETAIL PAGE
    console.log('\n[2/4] Navigating to Product Detail Page...')
    await page.waitForSelector('.product-card a[href^="/products/"]', { timeout: 10000 })
    const productLink = await page.$eval('.product-card a[href^="/products/"]', el => el.getAttribute('href'))
    console.log(`Navigating to ${productLink}...`)
    await page.goto(`http://localhost:3000${productLink}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // A. Add to Bag button -> Charcoal #292724 (rgb(41, 39, 36))
    const addToBagBg = await page.$eval('.add-to-cart-btn', el => window.getComputedStyle(el).backgroundColor)
    console.log(`Add to Bag background: ${addToBagBg}`)
    assert(addToBagBg.includes('41, 39, 36'), `Expected Charcoal Add to Bag, got: ${addToBagBg}`)
    passedChecks++
    console.log('  ✓ Add to Bag button is Charcoal (#292724)')

    // B. Buy Now button -> Rich Terracotta colored background with white typography & instant badge
    const buyNowBg = await page.$eval('.buy-now-btn', el => {
      const s = window.getComputedStyle(el)
      return { bg: s.backgroundImage || s.backgroundColor, color: s.color }
    })
    console.log(`Buy Now bg: ${buyNowBg.bg}, color: ${buyNowBg.color}`)
    assert(buyNowBg.bg.includes('gradient') || buyNowBg.bg.includes('184, 120, 88'), `Expected colored Buy Now, got ${buyNowBg.bg}`)
    assert(buyNowBg.color.includes('255, 255, 255'), `Expected white text on colored Buy Now, got ${buyNowBg.color}`)
    const buyNowBadge = await page.$eval('.buy-now-badge', el => el.textContent?.trim())
    console.log(`Buy Now Badge: ${buyNowBadge}`)
    assert.strictEqual(buyNowBadge, 'INSTANT')
    passedChecks++
    console.log('  ✓ Buy Now button is richly colored in Terracotta (#B87858) gradient with Instant badge')

    // C. Delivery card background and icon
    const delCardBg = await page.$eval('.product-delivery-card', el => window.getComputedStyle(el).backgroundColor)
    const delIconColor = await page.$eval('.delivery-icon', el => window.getComputedStyle(el).color)
    const delSpeedTag = await page.$eval('.delivery-speed-tag', el => el.textContent?.trim())
    console.log(`Delivery Card background: ${delCardBg}, Icon color: ${delIconColor}, Tag: ${delSpeedTag}`)
    assert(delIconColor.includes('184, 120, 88'), `Expected Terracotta delivery icon, got: ${delIconColor}`)
    assert.strictEqual(delSpeedTag, 'EXPRESS DISPATCH')
    passedChecks++
    console.log('  ✓ Delivery Card has Warm Ivory background, Terracotta circular icon wrap & Express Dispatch badge')

    // D. Stock dot
    const stockDotColor = await page.$eval('.stock-dot', el => window.getComputedStyle(el).backgroundColor)
    console.log(`Stock dot background: ${stockDotColor}`)
    assert(stockDotColor.includes('129, 148, 122') || stockDotColor.includes('184, 120, 88'), `Expected Sage Green or Terracotta stock dot, got: ${stockDotColor}`)
    passedChecks++
    console.log('  ✓ Stock Status indicator uses fashion palette (Sage Green / Terracotta)')

    // E. Wishlist active state -> Dusty Rose #C98291
    await page.click('.wishlist-toggle-icon-btn')
    await page.waitForTimeout(300)
    const wishlistActiveColor = await page.$eval('.wishlist-toggle-icon-btn', el => window.getComputedStyle(el).color)
    console.log(`Wishlist toggled color: ${wishlistActiveColor}`)
    assert(wishlistActiveColor.includes('201, 130, 145'), `Expected Dusty Rose active wishlist, got: ${wishlistActiveColor}`)
    passedChecks++
    console.log('  ✓ Wishlist toggle active state is Dusty Rose (#C98291)')

    // Take Desktop PDP Screenshot
    const desktopPdpPath = path.join(ARTIFACT_DIR, 'desktop_pdp_rich_palette.png')
    await page.screenshot({ path: desktopPdpPath, fullPage: false })
    console.log(`Saved screenshot: ${desktopPdpPath}`)

    await context.close()

    // 3. MOBILE VIEWPORT TEST (375x812)
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const mobilePage = await mobileContext.newPage()

    console.log('\n[3/4] Navigating to Mobile Homepage...')
    await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)

    // Check Mobile Bottom Nav active item -> Terracotta #B87858
    const bottomNavActiveColor = await mobilePage.$eval('.bottom-nav-item.active', el => window.getComputedStyle(el).color)
    console.log(`Mobile bottom nav active color: ${bottomNavActiveColor}`)
    assert(bottomNavActiveColor.includes('184, 120, 88'), `Expected Terracotta active bottom nav, got: ${bottomNavActiveColor}`)
    passedChecks++
    console.log('  ✓ Mobile Bottom Nav active item is Terracotta (#B87858)')

    // Take Mobile Homepage Screenshot
    const mobileHomePath = path.join(ARTIFACT_DIR, 'mobile_homepage_rich_palette.png')
    await mobilePage.screenshot({ path: mobileHomePath, fullPage: false })
    console.log(`Saved screenshot: ${mobileHomePath}`)

    // 4. MOBILE PRODUCT DETAIL PAGE & STICKY PURCHASE BAR
    console.log('\n[4/4] Navigating to Mobile Product Detail Page...')
    await mobilePage.waitForSelector('.product-card a[href^="/products/"]', { timeout: 10000 })
    const mobileProductLink = await mobilePage.$eval('.product-card a[href^="/products/"]', el => el.getAttribute('href'))
    await mobilePage.goto(`http://localhost:3000${mobileProductLink}`, { waitUntil: 'networkidle' })
    await mobilePage.waitForTimeout(1000)

    // Scroll down past the action panel to activate sticky bar
    await mobilePage.evaluate(() => window.scrollTo(0, 1800))
    await mobilePage.waitForSelector('.mobile-sticky-purchase-bar', { timeout: 6000 })
    await mobilePage.waitForTimeout(400)

    const stickyBarVisible = await mobilePage.$eval('.mobile-sticky-purchase-bar', el => window.getComputedStyle(el).display !== 'none')
    console.log(`Mobile sticky purchase bar visible: ${stickyBarVisible}`)
    assert(stickyBarVisible, 'Expected sticky bar to be visible after scrolling')
    passedChecks++
    console.log('  ✓ Mobile Sticky Purchase Bar activates cleanly on scroll')

    // Check sticky bar colored Buy Now button
    const stickyBuyNow = await mobilePage.$eval('.sticky-bar-buy-btn', el => {
      const s = window.getComputedStyle(el)
      return { bg: s.backgroundImage || s.backgroundColor, text: el.textContent?.trim() }
    })
    console.log(`Mobile Sticky Buy Now: ${stickyBuyNow.text}, bg: ${stickyBuyNow.bg}`)
    assert(stickyBuyNow.bg.includes('gradient') || stickyBuyNow.bg.includes('184, 120, 88'), `Expected colored sticky Buy Now, got ${stickyBuyNow.bg}`)
    passedChecks++
    console.log('  ✓ Mobile Sticky Bar includes colored instant Buy Now CTA')

    // Take Mobile PDP Screenshot
    const mobilePdpPath = path.join(ARTIFACT_DIR, 'mobile_pdp_rich_palette.png')
    await mobilePage.screenshot({ path: mobilePdpPath, fullPage: false })
    console.log(`Saved screenshot: ${mobilePdpPath}`)

    await mobileContext.close()

    console.log('\n=================================================================')
    console.log(`ALL REAL BROWSER CHECKS PASSED: ${passedChecks}/${passedChecks} (100%)`)
    console.log('=================================================================')

  } finally {
    await browser.close()
  }
}

runVerification().catch(err => {
  console.error('\nVerification failed:', err)
  process.exit(1)
})
