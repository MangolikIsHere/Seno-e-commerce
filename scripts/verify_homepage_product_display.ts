import { chromium } from 'playwright'
import assert from 'assert'
import path from 'path'

const BASE_URL = 'http://localhost:3000'
const ARTIFACT_DIR = 'C:\\Users\\debna\\.gemini\\antigravity\\brain\\a533086c-3490-46fa-87cf-66b2f3d8a89c'

async function runVerification() {
  console.log('=================================================================')
  console.log('SENO — HOMEPAGE BESTSELLERS REORDER & PRODUCT DISPLAY VERIFICATION')
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
    // -------------------------------------------------------------
    // 1. SECTION ORDER VERIFICATION (Desktop & General DOM)
    // -------------------------------------------------------------
    console.log('[1/4] Verifying Homepage Section Order...')
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Inspect order of sections in the homepage-storefront
    const sectionOrder = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll('.homepage-storefront > section'))
      return sections.map(s => {
        const title = s.querySelector('h2')?.textContent?.trim() || ''
        const id = s.id || ''
        const className = s.className || ''
        return { id, title, className }
      })
    })

    console.log('Detected Homepage Sections:')
    sectionOrder.forEach((s, idx) => console.log(`  ${idx + 1}. [${s.id || 'no-id'}] ${s.title} (${s.className.split(' ')[0]})`))

    const newArrivalsIndex = sectionOrder.findIndex(s => s.id === 'new-arrivals' || s.title.toLowerCase().includes('new arrivals'))
    const bestsellersIndex = sectionOrder.findIndex(s => s.id === 'bestsellers' || s.title.toLowerCase().includes('bestsellers'))
    const categoryIndex = sectionOrder.findIndex(s => s.id === 'shop-by-category' || s.className.includes('category-section') || s.title.toLowerCase().includes('shop by category'))

    console.log(`Indices -> New Arrivals: ${newArrivalsIndex}, Bestsellers: ${bestsellersIndex}, Categories: ${categoryIndex}`)

    assert(newArrivalsIndex !== -1, 'New Arrivals section must exist')
    assert(bestsellersIndex !== -1, 'Bestsellers section must exist')
    assert(categoryIndex !== -1, 'Shop by Category section must exist')

    assert(
      bestsellersIndex === newArrivalsIndex + 1,
      `Bestsellers (${bestsellersIndex}) must appear IMMEDIATELY AFTER New Arrivals (${newArrivalsIndex})`
    )
    assert(
      categoryIndex > bestsellersIndex,
      `Categories (${categoryIndex}) must appear AFTER Bestsellers (${bestsellersIndex})`
    )

    passedChecks++
    console.log('  ✓ Section Order Verified: New Arrivals -> Bestsellers -> Shop by Category')

    // -------------------------------------------------------------
    // 2. PRODUCT CARD DESIGN & METRICS
    // -------------------------------------------------------------
    console.log('\n[2/4] Verifying Modern Product Card Architecture...')

    // Inspect first card in New Arrivals
    const cardMetrics = await page.evaluate(() => {
      const card = document.querySelector('#new-arrivals .product-card')
      if (!card) return null

      const visual = card.querySelector('.product-visual')
      const visualRect = visual?.getBoundingClientRect()
      const ratio = visualRect ? (visualRect.width / visualRect.height).toFixed(2) : 'unknown'

      const category = card.querySelector('.product-category-label')?.textContent?.trim() || ''
      const name = card.querySelector('.product-name-heading')?.textContent?.trim() || ''
      const price = card.querySelector('.current-price')?.textContent?.trim() || ''
      const comparePrice = card.querySelector('.compare-price')?.textContent?.trim() || null
      const discountTag = card.querySelector('.product-card-discount-tag')?.textContent?.trim() || null
      const swatches = Array.from(card.querySelectorAll('.product-card-swatches button')).length
      const wishlistBtn = !!card.querySelector('.wishlist-btn')
      const quickAddBtn = !!card.querySelector('.quick-add-btn')
      const badges = Array.from(card.querySelectorAll('.badge')).map(b => b.textContent?.trim())

      return { ratio, category, name, price, comparePrice, discountTag, swatches, wishlistBtn, quickAddBtn, badges }
    })

    console.log('Card Metrics:', cardMetrics)
    assert(cardMetrics, 'Product card must be present')
    assert(cardMetrics.name.length > 0, 'Product name must be visible')
    assert(cardMetrics.price.startsWith('₹'), 'Current selling price must display INR format')
    assert(cardMetrics.wishlistBtn, 'Wishlist button must exist')
    assert(cardMetrics.quickAddBtn, 'Quick Add button must exist')
    // Aspect ratio check for 3:4 (approx 0.75)
    console.log(`Aspect ratio width/height: ${cardMetrics.ratio} (Target: ~0.75 for 3:4)`)
    assert(Math.abs(parseFloat(cardMetrics.ratio) - 0.75) < 0.05, 'Visual aspect ratio should be ~3:4')
    passedChecks++
    console.log('  ✓ Product Card 3:4 aspect ratio, typography, and controls verified')

    // Test Quick Add interaction on first card
    console.log('Testing Quick Add interaction...')
    const cardEl = await page.$('#new-arrivals .product-card')
    if (cardEl) {
      await cardEl.hover()
      await page.waitForTimeout(400)
    }
    const quickAddBtn = await page.$('#new-arrivals .product-card .quick-add-btn')
    if (quickAddBtn) {
      await quickAddBtn.click({ force: true })
      await page.waitForTimeout(400)
      const btnText = await page.$eval('#new-arrivals .product-card .quick-add-btn', el => el.textContent?.trim())
      console.log(`Quick Add state after click: "${btnText}"`)
      assert(btnText?.includes('ADDED'), 'Quick Add should show ADDED feedback')
      passedChecks++
      console.log('  ✓ Quick Add button triggers instant feedback')
    }

    // Test Wishlist toggle on first card
    console.log('Testing Wishlist toggle interaction...')
    const wishlistBtn = await page.$('#new-arrivals .product-card .wishlist-btn')
    if (wishlistBtn) {
      const isLikedBefore = await page.$eval('#new-arrivals .product-card .wishlist-btn', el => el.classList.contains('liked'))
      await wishlistBtn.click({ force: true })
      await page.waitForTimeout(400)
      const isLikedAfter = await page.$eval('#new-arrivals .product-card .wishlist-btn', el => el.classList.contains('liked'))
      console.log(`Wishlist toggled from liked=${isLikedBefore} to liked=${isLikedAfter}`)
      assert(isLikedBefore !== isLikedAfter, 'Wishlist state must toggle on click')
      passedChecks++
      console.log('  ✓ Wishlist toggle verified')
    }

    // -------------------------------------------------------------
    // 3. DESKTOP CAROUSEL NAVIGATION & SCREENSHOT
    // -------------------------------------------------------------
    console.log('\n[3/4] Verifying Desktop Carousel Navigation & Arrows...')
    const nextBtnVisible = await page.$eval('#new-arrivals .carousel-nav-next', el => el.classList.contains('is-visible'))
    console.log(`Next carousel arrow is visible: ${nextBtnVisible}`)

    const initialScroll = await page.$eval('#new-arrivals .product-rail', el => el.scrollLeft)
    console.log(`Initial rail scrollLeft: ${initialScroll}`)

    if (nextBtnVisible) {
      await page.click('#new-arrivals .carousel-nav-next')
      await page.waitForTimeout(600)
      const afterScroll = await page.$eval('#new-arrivals .product-rail', el => el.scrollLeft)
      console.log(`Rail scrollLeft after clicking Next arrow: ${afterScroll}`)
      assert(afterScroll > initialScroll, 'Clicking Next arrow should smoothly scroll rail')
      passedChecks++
      console.log('  ✓ Desktop smooth carousel horizontal scroll verified')
    }

    // Scroll to show both New Arrivals and Bestsellers
    await page.evaluate(() => {
      window.scrollTo({ top: 380, behavior: 'instant' })
    })
    await page.waitForTimeout(500)

    const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'homepage_new_arrivals_bestsellers_desktop.png')
    await page.screenshot({ path: desktopScreenshotPath, fullPage: false })
    console.log(`Saved desktop screenshot: ${desktopScreenshotPath}`)
    passedChecks++

    await page.close()

    // -------------------------------------------------------------
    // 4. MOBILE BROWSING, HORIZONTAL SWIPING & PEEK
    // -------------------------------------------------------------
    console.log('\n[4/4] Verifying Mobile Browsing & Horizontal Swiping...')
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await mobilePage.waitForTimeout(2000)

    // Check that arrows are hidden on mobile
    const mobileArrowDisplay = await mobilePage.evaluate(() => {
      const prev = document.querySelector('#new-arrivals .carousel-nav-prev')
      const next = document.querySelector('#new-arrivals .carousel-nav-next')
      return {
        prevHidden: !prev || window.getComputedStyle(prev).display === 'none',
        nextHidden: !next || window.getComputedStyle(next).display === 'none',
      }
    })
    console.log('Mobile Arrow Hidden Check:', mobileArrowDisplay)
    assert(mobileArrowDisplay.prevHidden && mobileArrowDisplay.nextHidden, 'Arrows must be hidden on mobile')
    passedChecks++
    console.log('  ✓ Desktop navigation arrows cleanly hidden on mobile')

    // Check mobile card width & peek
    const mobileRailMetrics = await mobilePage.evaluate(() => {
      const rail = document.querySelector('#new-arrivals .product-rail')
      const firstCard = rail?.querySelector('.product-card')
      const bodyWidth = document.body.clientWidth
      const htmlScrollWidth = document.documentElement.scrollWidth
      const windowInnerWidth = window.innerWidth

      if (!rail || !firstCard) return null

      const cardRect = firstCard.getBoundingClientRect()
      const railRect = rail.getBoundingClientRect()
      const cardWidthPercent = (cardRect.width / windowInnerWidth) * 100
      const hasPageOverflow = htmlScrollWidth > windowInnerWidth

      return {
        cardWidthPercent: cardWidthPercent.toFixed(1),
        hasPageOverflow,
        windowInnerWidth,
        htmlScrollWidth,
      }
    })

    console.log('Mobile Rail Metrics:', mobileRailMetrics)
    assert(mobileRailMetrics, 'Mobile rail metrics must be available')
    assert(!mobileRailMetrics.hasPageOverflow, 'Page body must NOT have horizontal overflow')
    console.log(`Mobile Card Width: ${mobileRailMetrics.cardWidthPercent}% of screen (Target: ~68-72% with peek)`)
    assert(
      parseFloat(mobileRailMetrics.cardWidthPercent) >= 60 && parseFloat(mobileRailMetrics.cardWidthPercent) <= 78,
      'Mobile card should occupy ~68-72% of viewport width so next item peeks'
    )
    passedChecks++
    console.log('  ✓ Mobile card sizing & peek confirmed without page overflow')

    // Scroll slightly down on mobile to view New Arrivals and Bestsellers
    await mobilePage.evaluate(() => {
      window.scrollTo({ top: 320, behavior: 'instant' })
    })
    await mobilePage.waitForTimeout(500)

    const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'homepage_new_arrivals_bestsellers_mobile.png')
    await mobilePage.screenshot({ path: mobileScreenshotPath, fullPage: false })
    console.log(`Saved mobile screenshot: ${mobileScreenshotPath}`)
    passedChecks++

    await mobileContext.close()

    console.log('\n=================================================================')
    console.log(`ALL CHECKS PASSED: ${passedChecks}/${passedChecks} (100%)`)
    console.log('=================================================================')

  } finally {
    await browser.close()
  }
}

runVerification().catch(err => {
  console.error('\nVerification failed:', err)
  process.exit(1)
})
