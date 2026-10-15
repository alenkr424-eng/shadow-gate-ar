const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4123;
const BASE_DIR = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  console.log(`[REQ] ${req.method} ${pathname}`);

  if (pathname === '/client-log') {
    console.log(`[CLIENT] ${parsedUrl.query.msg || ''}`);
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (req.method === 'POST' && pathname === '/save-mind') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const outPath = path.join(BASE_DIR, 'assets', 'gameathon-poster.mind');
      fs.writeFileSync(outPath, buffer);
      console.log(`[COMPILER] SUCCESS! Saved ${buffer.length} bytes to ${outPath}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, bytes: buffer.length, path: outPath }));
    });
    return;
  }

  const cleanPath = pathname === '/' ? 'compile.html' : pathname.replace(/^\/+/, '');
  const filePath = path.join(BASE_DIR, cleanPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    console.log(`[404] ${filePath}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.mind': 'application/octet-stream'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`[COMPILER-SERVER] Running on http://localhost:${PORT}`);
});
