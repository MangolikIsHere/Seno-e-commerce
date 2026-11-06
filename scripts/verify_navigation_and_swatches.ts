import { chromium } from 'playwright'
import assert from 'assert'

const BASE_URL = 'http://localhost:3000'

async function run() {
  console.log('Testing View All navigation, Product links, and Colour Swatches...')
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1500)

    // 1. Verify New Arrivals "VIEW ALL" link
    const newArrivalsViewAllHref = await page.$eval('#new-arrivals .view-all-link', el => el.getAttribute('href'))
    console.log(`New Arrivals View All: ${newArrivalsViewAllHref}`)
    assert.strictEqual(newArrivalsViewAllHref, '/collections/new-arrivals')

    // 2. Verify Bestsellers "VIEW ALL" link
    const bestsellersViewAllHref = await page.$eval('#bestsellers .view-all-link', el => el.getAttribute('href'))
    console.log(`Bestsellers View All: ${bestsellersViewAllHref}`)
    assert.strictEqual(bestsellersViewAllHref, '/collections/bestsellers')

    // 3. Test colour swatch click updates product link query
    const swatches = await page.$$('#new-arrivals .product-card:first-child .product-card-swatches button')
    if (swatches.length > 1) {
      const secondSwatchTitle = await swatches[1].getAttribute('title')
      console.log(`Clicking second swatch: "${secondSwatchTitle}"`)
      await swatches[1].click()
      await page.waitForTimeout(400)

      const cardLink = await page.$eval('#new-arrivals .product-card:first-child a', el => el.getAttribute('href'))
      console.log(`Card href after swatch click: ${cardLink}`)
      assert(cardLink?.includes('colour='), 'Href should include colour query param after swatch selection')
    }

    // 4. Test Product Card Navigation
    const productHref = await page.$eval('#new-arrivals .product-card:first-child a', el => el.getAttribute('href'))
    console.log(`Navigating to: ${productHref}`)
    await Promise.all([
      page.waitForURL(`**${productHref}`),
      page.click('#new-arrivals .product-card:first-child a')
    ])
    console.log(`Successfully reached PDP: ${page.url()}`)
    assert(page.url().includes('/products/'))

    console.log('All navigation and swatch tests PASSED!')
  } finally {
    await browser.close()
  }
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
