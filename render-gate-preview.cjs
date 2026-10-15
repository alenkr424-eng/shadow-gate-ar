const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_SCREENSHOT = path.join('C:\\Users\\Alen K R\\.gemini\\antigravity-ide\\brain\\de4cc3b2-9838-41bd-999d-b7976228ecc3', 'live_gate_preview.png');

async function captureGatePreview() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 2 });

  console.log('[PREVIEW] Navigating to http://localhost:3000/preview.html...');
  await page.goto('http://localhost:3000/preview.html', { waitUntil: 'networkidle0' });

  // Wait 1.5s for textures to load and animate
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: OUT_SCREENSHOT });
  console.log('[PASS] Saved live gate preview to:', OUT_SCREENSHOT);
  await browser.close();
}

captureGatePreview().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
