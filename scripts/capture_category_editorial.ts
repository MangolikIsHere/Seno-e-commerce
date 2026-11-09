import { chromium } from 'playwright';
import path from 'path';
import assert from 'assert';

const BASE_URL = 'http://localhost:3000';
const ARTIFACT_DIR = 'C:/Users/debna/.gemini/antigravity/brain/a533086c-3490-46fa-87cf-66b2f3d8a89c';

async function verifyAndCapture() {
  console.log('=================================================================');
  console.log('SENO — SHOP BY CATEGORY EDITORIAL TYPOGRAPHY & OVERLAY VERIFICATION');
  console.log('=================================================================\n');

  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  } catch (err) {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  }

  // 1. DESKTOP VERIFICATION (1440x900)
  console.log('[1/2] Verifying Desktop Category Layout & Typography...');
  const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await desktopPage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await desktopPage.waitForTimeout(1500);

  const categorySection = desktopPage.locator('#shop-by-category, section:has(h2:text("Shop by Category"))').first();
  await categorySection.scrollIntoViewIfNeeded();
  await desktopPage.waitForTimeout(1000);

  const desktopCardsData = await categorySection.evaluate((section) => {
    const cards = Array.from(section.querySelectorAll('.category-tile-card'));
    return cards.map((c, i) => {
      const eyebrow = c.querySelector('.category-tile-eyebrow')?.textContent?.trim() || '';
      const title = c.querySelector('.category-tile-title')?.textContent?.trim() || '';
      const subtitle = c.querySelector('.category-tile-subtitle')?.textContent?.trim() || '';
      const cta = c.querySelector('.category-tile-cta')?.textContent?.trim() || '';
      const badge = c.querySelector('.category-tile-badge');
      const href = c.getAttribute('href');
      const img = c.querySelector('img')?.getAttribute('src');

      // Check eyebrow styling (ensure NO white rectangular background)
      const eyebrowEl = c.querySelector('.category-tile-eyebrow');
      const computedEyebrow = eyebrowEl ? window.getComputedStyle(eyebrowEl) : null;
      const bg = computedEyebrow?.backgroundColor || '';

      return {
        index: i + 1,
        eyebrow,
        title,
        subtitle,
        cta,
        hasBadgeBox: !!badge,
        eyebrowBg: bg,
        href,
        hasImg: !!img
      };
    });
  });

  console.log('Detected Desktop Category Cards:', JSON.stringify(desktopCardsData, null, 2));

  assert.strictEqual(desktopCardsData.length, 6, 'Must render exactly 6 categories');
  for (const card of desktopCardsData) {
    assert(card.eyebrow.length > 0, `Card ${card.index} must have an editorial eyebrow`);
    assert(card.title.length > 0, `Card ${card.index} must have a serif title`);
    assert(card.subtitle.length > 0, `Card ${card.index} must have a descriptive subtitle`);
    assert(card.cta.includes('EXPLORE COLLECTION') || card.cta.includes('EXPLORE'), `Card ${card.index} must have an Explore link`);
    assert(!card.hasBadgeBox, `Card ${card.index} must NOT have white label rectangular box`);
    assert(card.eyebrowBg === 'rgba(0, 0, 0, 0)' || card.eyebrowBg === 'transparent', `Card ${card.index} eyebrow must not have opaque background`);
  }
  console.log('  ✓ Desktop editorial hierarchy verified across all 6 categories');

  const desktopScreenshotPath = path.join(ARTIFACT_DIR, 'category_section_editorial_desktop.png');
  await categorySection.screenshot({ path: desktopScreenshotPath });
  console.log(`Saved desktop screenshot: ${desktopScreenshotPath}`);

  // 2. MOBILE VERIFICATION (iPhone 390x844)
  console.log('\n[2/2] Verifying Mobile Category Layout & Responsiveness...');
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15'
  });
  await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(1500);

  const mobileCategorySection = mobilePage.locator('#shop-by-category, section:has(h2:text("Shop by Category"))').first();
  await mobileCategorySection.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(1000);

  const mobileMetrics = await mobileCategorySection.evaluate((section) => {
    const cards = Array.from(section.querySelectorAll('.category-tile-card'));
    return cards.map((c, i) => {
      const rect = c.getBoundingClientRect();
      const content = c.querySelector('.category-tile-content')?.getBoundingClientRect();
      const cta = c.querySelector('.category-tile-cta')?.getBoundingClientRect();

      // Check for clipping
      const isCtaVisible = cta ? (cta.bottom <= rect.bottom + 2) : false;

      return {
        index: i + 1,
        width: rect.width,
        height: rect.height,
        ratio: (rect.width / rect.height).toFixed(2),
        isCtaVisible
      };
    });
  });

  console.log('Mobile Card Metrics:', mobileMetrics);
  for (const m of mobileMetrics) {
    assert(m.isCtaVisible, `Card ${m.index} CTA must not be clipped off the bottom`);
  }
  console.log('  ✓ Mobile cards have sufficient vertical space and no clipped text');

  const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'category_section_editorial_mobile.png');
  await mobileCategorySection.screenshot({ path: mobileScreenshotPath });
  console.log(`Saved mobile screenshot: ${mobileScreenshotPath}`);

  await browser.close();
  console.log('\n=================================================================');
  console.log('ALL CATEGORY EDITORIAL REDESIGN CHECKS PASSED');
  console.log('=================================================================');
}

verifyAndCapture().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
