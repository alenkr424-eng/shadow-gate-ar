const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    defaultViewport: { width: 412, height: 915, isMobile: true, deviceScaleFactor: 2 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream'
    ]
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Awaken the gate
  await page.click('#btn-awaken');
  await new Promise(r => setTimeout(r, 1500));

  // Trigger target found mock in page context to display the gate
  await page.evaluate(() => {
    if (window.shadowGateAR) {
      window.shadowGateAR.onTargetFound();
      // Render camera view with gate in center
      if (window.shadowGateAR.shadowGate) {
        window.shadowGateAR.shadowGate.group.position.set(0, 0, -1.8);
        window.shadowGateAR.shadowGate.setVisibility(true);
      }
    }
  });

  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: path.join(__dirname, 'public', 'preview-sololeveling-gate.png') });
  console.log('[PREVIEW] Captured preview-sololeveling-gate.png');

  await browser.close();
}

capture().catch(console.error);
