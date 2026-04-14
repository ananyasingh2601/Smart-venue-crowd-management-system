// ─────────────────────────────────────────────────────────────
// StadiumPulse — WebSocket Route (v2)
// Handles WS upgrade, message validation, heartbeat pong,
// and client lifecycle.
// ─────────────────────────────────────────────────────────────

import { addClient, removeClient, markAlive } from '../services/broadcaster.js';
import { getEvent } from '../state/store.js';
import { validateInboundMessage, WS_INBOUND_TYPES, WS_OUTBOUND_TYPES } from '../lib/schemas.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('ws');

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function wsRoutes(fastify) {
  fastify.get('/api/v1/events/:id/live', { websocket: true }, (socket, request) => {
    const eventId = request.params.id;

    // Validate the event exists
    const event = getEvent(eventId);
    if (!event) {
      socket.send(JSON.stringify({ type: WS_OUTBOUND_TYPES.ERROR, message: 'Event not found' }));
      socket.close();
      return;
    }

    // Register with broadcaster — returns a unique clientId
    const clientId = addClient(eventId, socket);

    // ── Handle incoming messages ──────────────────────────
    socket.on('message', (raw) => {
      const { valid, parsed, error } = validateInboundMessage(raw.toString());

      if (!valid) {
        socket.send(JSON.stringify({
          type: WS_OUTBOUND_TYPES.ERROR,
          message: error,
        }));
        log.debug(`invalid message from client`, { clientId, error });
        return;
      }

      switch (parsed.type) {
        case WS_INBOUND_TYPES.PING:
          markAlive(eventId, clientId);
          socket.send(JSON.stringify({ type: WS_OUTBOUND_TYPES.PONG, timestamp: Date.now() }));
          break;

        case WS_INBOUND_TYPES.LOCATION_UPDATE:
          // Future: track user's current section for personalized alerts
          log.debug(`location update`, { clientId, data: parsed });
          markAlive(eventId, clientId);
          break;

        default:
          break;
      }
    });

    // ── Cleanup ──────────────────────────────────────────
    socket.on('close', () => {
      removeClient(eventId, clientId);
    });

    socket.on('error', (err) => {
      log.error(`socket error`, { clientId, error: err.message });
      removeClient(eventId, clientId);
    });
  });
}
