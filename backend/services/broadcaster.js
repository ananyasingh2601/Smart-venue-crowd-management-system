// ─────────────────────────────────────────────────────────────
// StadiumPulse — WebSocket Broadcaster (v2)
// Manages per-event connection pools with metadata, heartbeat
// ping/pong, graceful disconnect, and scoped broadcasting.
// ─────────────────────────────────────────────────────────────

import { v4 as uuid } from 'uuid';
import config from '../config.js';
import { getState } from '../state/store.js';
import { WS_OUTBOUND_TYPES } from '../lib/schemas.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('broadcaster');

// ── Client Metadata ──────────────────────────────────────────

/**
 * @typedef {Object} ClientMeta
 * @property {string}    clientId
 * @property {string}    eventId
 * @property {WebSocket} socket
 * @property {boolean}   alive    — heartbeat flag
 * @property {number}    connectedAt
 */

/** @type {Map<string, Map<string, ClientMeta>>}  eventId → Map<clientId, ClientMeta> */
const pools = new Map();

/** Heartbeat interval handle */
let heartbeatHandle = null;

// ── Public API ───────────────────────────────────────────────

/**
 * Register a new WebSocket client and send the full state snapshot.
 * @param {string}    eventId
 * @param {WebSocket} socket
 * @returns {string}  clientId
 */
export function addClient(eventId, socket) {
  if (!pools.has(eventId)) pools.set(eventId, new Map());

  const clientId = uuid();
  /** @type {ClientMeta} */
  const meta = {
    clientId,
    eventId,
    socket,
    alive: true,
    connectedAt: Date.now(),
  };

  pools.get(eventId).set(clientId, meta);

  // Send full snapshot on connect (TAD §3.2)
  const state = getState(eventId);
  if (state) {
    safeSend(socket, {
      type: WS_OUTBOUND_TYPES.STATE_SNAPSHOT,
      eventId,
      timestamp: Date.now(),
      version: state.version,
      sections: state.sections,
    });
  }

  log.info(`client connected`, { eventId, clientId, poolSize: pools.get(eventId).size });
  return clientId;
}

/**
 * Remove a client from its pool by clientId.
 * @param {string} eventId
 * @param {string} clientId
 */
export function removeClient(eventId, clientId) {
  const pool = pools.get(eventId);
  if (!pool) return;

  pool.delete(clientId);
  log.info(`client disconnected`, { eventId, clientId, poolSize: pool.size });

  if (pool.size === 0) pools.delete(eventId);
}

/**
 * Broadcast a message to all clients subscribed to a specific event.
 * Skips and cleans up dead sockets.
 * @param {string} eventId
 * @param {object} message
 * @returns {number} delivered count
 */
export function broadcast(eventId, message) {
  const pool = pools.get(eventId);
  if (!pool || pool.size === 0) return 0;

  const payload = JSON.stringify(message);
  let delivered = 0;

  for (const [clientId, meta] of pool) {
    if (meta.socket.readyState === 1) { // OPEN
      meta.socket.send(payload);
      delivered++;
    } else {
      pool.delete(clientId);
      log.debug(`cleaned dead socket`, { eventId, clientId });
    }
  }

  log.debug(`broadcast`, { eventId, type: message.type, delivered, poolSize: pool.size });
  return delivered;
}

/**
 * Get total connected clients (all events or specific event).
 * @param {string} [eventId]
 * @returns {number}
 */
export function getConnectionCount(eventId) {
  if (eventId) {
    return pools.has(eventId) ? pools.get(eventId).size : 0;
  }
  let total = 0;
  for (const pool of pools.values()) total += pool.size;
  return total;
}

// ── Heartbeat System ─────────────────────────────────────────

/**
 * Start the heartbeat ping loop. Sends a ping to every client.
 * If a client didn't respond to the last ping, terminate it.
 */
export function startHeartbeat() {
  if (heartbeatHandle) return;

  heartbeatHandle = setInterval(() => {
    let checked = 0;
    let terminated = 0;

    for (const [eventId, pool] of pools) {
      for (const [clientId, meta] of pool) {
        if (!meta.alive) {
          // Didn't respond to last ping — dead connection
          meta.socket.terminate();
          pool.delete(clientId);
          terminated++;
          log.warn(`terminated unresponsive client`, { eventId, clientId });
          continue;
        }

        // Mark as not-alive, then ping. Client must send pong to stay alive.
        meta.alive = false;
        if (meta.socket.readyState === 1) {
          safeSend(meta.socket, { type: WS_OUTBOUND_TYPES.PONG });
        }
        checked++;
      }
      if (pool.size === 0) pools.delete(eventId);
    }

    if (terminated > 0 || checked > 0) {
      log.debug(`heartbeat sweep`, { checked, terminated });
    }
  }, config.ws.heartbeatIntervalMs);

  log.info(`heartbeat started`, { intervalMs: config.ws.heartbeatIntervalMs });
}

/**
 * Mark a client as alive (called when client sends a ping/pong).
 * @param {string} eventId
 * @param {string} clientId
 */
export function markAlive(eventId, clientId) {
  const pool = pools.get(eventId);
  if (!pool) return;
  const meta = pool.get(clientId);
  if (meta) meta.alive = true;
}

/**
 * Stop the heartbeat loop.
 */
export function stopHeartbeat() {
  if (heartbeatHandle) {
    clearInterval(heartbeatHandle);
    heartbeatHandle = null;
  }
}

// ── Helpers ──────────────────────────────────────────────────

/**
 * Safely send a JSON message to a socket, catching errors.
 * @param {WebSocket} socket
 * @param {object}    message
 */
function safeSend(socket, message) {
  try {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(message));
    }
  } catch (err) {
    log.error(`safeSend failed`, { error: err.message });
  }
}
