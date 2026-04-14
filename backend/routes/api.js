// ─────────────────────────────────────────────────────────────
// StadiumPulse — REST API Routes (/api/v1)
// Modular route plugin registered by the Fastify server.
// ─────────────────────────────────────────────────────────────

import { getEvent, getFullState, getAggregates, getVenue } from '../state/store.js';
import { getPoolSize } from '../services/broadcaster.js';

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function apiRoutes(fastify) {

  // ── GET /api/v1/events/:id ────────────────────────────────
  // Returns event metadata + venue info.
  fastify.get('/api/v1/events/:id', async (request, reply) => {
    const event = getEvent(request.params.id);
    if (!event) {
      return reply.status(404).send({ error: 'Event not found' });
    }
    return event;
  });

  // ── GET /api/v1/events/:id/state ──────────────────────────
  // Returns the full current density + wait-time state for
  // all sections. This is the REST equivalent of the initial
  // WebSocket snapshot.
  fastify.get('/api/v1/events/:id/state', async (request, reply) => {
    const state = getFullState(request.params.id);
    if (!state) {
      return reply.status(404).send({ error: 'Event not found' });
    }
    return state;
  });

  // ── GET /api/v1/events/:id/stats ──────────────────────────
  // Aggregated averages — useful for the AI concierge context.
  fastify.get('/api/v1/events/:id/stats', async (request, reply) => {
    const state = getFullState(request.params.id);
    if (!state) {
      return reply.status(404).send({ error: 'Event not found' });
    }
    const aggregates = getAggregates();
    return {
      ...aggregates,
      connectedClients: getPoolSize(request.params.id),
      updatedAt: state.updatedAt,
    };
  });

  // ── POST /api/v1/chat ─────────────────────────────────────
  // Mock AI concierge endpoint. Injects live state into a
  // structured system prompt and returns a canned-but-contextual
  // response. Ready for Claude API swap-in.
  fastify.post('/api/v1/chat', async (request, reply) => {
    const { message, eventId } = request.body || {};
    if (!message) {
      return reply.status(400).send({ error: 'message field required' });
    }

    const agg = getAggregates();
    const venue = getVenue();

    // Build the system prompt exactly per TAD §4.3
    const systemPrompt = `You are StadiumPulse AI, a real-time crowd guide at ${venue.name}.
Today's event: Super Bowl LIX.

Current wait times (updated just now):
- Food stands: ${agg.avgWaitFood} min average
- Drink stands: ${agg.avgWaitDrinks} min average
- Bathrooms: ${agg.avgWaitBathroom} min average

Busiest sections right now: ${agg.topSections.join(', ')}
Quietest exits: ${agg.quietExits.join(', ')}

Rules: Be concise (max 3 sentences). Always give a specific recommendation.
Never speculate outside your stadium context. Use friendly, conversational tone.`;

    // ── Mock response engine (swap for Claude API call later) ──
    const lowerMsg = message.toLowerCase();
    let responseText;

    if (lowerMsg.includes('food') || lowerMsg.includes('eat') || lowerMsg.includes('hungry')) {
      const bestSection = Object.entries(getFullState('evt_001').sections)
        .sort((a, b) => a[1].waitFood - b[1].waitFood)[0];
      responseText = `The shortest food line right now is at "${bestSection[1].concession}" near Section ${bestSection[0]} — only ${bestSection[1].waitFood} min wait! I'd head there now before halftime.`;
    } else if (lowerMsg.includes('bathroom') || lowerMsg.includes('restroom') || lowerMsg.includes('toilet')) {
      const bestSection = Object.entries(getFullState('evt_001').sections)
        .sort((a, b) => a[1].waitBathroom - b[1].waitBathroom)[0];
      responseText = `Section ${bestSection[0]} has the shortest restroom queue at ${bestSection[1].waitBathroom} min. It's much quieter than the main concourse.`;
    } else if (lowerMsg.includes('drink') || lowerMsg.includes('beer') || lowerMsg.includes('bar')) {
      const bestSection = Object.entries(getFullState('evt_001').sections)
        .sort((a, b) => a[1].waitDrinks - b[1].waitDrinks)[0];
      responseText = `Head to "${bestSection[1].concession}" at Section ${bestSection[0]} — drinks queue is only ${bestSection[1].waitDrinks} min. Great craft selection there too!`;
    } else if (lowerMsg.includes('exit') || lowerMsg.includes('leave') || lowerMsg.includes('gate')) {
      responseText = `The quietest exits right now are ${agg.quietExits.join(' and ')}. I'd recommend heading out through those to avoid the ${agg.topSections[0]} congestion.`;
    } else if (lowerMsg.includes('busy') || lowerMsg.includes('crowd') || lowerMsg.includes('density')) {
      responseText = `The busiest areas are ${agg.topSections.join(', ')} right now (avg density ${Math.round(agg.avgDensity * 100)}%). If you're looking for space, try the sections near ${agg.quietExits[0]}.`;
    } else {
      responseText = `Right now food lines average ${agg.avgWaitFood} min and restrooms ${agg.avgWaitBathroom} min. The busiest areas are ${agg.topSections.join(', ')}. Ask me about food, drinks, bathrooms, or exits for specific routing!`;
    }

    return {
      role: 'assistant',
      content: responseText,
      context: {
        systemPrompt,
        liveState: agg,
      },
    };
  });

  // ── Health check ──────────────────────────────────────────
  fastify.get('/api/v1/health', async () => {
    return { status: 'ok', uptime: process.uptime() };
  });
}
