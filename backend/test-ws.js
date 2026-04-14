// ─────────────────────────────────────────────────────────────
// Quick WebSocket verification script.
// Connects to the live event stream, prints the initial
// snapshot, then logs 3 delta updates before disconnecting.
// ─────────────────────────────────────────────────────────────

import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3001/api/v1/events/evt_001/live');
let updateCount = 0;

ws.on('open', () => {
  console.log('✓ Connected to ws://localhost:3001/api/v1/events/evt_001/live\n');
});

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString());

  if (msg.type === 'state_snapshot') {
    console.log('── INITIAL SNAPSHOT ──────────────────────────');
    console.log(`   Sections: ${Object.keys(msg.sections).join(', ')}`);
    for (const [id, sec] of Object.entries(msg.sections)) {
      console.log(`   ${id}: density=${sec.density} | food=${sec.waitFood}m | drinks=${sec.waitDrinks}m | bath=${sec.waitBathroom}m`);
    }
    console.log('');
  }

  if (msg.type === 'density_update') {
    updateCount++;
    console.log(`── DELTA UPDATE #${updateCount} (t=${msg.timestamp}) ──`);
    for (const [id, sec] of Object.entries(msg.sections)) {
      console.log(`   ${id}: density=${sec.density} | food=${sec.waitFood}m | drinks=${sec.waitDrinks}m | bath=${sec.waitBathroom}m`);
    }
    console.log('');

    if (updateCount >= 3) {
      console.log('✓ Received 3 delta updates — WebSocket fan-out verified!\n');
      ws.close();
    }
  }
});

ws.on('close', () => {
  console.log('Connection closed.');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err.message);
  process.exit(1);
});
