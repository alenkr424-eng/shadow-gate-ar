const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  console.log('[RUNNER] Launching local Chrome via puppeteer-core with WebGL...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false, // GUI mode ensures full GPU/WebGL shader support for MindAR
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle'
    ]
  });

  console.log('[RUNNER] Opening compilation page...');
  const page = await browser.newPage();

  page.on('console', msg => console.log('[PAGE CONSOLE]', msg.text()));
  page.on('pageerror', err => console.error('[PAGE ERROR]', err.message));

  await page.goto('http://127.0.0.1:4123/compile.html', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('[RUNNER] Page loaded. Waiting for MindAR compilation to complete...');
  
  await page.waitForFunction(() => window.__COMPILATION_COMPLETE__ === true, {
    timeout: 120000,
    polling: 1000
  });

  const bytes = await page.evaluate(() => window.__COMPILATION_BYTES__);
  console.log(`[RUNNER] Compilation SUCCESSFUL! Generated ${bytes} bytes.`);

  await browser.close();
  console.log('[RUNNER] Finished cleanly.');
  process.exit(0);
}

main().catch(err => {
  console.error('[RUNNER ERROR]', err);
  process.exit(1);
});
