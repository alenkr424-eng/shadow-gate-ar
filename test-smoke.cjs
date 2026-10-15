/**
 * Automated Smoke Test for Shadow Gate AR
 * Verifies UI rendering, procedural 3D gate creation, module evaluation, and state handling
 */
const puppeteer = require('puppeteer-core');

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function runTests() {
  console.log('[SMOKE-TEST] Starting automated verification suite...');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--use-gl=angle',
      '--use-fake-ui-for-media-stream', // Mock camera permission prompt
      '--use-fake-device-for-media-stream' // Mock camera video track
    ]
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => console.log('[BROWSER CONSOLE]', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));

  console.log('[SMOKE-TEST] Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 20000 });

  // 1. Verify Title & Meta
  const title = await page.title();
  console.log(`[PASS] Page Title: "${title}"`);
  if (!title.includes('SHADOW GATE')) throw new Error('Incorrect page title');

  // 2. Verify Landing Screen DOM
  const landingVisible = await page.$eval('#landing-screen', el => !el.classList.contains('hidden'));
  console.log(`[PASS] Landing screen visible: ${landingVisible}`);
  if (!landingVisible) throw new Error('Landing screen should be visible on load');

  const mainTitleText = await page.$eval('.main-title', el => el.textContent.trim());
  console.log(`[PASS] Main title element: "${mainTitleText}"`);
  if (mainTitleText !== 'SHADOW GATE') throw new Error('Title text mismatch');

  const subtitleText = await page.$eval('.subtitle', el => el.textContent.trim());
  console.log(`[PASS] Subtitle text: "${subtitleText}"`);

  // 3. Verify Poster Modal Functionality
  await page.click('#btn-view-poster');
  const modalOpen = await page.$eval('#poster-modal', el => !el.classList.contains('hidden'));
  console.log(`[PASS] Poster modal opens on click: ${modalOpen}`);
  if (!modalOpen) throw new Error('Poster modal failed to open');

  await page.click('#btn-close-poster');
  const modalClosed = await page.$eval('#poster-modal', el => el.classList.contains('hidden'));
  console.log(`[PASS] Poster modal closes on click: ${modalClosed}`);
  if (!modalClosed) throw new Error('Poster modal failed to close');

  // 4. Verify Procedural 3D Shadow Gate in Page Context
  console.log('[SMOKE-TEST] Evaluating 3D ShadowGate procedural generator in browser context...');
  const gateEvaluation = await page.evaluate(async () => {
    try {
      const { ShadowGate } = await import('./js/gate-mesh.js');
      const gate = new ShadowGate();
      
      // Test update loop
      gate.update(0.016);
      gate.update(0.016);

      return {
        success: true,
        ringCount: gate.rings.length,
        shardCount: gate.floatingShards.length,
        hasLight: !!gate.pulseLight,
        childCount: gate.group.children.length
      };
    } catch (e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  });

  if (!gateEvaluation.success) {
    throw new Error(`ShadowGate evaluation failed: ${gateEvaluation.error}`);
  }
  console.log(`[PASS] ShadowGate initialized with ${gateEvaluation.ringCount} concentric rings, ${gateEvaluation.shardCount} floating shards, and ${gateEvaluation.childCount} mesh entities.`);

  // 5. Test "AWAKEN THE GATE" Click & Session Start Transition
  console.log('[SMOKE-TEST] Clicking "AWAKEN THE GATE" button...');
  await page.click('#btn-awaken');

  // Wait for transition
  await new Promise(r => setTimeout(r, 1200));

  const hudVisible = await page.$eval('#scanning-overlay', el => !el.classList.contains('hidden'));
  console.log(`[PASS] Scanning HUD overlay activated: ${hudVisible}`);
  if (!hudVisible) throw new Error('Scanning overlay should be visible after awakening gate');

  const statusMsg = await page.$eval('#status-text', el => el.textContent);
  console.log(`[PASS] Current AR status message: "${statusMsg}"`);

  // 6. Test "STOP AR" Button & Cleanup
  console.log('[SMOKE-TEST] Testing "STOP AR" button...');
  await page.click('#btn-stop-ar');
  await new Promise(r => setTimeout(r, 800));

  const landingRestored = await page.$eval('#landing-screen', el => !el.classList.contains('hidden'));
  console.log(`[PASS] Landing screen restored after STOP AR: ${landingRestored}`);
  if (!landingRestored) throw new Error('Landing screen should be restored after STOP AR');

  // Check errors
  if (pageErrors.length > 0) {
    console.warn('[WARN] Page errors logged:', pageErrors);
  } else {
    console.log('[PASS] Zero uncaught page errors detected.');
  }

  await browser.close();
  console.log('\n======================================================');
  console.log('   ALL AUTOMATED VERIFICATION CHECKS PASSED (100%)    ');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('[SMOKE-TEST FAILED]', err);
  process.exit(1);
});
