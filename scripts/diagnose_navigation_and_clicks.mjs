import { chromium } from 'playwright'

async function runDiagnostics() {
  console.log('=================================================================')
  console.log('SENO DIAGNOSTIC SUITE: INTERMITTENT CLICKS & NAVIGATION FAILURES')
  console.log('=================================================================\n')

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
  })

  const page = await context.newPage()

  const consoleLogs = []
  const networkRequests = []
  const clickTraces = []

  // Capture all browser console messages
  page.on('console', (msg) => {
    const text = msg.text()
    const type = msg.type()
    consoleLogs.push({ type, text, location: msg.location() })
    if (type === 'error' || text.toLowerCase().includes('error') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('hydration')) {
      console.log(`[Browser Console ${type.toUpperCase()}]:`, text)
    }
  })

  page.on('pageerror', (err) => {
    consoleLogs.push({ type: 'pageerror', text: err.message, stack: err.stack })
    console.error('[Page Uncaught Error]:', err.message)
  })

  // Capture all network activity
  page.on('request', (req) => {
    networkRequests.push({
      url: req.url(),
      method: req.method(),
      headers: req.headers(),
      resourceType: req.resourceType(),
      time: Date.now()
    })
  })

  page.on('requestfailed', (req) => {
    console.error(`[Network Request Failed]: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
  })

  page.on('response', (res) => {
    if (res.status() >= 400) {
      console.warn(`[Network HTTP ${res.status()}]: ${res.request().method()} ${res.url()}`)
    }
  })

  // Inject deep client click and navigation instrumentation
  await page.addInitScript(() => {
    window.__senoDiagnostics = {
      clicks: [],
      historyChanges: [],
      preventedClicks: [],
      lastClick: null
    }

    const recordEvent = (phase, e) => {
      const target = e.target
      const anchor = target?.closest ? target.closest('a') : null
      const button = target?.closest ? target.closest('button') : null
      const trace = {
        phase,
        time: performance.now(),
        type: e.type,
        defaultPrevented: e.defaultPrevented,
        targetTag: target?.tagName,
        targetClass: target?.className,
        anchorHref: anchor?.getAttribute('href'),
        buttonTag: button?.tagName,
        buttonClass: button?.className,
        buttonAria: button?.getAttribute('aria-label')
      }
      window.__senoDiagnostics.clicks.push(trace)
      window.__senoDiagnostics.lastClick = trace
      if (e.defaultPrevented) {
        window.__senoDiagnostics.preventedClicks.push(trace)
      }
    }

    // Capture phase
    document.addEventListener('click', (e) => recordEvent('capture', e), true)
    // Bubble phase
    document.addEventListener('click', (e) => recordEvent('bubble', e), false)

    // History API instrumentation
    const origPushState = history.pushState
    history.pushState = function(...args) {
      window.__senoDiagnostics.historyChanges.push({ type: 'pushState', url: args[2], time: performance.now() })
      return origPushState.apply(this, args)
    }

    const origReplaceState = history.replaceState
    history.replaceState = function(...args) {
      window.__senoDiagnostics.historyChanges.push({ type: 'replaceState', url: args[2], time: performance.now() })
      return origReplaceState.apply(this, args)
    }
  })

  console.log('1. Loading Home Page (http://localhost:3000)...')
  const startTime = Date.now()
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  console.log(`DOM Content Loaded in ${Date.now() - startTime}ms`)

  // Wait for React hydration
  await page.waitForTimeout(1500)
  console.log('Initial page load settled.')

  // Inspect HTML nesting violations in the DOM
  console.log('\n--- AUDITING DOM FOR NESTED INTERACTIVE ELEMENTS ---')
  const nestingViolations = await page.evaluate(() => {
    const results = []
    const anchors = Array.from(document.querySelectorAll('a'))
    for (const a of anchors) {
      const nestedButtons = Array.from(a.querySelectorAll('button'))
      const nestedAnchors = Array.from(a.querySelectorAll('a'))
      if (nestedButtons.length > 0 || nestedAnchors.length > 0) {
        results.push({
          anchorHref: a.getAttribute('href'),
          anchorClass: a.className,
          nestedButtons: nestedButtons.map(b => ({
            class: b.className,
            text: b.innerText.trim(),
            aria: b.getAttribute('aria-label')
          })),
          nestedAnchors: nestedAnchors.map(na => na.getAttribute('href'))
        })
      }
    }
    return results
  })

  console.log(`Found ${nestingViolations.length} interactive nesting violations in DOM:`)
  for (const v of nestingViolations) {
    console.log(`  - <a> href="${v.anchorHref}" class="${v.anchorClass}" has:`)
    if (v.nestedButtons.length) console.log(`      Buttons:`, JSON.stringify(v.nestedButtons))
    if (v.nestedAnchors.length) console.log(`      Anchors:`, JSON.stringify(v.nestedAnchors))
  }

  // TEST 1: Click on Product Card visual wrapper (image)
  console.log('\n--- TEST 1: CLICKING PRODUCT CARD IMAGE ---')
  const firstProductCard = page.locator('.product-card').first()
  if (await firstProductCard.count() > 0) {
    const initialUrl = page.url()
    const productLink = firstProductCard.locator('.product-visual-wrapper')
    const targetHref = await productLink.getAttribute('href')
    console.log(`Target product href: ${targetHref}`)

    // Click in middle of image
    await productLink.click({ position: { x: 50, y: 50 } })
    await page.waitForTimeout(1000)

    const newUrl = page.url()
    console.log(`URL after clicking image: ${newUrl}`)
    const navigated = newUrl.includes(targetHref)
    console.log(`Navigation Result: ${navigated ? 'SUCCESS' : 'FAILED (Remained on same page)'}`)

    // Return to home
    if (navigated) {
      await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)
    }
  }

  // TEST 2: Click on Product Card Quick-Add and Wishlist (Nested buttons)
  console.log('\n--- TEST 2: INTERACTION WITH NESTED BUTTONS IN PRODUCT CARD ---')
  const card = page.locator('.product-card').first()
  if (await card.count() > 0) {
    const wishlistBtn = card.locator('.wishlist-btn')
    const quickAddBtn = card.locator('.quick-add-btn')

    if (await wishlistBtn.count() > 0) {
      console.log('Testing Wishlist Button click...')
      const urlBefore = page.url()
      await wishlistBtn.click()
      await page.waitForTimeout(500)
      console.log(`URL after wishlist click: ${page.url()} (should be unchanged: ${page.url() === urlBefore})`)
    }

    if (await quickAddBtn.count() > 0) {
      console.log('Testing Quick Add Button click...')
      const urlBefore = page.url()
      await quickAddBtn.click()
      await page.waitForTimeout(500)
      console.log(`URL after quick-add click: ${page.url()} (should be unchanged: ${page.url() === urlBefore})`)
    }
  }

  // TEST 3: Click on Product Card Title (Text link)
  console.log('\n--- TEST 3: CLICKING PRODUCT CARD TITLE ---')
  const productTitleLink = page.locator('.product-card').first().locator('.product-details-info a').first()
  if (await productTitleLink.count() > 0) {
    const href = await productTitleLink.getAttribute('href')
    console.log(`Target title href: ${href}`)
    await productTitleLink.click()
    await page.waitForTimeout(1000)
    console.log(`URL after clicking title: ${page.url()}`)
    const navigated = page.url().includes(href)
    console.log(`Navigation Result: ${navigated ? 'SUCCESS' : 'FAILED'}`)
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1000)
  }

  // TEST 4: Header Navigation Links (ALL PRODUCTS, NEW ARRIVALS, OFFERS)
  console.log('\n--- TEST 4: HEADER NAVIGATION LINKS ---')
  const navLinks = ['ALL PRODUCTS', 'NEW ARRIVALS']
  for (const label of navLinks) {
    const link = page.locator(`header nav a:has-text("${label}")`).first()
    if (await link.count() > 0) {
      const href = await link.getAttribute('href')
      console.log(`Clicking header link "${label}" -> ${href}`)
      await link.click()
      await page.waitForTimeout(1000)
      console.log(`Current URL: ${page.url()} (expected: ${href})`)
    }
  }

  // TEST 5: Header Action Buttons (Search modal, Cart drawer)
  console.log('\n--- TEST 5: HEADER ACTION BUTTONS (SEARCH & CART) ---')
  const searchBtn = page.locator('.search-trigger-btn').first()
  if (await searchBtn.count() > 0) {
    console.log('Clicking SEARCH button in header...')
    await searchBtn.click()
    await page.waitForTimeout(400)
    const searchModalVisible = await page.locator('.search-modal-backdrop').isVisible()
    console.log(`Search Modal Visible: ${searchModalVisible}`)
    if (searchModalVisible) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  }

  const cartBtn = page.locator('header button:has-text("CART")').first()
  if (await cartBtn.count() > 0) {
    console.log('Clicking CART button in header...')
    await cartBtn.click()
    await page.waitForTimeout(400)
    const cartDrawerVisible = await page.locator('.cart-modal-backdrop').isVisible()
    console.log(`Cart Drawer Visible: ${cartDrawerVisible}`)
    if (cartDrawerVisible) {
      await page.locator('.cart-drawer-header .close-btn').click()
      await page.waitForTimeout(300)
    }
  }

  // TEST 6: Mobile Navigation & Bottom Bar (Simulate Mobile Viewport)
  console.log('\n--- TEST 6: MOBILE VIEWPORT INTERACTIVITY ---')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1000)

  // Mobile Bottom Nav items
  const mobileNavItems = ['Categories', 'Search', 'Cart', 'Account']
  for (const item of mobileNavItems) {
    const btn = page.locator(`.mobile-bottom-nav .bottom-nav-item:has-text("${item}")`)
    if (await btn.count() > 0) {
      console.log(`Clicking mobile bottom nav "${item}"...`)
      await btn.click()
      await page.waitForTimeout(800)
      console.log(`Resulting URL / State: ${page.url()}`)
      if (item === 'Search') {
        const searchOpen = await page.locator('.search-modal-backdrop').isVisible()
        console.log(`Mobile Search Modal Open: ${searchOpen}`)
        if (searchOpen) await page.keyboard.press('Escape')
      }
    }
  }

  // Mobile Hamburger Menu
  console.log('Testing Mobile Hamburger button...')
  const hamburger = page.locator('.header-nav-hamburger')
  if (await hamburger.count() > 0) {
    await hamburger.click()
    await page.waitForTimeout(500)
    const drawerOpen = await page.locator('.mobile-menu-overlay').isVisible()
    console.log(`Mobile Drawer Open: ${drawerOpen}`)
    if (drawerOpen) {
      const drawerLink = page.locator('.mobile-drawer-link').first()
      const dHref = await drawerLink.getAttribute('href')
      console.log(`Clicking first drawer link -> ${dHref}`)
      await drawerLink.click()
      await page.waitForTimeout(1000)
      console.log(`URL after drawer link click: ${page.url()}`)
    }
  }

  // Summary of diagnostic logs
  const clientDiagnostics = await page.evaluate(() => window.__senoDiagnostics)
  console.log('\n--- DIAGNOSTIC EVENT SUMMARY ---')
  console.log(`Total captured clicks: ${clientDiagnostics?.clicks?.length || 0}`)
  console.log(`Total prevented clicks: ${clientDiagnostics?.preventedClicks?.length || 0}`)
  console.log(`Total history changes: ${clientDiagnostics?.historyChanges?.length || 0}`)

  await browser.close()
  console.log('\nDiagnostics complete!')
}

runDiagnostics().catch(err => {
  console.error('Diagnostic error:', err)
  process.exit(1)
})
