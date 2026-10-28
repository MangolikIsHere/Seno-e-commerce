import { chromium } from 'playwright'

async function testClickTiming() {
  console.log('=== SENO CLICK & NAVIGATION INTERACTION TIMING INVESTIGATION ===\n')

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  })

  const page = await context.newPage()

  // Track console and page errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[Browser Console ERROR]: ${msg.text()}`)
    }
  })
  page.on('pageerror', err => {
    console.log(`[Uncaught Page Error]: ${err.message}`)
  })

  // Deep instrumentation injected before any script runs
  await page.addInitScript(() => {
    window.__senoClickEvents = []

    function logEvent(name, e) {
      const now = performance.now()
      const target = e.target
      const anchor = target?.closest ? target.closest('a') : null
      const button = target?.closest ? target.closest('button') : null
      const record = {
        eventName: name,
        time: now,
        tag: target?.tagName,
        className: target?.className,
        href: anchor?.getAttribute('href') || null,
        ariaLabel: (button || target)?.getAttribute('aria-label') || null,
        defaultPrevented: e.defaultPrevented,
        isTrusted: e.isTrusted
      }
      window.__senoClickEvents.push(record)
      console.log(`[DOM Event ${name}] at ${now.toFixed(1)}ms: <${record.tag}> href=${record.href}`)
    }

    window.addEventListener('pointerdown', e => logEvent('pointerdown', e), true)
    window.addEventListener('mousedown', e => logEvent('mousedown', e), true)
    window.addEventListener('mouseup', e => logEvent('mouseup', e), true)
    window.addEventListener('click', e => logEvent('click-capture', e), true)
    window.addEventListener('click', e => logEvent('click-bubble', e), false)
  })

  // TEST SCENARIO A: Rapid click right at DOMContentLoaded (before full settling)
  console.log('--- SCENARIO A: Click IMMEDIATELY upon DOMContentLoaded ---')
  const gotoPromise = page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  await gotoPromise
  console.log('DOM Content Loaded. Attempting immediate click on Header "ALL PRODUCTS"...')

  const navLink = page.locator('header nav a:has-text("ALL PRODUCTS")').first()
  const clickStart = Date.now()

  try {
    // Click with no wait
    await navLink.click({ timeout: 3000, noWaitAfter: true })
    console.log(`Click dispatched at ${Date.now() - clickStart}ms`)
  } catch (err) {
    console.log(`Immediate click failed or timed out: ${err.message}`)
  }

  // Observe URL over next 3 seconds
  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(500)
    console.log(`  +${i * 500}ms URL: ${page.url()}`)
  }

  // Check event log from browser
  const eventsA = await page.evaluate(() => window.__senoClickEvents)
  console.log(`Scenario A events recorded:`, JSON.stringify(eventsA, null, 2))

  // TEST SCENARIO B: Click after settling (Hydration complete)
  console.log('\n--- SCENARIO B: Click AFTER full settling (Hydration settled) ---')
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' })
  await page.waitForTimeout(1000)
  console.log('Page networkidle + 1000ms. Attempting click on Header "NEW ARRIVALS"...')

  await page.evaluate(() => { window.__senoClickEvents = [] })

  const newArrivalsLink = page.locator('header nav a:has-text("NEW ARRIVALS")').first()
  await newArrivalsLink.click({ noWaitAfter: true })

  for (let i = 1; i <= 6; i++) {
    await page.waitForTimeout(500)
    console.log(`  +${i * 500}ms URL: ${page.url()}`)
  }

  const eventsB = await page.evaluate(() => window.__senoClickEvents)
  console.log(`Scenario B events recorded:`, JSON.stringify(eventsB, null, 2))

  // TEST SCENARIO C: Non-navigation interaction (Search button, Cart button, Quick add)
  console.log('\n--- SCENARIO C: Non-Navigation interaction immediately after load vs after settle ---')
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' })
  console.log('DOM Content Loaded. Clicking Search button immediately...')
  await page.evaluate(() => { window.__senoClickEvents = [] })

  const searchBtn = page.locator('.search-trigger-btn').first()
  await searchBtn.click({ timeout: 2000, noWaitAfter: true }).catch(e => console.log('Search click err:', e.message))

  await page.waitForTimeout(300)
  let searchVisible = await page.locator('.search-modal-backdrop').isVisible()
  console.log(`Search modal immediately visible? ${searchVisible}`)

  if (!searchVisible) {
    console.log('Search modal was NOT visible immediately. Waiting 1500ms and clicking again...')
    await page.waitForTimeout(1500)
    await searchBtn.click({ noWaitAfter: true })
    await page.waitForTimeout(300)
    searchVisible = await page.locator('.search-modal-backdrop').isVisible()
    console.log(`Search modal visible after wait + click again? ${searchVisible}`)
  }

  // Close search modal before testing other elements
  if (searchVisible) {
    const closeBtn = page.locator('.search-modal-box .close-btn').first()
    await closeBtn.click()
    await page.waitForTimeout(300)
  }

  // TEST SCENARIO D: Product Card Swatches & Quick Add
  console.log('\n--- SCENARIO D: Product card non-navigation (swatches & quick add) ---')
  const quickAdd = page.locator('.quick-add-btn').first()
  if (await quickAdd.count() > 0) {
    console.log('Clicking Quick Add...')
    await quickAdd.click({ noWaitAfter: true })
    await page.waitForTimeout(600)
    const cartCount = await page.locator('header .action-badge').first().innerText().catch(() => '0')
    console.log(`Cart count after quick add: ${cartCount}`)
  }

  await browser.close()
  console.log('\n=== Investigation run finished ===')
}

testClickTiming().catch(console.error)
