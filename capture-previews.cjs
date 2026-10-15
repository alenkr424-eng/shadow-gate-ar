const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 412, height: 915, isMobile: true, deviceScaleFactor: 2 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // 1. Landing screen screenshot
  await page.screenshot({ path: path.join(__dirname, 'public', 'preview-landing.png') });
  console.log('[PREVIEW] Captured preview-landing.png');

  // 2. Poster modal screenshot
  await page.click('#btn-view-poster');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.join(__dirname, 'public', 'preview-poster-modal.png') });
  console.log('[PREVIEW] Captured preview-poster-modal.png');

  await browser.close();
}

capture().catch(console.error);
