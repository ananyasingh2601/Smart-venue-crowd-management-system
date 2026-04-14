// ─────────────────────────────────────────────────────────────
// StadiumPulse — WebSocket Broadcaster
// Manages a pool of connected clients per event and fans out
// density delta patches from the simulation service.
// On new connection → push full state snapshot immediately.
// On tick → push delta patch to all clients for that event.
// ─────────────────────────────────────────────────────────────

import { getFullState } from '../state/store.js';

/**
 * Connection pool: Map<eventId, Set<WebSocket>>
 */
const pools = new Map();

/**
 * Register a new WebSocket connection for a given event.
 * Immediately sends the full current state snapshot.
 */
export function addClient(eventId, socket) {
  if (!pools.has(eventId)) {
    pools.set(eventId, new Set());
  }
  pools.get(eventId).add(socket);

  // Push full snapshot on connect (per TAD §3.2)
  const snapshot = getFullState(eventId);
  if (snapshot) {
    socket.send(JSON.stringify({
      type: 'state_snapshot',
      eventId,
      timestamp: Date.now(),
      sections: snapshot.sections,
    }));
  }

  console.log(`[broadcaster] client connected — event=${eventId}, pool_size=${pools.get(eventId).size}`);
}

/**
 * Remove a client from the pool.
 */
export function removeClient(eventId, socket) {
  const pool = pools.get(eventId);
  if (pool) {
    pool.delete(socket);
    console.log(`[broadcaster] client disconnected — event=${eventId}, pool_size=${pool.size}`);
    if (pool.size === 0) pools.delete(eventId);
  }
}

/**
 * Broadcast a message to all clients subscribed to the given event.
 * Non-ready sockets are silently skipped and cleaned up.
 */
export function broadcast(eventId, message) {
  const pool = pools.get(eventId);
  if (!pool || pool.size === 0) return;

  const payload = JSON.stringify(message);
  let delivered = 0;

  for (const socket of pool) {
    if (socket.readyState === 1) { // WebSocket.OPEN
      socket.send(payload);
      delivered++;
    } else {
      pool.delete(socket);
    }
  }
}

/**
 * Get the count of connected clients for an event.
 */
export function getPoolSize(eventId) {
  return pools.has(eventId) ? pools.get(eventId).size : 0;
}
