const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function generate() {
  function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  const localIp = getLocalIp();
  console.log('[SSL] Generating SSL certificate for localhost and ' + localIp + '...');

  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'ShadowGate AR' }
  ];

  const pems = await selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: localIp }
        ]
      }
    ]
  });

  fs.writeFileSync(path.join(__dirname, 'cert.pem'), pems.cert);
  fs.writeFileSync(path.join(__dirname, 'key.pem'), pems.private);
  console.log('[SSL] Saved cert.pem and key.pem successfully!');
}

generate().catch(console.error);
