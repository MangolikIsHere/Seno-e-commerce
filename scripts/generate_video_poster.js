const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    let browser;
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    }
    const page = await browser.newPage();
    const videoAbsolutePath = path.resolve(__dirname, '../public/videos/diwali-promo.mp4');
    const videoUrl = 'file:///' + videoAbsolutePath.replace(/\\/g, '/');

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body style="margin: 0; padding: 0; background: #000; overflow: hidden;">
          <video id="v" src="${videoUrl}" muted playsinline autoplay style="width: 1280px; height: 720px; object-fit: cover;"></video>
        </body>
      </html>
    `);

    await page.waitForTimeout(1000);
    const posterPath = path.resolve(__dirname, '../public/videos/diwali-promo-poster.jpg');
    await page.screenshot({ path: posterPath });
    await browser.close();
    console.log('Poster generated at:', posterPath);
  } catch (err) {
    console.error('Failed to generate poster:', err);
  }
})();
