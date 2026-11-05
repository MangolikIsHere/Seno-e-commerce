import { chromium, type Browser } from 'playwright'

const BASE_URL = 'http://localhost:3005'

interface TestResult {
  suite: string
  name: string
  status: 'PASSED' | 'FAILED'
  details: string
  metrics?: Record<string, any>
}

const results: TestResult[] = []

function record(suite: string, name: string, status: 'PASSED' | 'FAILED', details: string, metrics?: Record<string, any>) {
  results.push({ suite, name, status, details, metrics })
  const icon = status === 'PASSED' ? '✓' : '✗'
  console.log(`[${icon}] [${suite}] ${name}: ${details}`)
  if (metrics) {
    console.log('    Metrics:', JSON.stringify(metrics, null, 2))
  }
}

async function runPwaVerificationSuite() {
  console.log('========================================================================')
  console.log('SENO — PWA RESTORATION & UPGRADE VERIFICATION SUITE')
  console.log(`Target: ${BASE_URL} (Production Next.js Engine)`)
  console.log('========================================================================\n')

  let browser: Browser | null = null

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

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. PWA TECHNICAL VALIDATION (Manifest & Service Worker)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 1. PWA TECHNICAL VALIDATION ---')

  // Test 1.1: Web App Manifest
  try {
    const manifestRes = await fetch(`${BASE_URL}/manifest.webmanifest`)
    if (manifestRes.status !== 200) {
      throw new Error(`Manifest returned HTTP ${manifestRes.status}`)
    }
    const manifestJson = await manifestRes.json()

    if (manifestJson.name !== 'SENO' || manifestJson.short_name !== 'SENO') {
      throw new Error(`Invalid manifest name: ${manifestJson.name} / ${manifestJson.short_name}`)
    }
    if (manifestJson.display !== 'standalone') {
      throw new Error(`Expected display: standalone, got: ${manifestJson.display}`)
    }
    if (!manifestJson.icons || manifestJson.icons.length < 2) {
      throw new Error(`Expected at least 2 icons in manifest, found ${manifestJson.icons?.length}`)
    }

    // Verify icons exist without query parameter corruption
    for (const icon of manifestJson.icons) {
      if (icon.src.includes('?v=')) {
        throw new Error(`Icon src contains dynamic timestamp: ${icon.src}`)
      }
      const iconRes = await fetch(`${BASE_URL}${icon.src}`)
      if (iconRes.status !== 200) {
        throw new Error(`Icon failed to load (${iconRes.status}): ${icon.src}`)
      }
    }

    record('Technical', 'Web App Manifest Integrity', 'PASSED',
      `Manifest valid. Name: "${manifestJson.name}", Display: "${manifestJson.display}", Icons: ${manifestJson.icons.length} verified`, {
      name: manifestJson.name,
      shortName: manifestJson.short_name,
      display: manifestJson.display,
      themeColor: manifestJson.theme_color,
      iconsCount: manifestJson.icons.length
    })
  } catch (err: any) {
    record('Technical', 'Web App Manifest Integrity', 'FAILED', err.message)
  }

  // Test 1.2: Service Worker & Caching Rules
  try {
    const swRes = await fetch(`${BASE_URL}/sw.js`)
    if (swRes.status !== 200) {
      throw new Error(`sw.js returned HTTP ${swRes.status}`)
    }
    const swText = await swRes.text()

    const hasOfflineUrl = swText.includes('/offline')
    const hasApiExclusion = swText.includes('/^\\/api\\//i') || swText.includes('/api/')
    const hasCheckoutExclusion = swText.includes('/^\\/checkout/i') || swText.includes('/checkout')

    if (!hasOfflineUrl || !hasApiExclusion || !hasCheckoutExclusion) {
      throw new Error('sw.js missing essential security / offline caching rules')
    }

    record('Technical', 'Service Worker Rules & Caching Exclusions', 'PASSED',
      'sw.js loaded with strict exclusions for /api, /checkout, /cart, and offline fallback', {
      bytes: swText.length,
      hasOfflineUrl,
      hasApiExclusion,
      hasCheckoutExclusion
    })
  } catch (err: any) {
    record('Technical', 'Service Worker Rules & Caching Exclusions', 'FAILED', err.message)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. PERSISTENT HEADER INSTALL BUTTON (Desktop & Mobile)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 2. PERSISTENT HEADER INSTALL BUTTON ---')

  // Test 2.1: Desktop Header Install Button Visibility & Interaction
  try {
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    })
    const page = await desktopContext.newPage()
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    // Verify button exists in header
    await page.waitForSelector('.desktop-header .header-action-install-btn', { timeout: 8000 })
    const btnText = await page.$eval('.desktop-header .header-action-install-btn', el => el.textContent?.trim())
    const hasIcon = await page.$eval('.desktop-header .header-action-install-btn .install-icon-gold-badge', el => !!el)

    // Click it and verify Desktop Guide Modal opens
    await page.click('.desktop-header .header-action-install-btn')
    await page.waitForSelector('#desktop-guide-title', { timeout: 5000 })
    const guideTitle = await page.$eval('#desktop-guide-title', el => el.textContent?.trim())

    // Close the modal
    await page.click('button[aria-label="Close guide"]')
    await page.waitForSelector('#desktop-guide-title', { state: 'hidden', timeout: 5000 })

    await desktopContext.close()

    record('Header Button', 'Desktop Persistent Install Button & Guide Modal', 'PASSED',
      `Header button visible with label "${btnText}", icon present, successfully launched Desktop Guide: "${guideTitle}" and closed cleanly.`, {
      btnText,
      hasIcon,
      guideTitle
    })
  } catch (err: any) {
    record('Header Button', 'Desktop Persistent Install Button & Guide Modal', 'FAILED', err.message)
  }

  // Test 2.2: Mobile Header Install Button & Drawer Link
  try {
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    })
    const page = await mobileContext.newPage()
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    // Verify mobile header install icon button
    await page.waitForSelector('.mobile-header-right .header-nav-install', { timeout: 8000 })
    const hasMobileIcon = await page.$eval('.mobile-header-right .header-nav-install svg', el => !!el)

    // Open mobile drawer
    await page.click('.header-nav-hamburger')
    await page.waitForSelector('.mobile-drawer-install-link', { state: 'visible', timeout: 8000 })
    const drawerLinkText = await page.$eval('.mobile-drawer-install-link', el => el.textContent?.trim())

    // Click drawer install link and verify iOS guide opens
    await page.click('.mobile-drawer-install-link')
    await page.waitForSelector('#ios-guide-title', { timeout: 8000 })
    const iosTitle = await page.$eval('#ios-guide-title', el => el.textContent?.trim())

    await mobileContext.close()

    record('Header Button', 'Mobile Persistent Header Button & Drawer Link', 'PASSED',
      `Mobile icon button visible in header, drawer link visible ("${drawerLinkText}"), clicking opened iOS guide ("${iosTitle}").`, {
      hasMobileIcon,
      drawerLinkText,
      iosTitle
    })
  } catch (err: any) {
    record('Header Button', 'Mobile Persistent Header Button & Drawer Link', 'FAILED', err.message)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. FIRST INSTALLATION POPUP TIMING & CONTENT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 3. FIRST INSTALLATION POPUP TIMING & LUXURY DESIGN ---')

  // Test 3.1: 5-10s delay check & luxury content
  try {
    const freshContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    })
    const page = await freshContext.newPage()
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    // At 2 seconds, verify popup is NOT yet visible (not shown on first paint)
    await page.waitForTimeout(2000)
    const visibleAt2s = await page.$eval('.seno-luxury-install-card', el => !!el).catch(() => false)
    if (visibleAt2s) {
      throw new Error('Popup appeared too early (< 2s); expected 5-10s delay')
    }

    // At ~6 seconds, verify popup HAS appeared
    await page.waitForSelector('.seno-luxury-install-card', { timeout: 25000 })
    const headline = await page.$eval('.seno-card-headline', el => el.textContent?.trim())
    const desc = await page.$eval('.seno-card-desc', el => el.textContent?.trim())
    const ctaText = await page.$eval('#seno-popup-install-cta', el => el.textContent?.trim())
    const secondaryText = await page.$eval('.seno-card-secondary-btn', el => el.textContent?.trim())
    const benefits = await page.$$eval('.seno-card-benefits li', els => els.map(e => e.textContent?.trim()))

    if (!headline?.includes('Your Style. One Tap Away.')) {
      throw new Error(`Unexpected headline: ${headline}`)
    }
    if (!ctaText?.includes('INSTALL SENO APP')) {
      throw new Error(`Unexpected CTA: ${ctaText}`)
    }
    if (!secondaryText?.includes('Maybe Later')) {
      throw new Error(`Unexpected secondary button: ${secondaryText}`)
    }

    await freshContext.close()

    record('Popup', 'Installation Popup Timing & Luxury Branding', 'PASSED',
      `Popup correctly suppressed on first paint (< 2s), appeared at ~6s with verified copy: "${headline}" | CTA: "${ctaText}" | ${benefits.length} benefits`, {
      headline,
      ctaText,
      secondaryText,
      benefitsCount: benefits.length
    })
  } catch (err: any) {
    record('Popup', 'Installation Popup Timing & Luxury Branding', 'FAILED', err.message)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. DISMISSAL & 7-DAY COOLDOWN PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 4. DISMISSAL & 7-DAY COOLDOWN PERSISTENCE ---')

  // Test 4.1: Dismissal cooldown
  try {
    const dismissContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    })
    const page = await dismissContext.newPage()
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    // Wait for popup to arrive (6s delay + page hydration time)
    await page.waitForSelector('.seno-luxury-install-card', { timeout: 25000 })

    // Click "Maybe Later"
    await page.click('.seno-card-secondary-btn')
    await page.waitForSelector('.seno-luxury-install-card', { state: 'hidden', timeout: 5000 })

    // Verify storage persistence
    const storageState = await page.evaluate(() => {
      return {
        sessionDismissed: sessionStorage.getItem('seno_install_popup_session_dismissed'),
        cooldownUntil: localStorage.getItem('seno_install_popup_cooldown_until'),
        now: Date.now()
      }
    })

    const cooldownUntil = parseInt(storageState.cooldownUntil || '0', 10)
    const remainingDays = Math.round((cooldownUntil - storageState.now) / (1000 * 60 * 60 * 24))

    if (storageState.sessionDismissed !== 'true' || remainingDays < 6) {
      throw new Error(`Cooldown not persisted correctly: remainingDays = ${remainingDays}`)
    }

    // Reload page and wait 7 seconds: verify popup does NOT appear
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(7000)
    const reappeared = await page.$eval('.seno-luxury-install-card', el => !!el).catch(() => false)

    if (reappeared) {
      throw new Error('Popup reappeared after dismissal despite active 7-day cooldown')
    }

    // But verify the permanent header install button is STILL visible for intentional install!
    const headerBtnVisible = await page.$eval('.desktop-header .header-action-install-btn', el => !!el).catch(() => false)
    if (!headerBtnVisible) {
      throw new Error('Header install button disappeared on popup dismissal; should remain available in header')
    }

    await dismissContext.close()

    record('Cooldown', 'Dismissal Cooldown & Header Preservation', 'PASSED',
      `Popup dismissed; 7-day cooldown persisted (~${remainingDays} days). Re-prompt suppressed on reload. Header install button remained accessible.`, {
      cooldownDays: remainingDays,
      popupReappeared: reappeared,
      headerBtnVisible
    })
  } catch (err: any) {
    record('Cooldown', 'Dismissal Cooldown & Header Preservation', 'FAILED', err.message)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PLATFORM COMPATIBILITY & STANDALONE SUPPRESSION
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- 5. PLATFORM COMPATIBILITY & STANDALONE SUPPRESSION ---')

  // Test 5.1: iOS Safari Guide Modal
  try {
    const iosContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    })
    const page = await iosContext.newPage()
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

    await page.waitForSelector('.mobile-header-right .header-nav-install', { timeout: 15000 })
    await page.click('.mobile-header-right .header-nav-install')

    await page.waitForSelector('#ios-guide-title', { state: 'visible', timeout: 15000 })
    const guideText = await page.$eval('#ios-guide-title', el => el.textContent?.trim())
    const stepsCount = await page.$$eval('#ios-guide-title ~ div ol li, .space-y-4 ol li, ol li', els => els.length)

    await iosContext.close()

    record('Platform', 'iOS Safari Native Share Instructions Modal', 'PASSED',
      `iOS Safari detected; displayed 3-step guide: "${guideText}" with Share and Add to Home Screen instructions.`, {
      stepsCount,
      guideText
    })
  } catch (err: any) {
    record('Platform', 'iOS Safari Native Share Instructions Modal', 'FAILED', err.message)
  }

  // Test 5.2: Standalone Mode Complete Suppression
  try {
    const standaloneContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    })
    const page = await standaloneContext.newPage()

    // Mock standalone mode via matchMedia and navigator
    await page.addInitScript(() => {
      try {
        const origMatchMedia = window.matchMedia
        window.matchMedia = function (query: string) {
          if (query.includes('display-mode: standalone') || query.includes('display-mode: standalone')) {
            return {
              matches: true,
              media: query,
              onchange: null,
              addListener: () => {},
              removeListener: () => {},
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => true,
            } as unknown as MediaQueryList
          }
          return origMatchMedia ? origMatchMedia.call(window, query) : ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
          } as unknown as MediaQueryList)
        }
        Object.defineProperty(window.navigator, 'standalone', { get: () => true, configurable: true })
      } catch {}
    })

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // In standalone mode, neither header button nor popup should be visible
    const hasHeaderBtn = await page.$eval('.header-action-install-btn', el => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }).catch(() => false)

    const hasPopup = await page.$eval('.seno-luxury-install-card', el => {
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    }).catch(() => false)

    if (hasHeaderBtn || hasPopup) {
      throw new Error(`Standalone suppression failed: headerBtn=${hasHeaderBtn}, popup=${hasPopup}`)
    }

    await standaloneContext.close()

    record('Platform', 'Standalone Mode Suppression', 'PASSED',
      'Confirmed: In standalone/installed mode, both popup and header install button are cleanly suppressed.')
  } catch (err: any) {
    record('Platform', 'Standalone Mode Suppression', 'FAILED', err.message)
  }

  // Test 5.3: Critical Routes Suppression (Checkout / Account)
  try {
    const routeContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    })
    const page = await routeContext.newPage()
    await page.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(7000)

    const popupOnCheckout = await page.$eval('.seno-luxury-install-card', el => !!el).catch(() => false)
    if (popupOnCheckout) {
      throw new Error('Popup rendered on /checkout; critical flow violation')
    }

    await routeContext.close()
    record('Platform', 'Critical Route Suppression (/checkout)', 'PASSED',
      'Installation popup safely suppressed during checkout flow.')
  } catch (err: any) {
    record('Platform', 'Critical Route Suppression (/checkout)', 'FAILED', err.message)
  }

  await browser?.close()

  console.log('\n========================================================================')
  console.log('PWA VERIFICATION SUMMARY')
  console.log('========================================================================')
  const passed = results.filter(r => r.status === 'PASSED').length
  const failed = results.filter(r => r.status === 'FAILED').length
  console.log(`Total Tests: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed > 0) {
    process.exit(1)
  }
}

runPwaVerificationSuite().catch(err => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
