/**
 * Shadow Gate AR — Local Development & Testing Server
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types for WebAR assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mind': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.wasm': 'application/wasm'
};

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function handleRequest(req, res) {
  // CORS & Security headers for WebAR / SharedArrayBuffer
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Default to index.html
  if (pathname === '/' || pathname === '') {
    pathname = '/index.html';
  }

  const cleanPath = pathname.replace(/^\/+/, '');
  const filePath = path.join(PUBLIC_DIR, cleanPath);

  // Check file exists
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: ' + pathname);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': 'no-cache'
  });

  fs.createReadStream(filePath).pipe(res);
}

// 1. Create HTTP Server
const httpServer = http.createServer(handleRequest);
httpServer.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log('\n======================================================');
  console.log('   SHADOW GATE AR — MISSION 001 SERVER ACTIVE        ');
  console.log('======================================================');
  console.log(`Local Access:    http://localhost:${PORT}`);
  console.log(`Network Access:  http://${localIp}:${PORT}`);
  console.log('------------------------------------------------------');
  console.log('TIPS FOR MOBILE CAMERA ACCESS:');
  console.log('1. Recommended: Use Chrome USB Port Forwarding:');
  console.log('   Open chrome://inspect on your PC, forward port 3000,');
  console.log(`   and open http://localhost:${PORT} on your phone.`);
  console.log('2. Or use a secure tunnel (e.g. npx localtunnel --port 3000)');
  console.log('======================================================\n');
});

// 2. Check for optional SSL certificates for native HTTPS
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  const httpsServer = https.createServer(httpsOptions, handleRequest);
  httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
    const localIp = getLocalIp();
    console.log(`HTTPS Local:    https://localhost:${HTTPS_PORT}`);
    console.log(`HTTPS Network:  https://${localIp}:${HTTPS_PORT}`);
    console.log('======================================================\n');
  });
}
