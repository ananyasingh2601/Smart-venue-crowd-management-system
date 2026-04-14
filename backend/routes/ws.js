// ─────────────────────────────────────────────────────────────
// StadiumPulse — WebSocket Route (/api/v1/events/:id/live)
// Registers the real-time WebSocket upgrade endpoint.
// On connection: pushes full state snapshot via broadcaster.
// On tick: receives delta patches from the simulation service.
// ─────────────────────────────────────────────────────────────

import { addClient, removeClient } from '../services/broadcaster.js';
import { getEvent } from '../state/store.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function wsRoutes(fastify) {

  fastify.get('/api/v1/events/:id/live', { websocket: true }, (socket, request) => {
    const eventId = request.params.id;

    // Validate the event exists
    const event = getEvent(eventId);
    if (!event) {
      socket.send(JSON.stringify({ type: 'error', message: 'Event not found' }));
      socket.close();
      return;
    }

    // Register client in the broadcaster pool
    addClient(eventId, socket);

    // Handle incoming messages from the client (future: user location updates)
    socket.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Currently a no-op — ready for client-to-server messaging
        console.log(`[ws] received from client:`, msg.type || 'unknown');
      } catch {
        // Ignore malformed messages
      }
    });

    // Cleanup on disconnect
    socket.on('close', () => {
      removeClient(eventId, socket);
    });

    socket.on('error', (err) => {
      console.error(`[ws] socket error:`, err.message);
      removeClient(eventId, socket);
    });
  });
}
