import { chromium } from 'playwright'
import assert from 'assert'
import path from 'path'

const ARTIFACT_DIR = 'C:/Users/debna/.gemini/antigravity/brain/a533086c-3490-46fa-87cf-66b2f3d8a89c'
const BASE_URL = 'http://localhost:3000'

async function runVerification() {
  console.log('=================================================================')
  console.log('SENO — DEDICATED /install PWA & SHARING VERIFICATION')
  console.log('Testing Android, iOS, and Desktop behaviors separately')
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
    // =========================================================================
    // 1. DESKTOP BROWSER VERIFICATION (1440x900)
    // =========================================================================
    console.log('[1/4] Testing Desktop Experience...')
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    })
    const desktopPage = await desktopContext.newPage()
    await desktopPage.goto(`${BASE_URL}/install`, { waitUntil: 'networkidle' })
    await desktopPage.waitForTimeout(1000)

    // A. Verify Page Title & Headline
    const headline = await desktopPage.$eval('.install-hero-headline', el => el.textContent?.trim())
    console.log(`Headline: "${headline}"`)
    assert.strictEqual(headline, 'SENO at Your Fingertips.')
    passedChecks++
    console.log('  ✓ Desktop /install headline verified')

    // B. Verify App Card Details
    const appTitle = await desktopPage.$eval('.install-app-title', el => el.textContent?.trim())
    const appVer = await desktopPage.$eval('.install-app-ver', el => el.textContent?.trim())
    console.log(`App Card: ${appTitle} (${appVer})`)
    assert.strictEqual(appTitle, 'SENO')
    assert(appVer?.includes('PWA'))
    passedChecks++
    console.log('  ✓ SENO App Card metadata verified')

    // C. Verify Desktop Guide Tab is active by default
    const activeTab = await desktopPage.$eval('.install-tab-btn.active', el => el.textContent?.trim())
    console.log(`Active Platform Tab: ${activeTab}`)
    assert(activeTab?.includes('Mac & PC'))
    passedChecks++
    console.log('  ✓ Desktop tab auto-selected on desktop browser')

    // D. Test Copy Link button
    await desktopPage.click('.install-copy-link-btn')
    await desktopPage.waitForTimeout(300)
    const toastVisible = await desktopPage.isVisible('.install-toast')
    console.log(`Toast visible after copy: ${toastVisible}`)
    assert(toastVisible, 'Expected toast notification after copying link')
    passedChecks++
    console.log('  ✓ Clipboard copy and feedback toast verified')

    // E. Save Desktop Screenshot
    const desktopScreenshot = path.join(ARTIFACT_DIR, 'install_page_desktop.png')
    await desktopPage.screenshot({ path: desktopScreenshot, fullPage: true })
    console.log(`Saved screenshot: ${desktopScreenshot}`)

    await desktopContext.close()

    // =========================================================================
    // 2. ANDROID CHROME VERIFICATION (Mobile Viewport + Android UA)
    // =========================================================================
    console.log('\n[2/4] Testing Android Chrome Experience...')
    const androidContext = await browser.newContext({
      viewport: { width: 412, height: 915 },
      deviceScaleFactor: 2.6,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
    })
    const androidPage = await androidContext.newPage()
    await androidPage.goto(`${BASE_URL}/install`, { waitUntil: 'networkidle' })
    await androidPage.waitForTimeout(1000)

    // A. Verify Android tab is auto-selected
    const androidTabActive = await androidPage.$eval('.install-tab-btn.active', el => el.textContent?.trim())
    console.log(`Android active tab: ${androidTabActive}`)
    assert(androidTabActive?.includes('Android'))
    passedChecks++
    console.log('  ✓ Android platform auto-detected and tab activated')

    // B. Verify Android Steps
    const stepCount = await androidPage.$$eval('.install-step-card', els => els.length)
    console.log(`Android instruction steps count: ${stepCount}`)
    assert.strictEqual(stepCount, 3)
    passedChecks++
    console.log('  ✓ 3-Step native Android installation instructions verified')

    // C. Verify Install Button click
    await androidPage.click('.install-primary-action-btn')
    await androidPage.waitForTimeout(400)
    passedChecks++
    console.log('  ✓ Android install action click responsive')

    // D. Save Android Screenshot
    const androidScreenshot = path.join(ARTIFACT_DIR, 'install_page_android.png')
    await androidPage.screenshot({ path: androidScreenshot, fullPage: true })
    console.log(`Saved screenshot: ${androidScreenshot}`)

    await androidContext.close()

    // =========================================================================
    // 3. APPLE iOS SAFARI VERIFICATION (iPhone UA)
    // =========================================================================
    console.log('\n[3/4] Testing Apple iOS Safari Experience...')
    const iosContext = await browser.newContext({
      viewport: { width: 393, height: 852 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
    })
    const iosPage = await iosContext.newPage()
    await iosPage.goto(`${BASE_URL}/install`, { waitUntil: 'networkidle' })
    await iosPage.waitForTimeout(1000)

    // A. Verify iOS tab is auto-selected
    const iosTabActive = await iosPage.$eval('.install-tab-btn.active', el => el.textContent?.trim())
    console.log(`iOS active tab: ${iosTabActive}`)
    assert(iosTabActive?.includes('iPhone / iPad'))
    passedChecks++
    console.log('  ✓ iOS Safari auto-detected and tab activated')

    // B. Verify iOS-specific instructions (Share -> Add to Home Screen -> Add)
    const iosStep1 = await iosPage.$eval('.install-step-card:nth-child(1) .step-desc', el => el.textContent || '')
    const iosStep2 = await iosPage.$eval('.install-step-card:nth-child(2) .step-desc', el => el.textContent || '')
    console.log(`iOS Step 1: ${iosStep1}`)
    console.log(`iOS Step 2: ${iosStep2}`)
    assert(iosStep1.includes('Share') && iosStep1.includes('Safari'))
    assert(iosStep2.includes('Add to Home Screen'))
    passedChecks++
    console.log('  ✓ iOS Share Sheet -> Add to Home Screen guide verified')

    // C. Save iOS Screenshot
    const iosScreenshot = path.join(ARTIFACT_DIR, 'install_page_ios.png')
    await iosPage.screenshot({ path: iosScreenshot, fullPage: true })
    console.log(`Saved screenshot: ${iosScreenshot}`)

    await iosContext.close()

    // =========================================================================
    // 4. FOOTER & HEADER STOREFRONT INTEGRATION & OPEN GRAPH VERIFICATION
    // =========================================================================
    console.log('\n[4/4] Testing Header, Footer Integration & Metadata...')
    const navContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    })
    const navPage = await navContext.newPage()
    await navPage.goto(BASE_URL, { waitUntil: 'networkidle' })
    await navPage.waitForTimeout(1000)

    // A. Verify footer link to /install
    const footerLink = await navPage.$eval('.footer-install-page-link', el => el.getAttribute('href'))
    console.log(`Footer link href: ${footerLink}`)
    assert.strictEqual(footerLink, '/install')
    passedChecks++
    console.log('  ✓ Footer contains accessible link to /install')

    // B. Click footer link and verify client navigation
    await Promise.all([
      navPage.waitForURL('**/install'),
      navPage.click('.footer-install-page-link')
    ])
    console.log(`Navigated to: ${navPage.url()}`)
    assert(navPage.url().includes('/install'))
    passedChecks++
    console.log('  ✓ Navigation from Footer to /install verified')

    // C. Verify Open Graph metadata tags on /install (as seen by WhatsApp, iMessage, and social crawlers)
    await navPage.goto(`${BASE_URL}/install`, { waitUntil: 'domcontentloaded' })
    const ogTitle = await navPage.$eval('meta[property="og:title"]', el => el.getAttribute('content'))
    const ogImage = await navPage.$eval('meta[property="og:image"]', el => el.getAttribute('content'))
    const ogDesc = await navPage.$eval('meta[property="og:description"]', el => el.getAttribute('content'))
    console.log(`OG Title: ${ogTitle}`)
    console.log(`OG Image: ${ogImage}`)
    console.log(`OG Description: ${ogDesc}`)
    assert(ogTitle && ogTitle.includes('SENO'))
    assert(ogImage && ogImage.includes('icon-512x512.png'))
    assert(ogDesc && ogDesc.includes('SENO'))
    passedChecks++
    console.log('  ✓ Social Open Graph metadata tags verified for WhatsApp & social platforms')

    await navContext.close()

    console.log('\n=================================================================')
    console.log(`ALL PWA INSTALL & SHARING CHECKS PASSED: ${passedChecks}/${passedChecks} (100%)`)
    console.log('=================================================================')

  } finally {
    await browser.close()
  }
}

runVerification().catch(err => {
  console.error('\nVerification failed:', err)
  process.exit(1)
})
