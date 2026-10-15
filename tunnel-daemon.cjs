const localtunnel = require('localtunnel');

const PORT = 3000;

async function startTunnel() {
  console.log(`[TUNNEL] Establishing HTTPS tunnel to port ${PORT}...`);
  try {
    const tunnel = await localtunnel({ port: PORT });
    console.log(`\n======================================================`);
    console.log(`   SHADOW GATE AR — PUBLIC HTTPS TUNNEL ACTIVE       `);
    console.log(`======================================================`);
    console.log(`HTTPS Mobile URL:  ${tunnel.url}`);
    console.log(`======================================================\n`);

    tunnel.on('close', () => {
      console.log('[TUNNEL] Tunnel closed. Reconnecting in 3s...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('[TUNNEL ERROR]', err.message);
      setTimeout(startTunnel, 3000);
    });

  } catch (err) {
    console.error('[TUNNEL FAILED]', err.message);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
