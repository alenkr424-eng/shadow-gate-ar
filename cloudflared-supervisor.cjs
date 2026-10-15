const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
let currentChild = null;

function startCloudflared() {
  console.log('[CLOUDFLARE] Requesting fresh quick tunnel to port ' + PORT + '...');
  
  const child = spawn('npx', ['--yes', 'cloudflared', 'tunnel', '--url', 'http://localhost:' + PORT], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  currentChild = child;
  let activeUrl = null;

  function handleData(data) {
    const text = data.toString();
    // Look for trycloudflare.com URL
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && match[0] !== activeUrl) {
      activeUrl = match[0];
      console.log('\n======================================================');
      console.log('   CLOUDFLARE TUNNEL LIVE & ACTIVE FOR ANDROID        ');
      console.log('======================================================');
      console.log('Active URL: ' + activeUrl);
      console.log('======================================================\n');
      
      // Save active URL to public directory
      fs.writeFileSync(path.join(__dirname, 'public', 'tunnel-url.txt'), activeUrl);
    }

    // Detect expiration or server-side disconnection
    if (text.includes('Tunnel not found') || text.includes('Unauthorized') || text.includes('failed to accept QUIC stream')) {
      console.warn('[CLOUDFLARE] Detected tunnel session expiration. Renewing...');
      killAndRestart();
    }
  }

  child.stdout.on('data', handleData);
  child.stderr.on('data', handleData);

  child.on('close', (code) => {
    console.log(`[CLOUDFLARE] Process exited with code ${code}. Renewing tunnel in 2s...`);
    setTimeout(startCloudflared, 2000);
  });

  child.on('error', (err) => {
    console.error('[CLOUDFLARE] Process error:', err.message);
    killAndRestart();
  });
}

function killAndRestart() {
  if (currentChild) {
    try {
      currentChild.kill('SIGKILL');
    } catch (e) {}
    currentChild = null;
  }
  setTimeout(startCloudflared, 2000);
}

startCloudflared();
