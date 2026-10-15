const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const INPUT_JPG = path.join(__dirname, 'public', 'assets', 'gate-cloud-vortex.jpg');
const OUT_DIR = path.join(__dirname, 'public', 'assets');

async function processTextures() {
  console.log('[TEXTURES] Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  const imgData = fs.readFileSync(INPUT_JPG).toString('base64');
  const dataUri = `data:image/jpeg;base64,${imgData}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:transparent;">
        <canvas id="c"></canvas>
      </body>
    </html>
  `;
  await page.setContent(html);

  console.log('[TEXTURES] Processing vortex alpha mask in canvas...');
  const results = await page.evaluate(async (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = 768; // Optimized for mobile GPU cache & zero bandwidth hitching
        const c = document.getElementById('c');
        c.width = size;
        c.height = size;
        const ctx = c.getContext('2d');
        const cx = size / 2;
        const cy = size / 2;

        // 1. GENERATE FULL VORTEX WITH ALPHA
        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size);
        const d = imgData.data;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const r = d[idx];
            const g = d[idx + 1];
            const b = d[idx + 2];

            const dx = (x - cx) / cx;
            const dy = (y - cy) / cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Luminance & intensity
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            const maxChannel = Math.max(r, g, b);

            // Outer boundary circular feathering (between 0.72 and 0.95)
            let radialMask = 1.0;
            if (dist > 0.72) {
              radialMask = Math.max(0, 1.0 - (dist - 0.72) / 0.24);
              radialMask = radialMask * radialMask * (3 - 2 * radialMask);
            }

            // Alpha calculation: black background becomes transparent
            // but dark blue clouds remain opaque
            let alpha = Math.min(1.0, maxChannel / 28.0);
            alpha = Math.pow(alpha, 1.1) * radialMask;

            d[idx + 3] = Math.round(Math.min(255, Math.max(0, alpha * 255)));
          }
        }
        ctx.putImageData(imgData, 0, 0);
        const fullVortexPng = c.toDataURL('image/png');

        // 2. GENERATE INNER SWIRLING STORM EYE
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const coreData = ctx.getImageData(0, 0, size, size);
        const cd = coreData.data;

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const dx = (x - cx) / cx;
            const dy = (y - cy) / cy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let coreMask = 0;
            if (dist < 0.45) {
              coreMask = Math.max(0, 1.0 - dist / 0.45);
              coreMask = coreMask * coreMask * (3 - 2 * coreMask);
            }

            const r = cd[idx];
            const g = cd[idx + 1];
            const b = cd[idx + 2];
            const lum = (r * 0.3 + g * 0.5 + b * 0.2) / 255;
            cd[idx + 3] = Math.round(Math.min(255, Math.max(0, coreMask * lum * 255)));
          }
        }
        ctx.putImageData(coreData, 0, 0);
        const coreEyePng = c.toDataURL('image/png');

        // 3. GENERATE ORGANIC BILLOWING SMOKE PUFF (Soft, multi-lobed dark/cerulean mist)
        const puffSize = 256;
        c.width = puffSize;
        c.height = puffSize;
        ctx.clearRect(0, 0, puffSize, puffSize);

        const pcx = puffSize / 2;
        const pcy = puffSize / 2;
        
        // Multi-lobe organic smoke cloud with soft Gaussian blur
        ctx.filter = 'blur(16px)';
        const lobes = [
          { x: pcx, y: pcy, r: puffSize * 0.32, col: 'rgba(30, 80, 140, 0.55)' },
          { x: pcx - 22, y: pcy - 14, r: puffSize * 0.26, col: 'rgba(14, 50, 100, 0.45)' },
          { x: pcx + 24, y: pcy - 10, r: puffSize * 0.28, col: 'rgba(56, 140, 200, 0.40)' },
          { x: pcx + 12, y: pcy + 22, r: puffSize * 0.24, col: 'rgba(10, 40, 85, 0.50)' },
          { x: pcx - 18, y: pcy + 18, r: puffSize * 0.22, col: 'rgba(40, 100, 170, 0.40)' }
        ];

        for (const l of lobes) {
          const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
          grad.addColorStop(0.0, l.col);
          grad.addColorStop(0.7, l.col.replace(/[\d\.]+\)$/, '0.2)'));
          grad.addColorStop(1.0, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
          ctx.fill();
        }

        const smokePuffPng = c.toDataURL('image/png');

        resolve({ fullVortexPng, coreEyePng, smokePuffPng });
      };
      img.src = src;
    });
  }, dataUri);

  await browser.close();

  const saveBase64 = (dataUrl, filename) => {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filePath = path.join(OUT_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    console.log(`[PASS] Saved ${filename} (${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)`);
  };

  saveBase64(results.fullVortexPng, 'gate-cloud-vortex.png');
  saveBase64(results.coreEyePng, 'gate-core-eye.png');
  saveBase64(results.smokePuffPng, 'gate-smoke-puff.png');

  console.log('[PASS] All Solo Leveling gate textures processed successfully!');
}

processTextures().catch(err => {
  console.error('[FAIL]', err);
  process.exit(1);
});
