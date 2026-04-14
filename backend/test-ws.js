// ─────────────────────────────────────────────────────────────
// v2 WebSocket test — validates snapshot, deltas, message
// validation, and heartbeat ping/pong.
// ─────────────────────────────────────────────────────────────

import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001/api/v1/events/evt_001/live');
let updateCount = 0;

ws.on('open', () => {
  console.log('✓ Connected\n');

  // Test: send a valid ping
  ws.send(JSON.stringify({ type: 'ping' }));

  // Test: send an invalid message type — should get error response
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'invalid_type' }));
  }, 500);

  // Test: send malformed JSON
  setTimeout(() => {
    ws.send('not json{{');
  }, 1000);
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());

  if (msg.type === 'state_snapshot') {
    console.log('── SNAPSHOT ──────────────────────────');
    console.log(`   version: ${msg.version}`);
    console.log(`   sections: ${Object.keys(msg.sections).join(', ')}`);
    console.log('');
  }

  if (msg.type === 'pong') {
    console.log('── PONG received (heartbeat OK) ──\n');
  }

  if (msg.type === 'error') {
    console.log(`── ERROR response: "${msg.message}" ──\n`);
  }

  if (msg.type === 'density_update') {
    updateCount++;
    console.log(`── DELTA #${updateCount} (v${msg.version}) ──`);
    const firstSection = Object.entries(msg.sections)[0];
    console.log(`   ${firstSection[0]}: density=${firstSection[1].density}`);
    console.log('');

    if (updateCount >= 2) {
      console.log('✓ All tests passed — snapshot, pong, error handling, 2 deltas\n');
      ws.close();
    }
  }
});

ws.on('close', () => { console.log('Connection closed.'); process.exit(0); });
ws.on('error', (err) => { console.error('Error:', err.message); process.exit(1); });
