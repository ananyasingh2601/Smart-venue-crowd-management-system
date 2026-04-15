// ─────────────────────────────────────────────────────────────
// StadiumPulse — REST API Routes (v2)
// Modular Fastify plugin with response schemas,
// per-route rate limiting, and live-state-aware chat.
// ─────────────────────────────────────────────────────────────

import config from '../config.js';
import { getEvent, getState, getAggregates, getVersion, appendChatMessage, getForecast, logSosAlert } from '../state/store.js';
import { getConnectionCount } from '../services/broadcaster.js';
import { healthResponseSchema, eventResponseSchema, chatRequestSchema, chatResponseSchema } from '../lib/schemas.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('api');

/**
 * @param {import('fastify').FastifyInstance} fastify
 */
export default async function apiRoutes(fastify) {

  // ── GET /api/v1/health ──────────────────────────────────
  fastify.get('/api/v1/health', {
    schema: { response: { 200: healthResponseSchema } },
  }, async () => ({
    status: 'ok',
    uptime: process.uptime(),
    connections: getConnectionCount(),
    stateVersion: getVersion(),
  }));

  // ── GET /api/v1/events/:id ──────────────────────────────
  fastify.get('/api/v1/events/:id', {
    schema: { response: { 200: eventResponseSchema } },
  }, async (request, reply) => {
    const event = getEvent(request.params.id);
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    return event;
  });

  // ── GET /api/v1/events/:id/state ────────────────────────
  fastify.get('/api/v1/events/:id/state', async (request, reply) => {
    const state = getState(request.params.id);
    if (!state) return reply.status(404).send({ error: 'Event not found' });
    return state;
  });

  // ── GET /api/v1/events/:id/stats ────────────────────────
  fastify.get('/api/v1/events/:id/stats', async (request, reply) => {
    const agg = getAggregates(request.params.id);
    if (!agg) return reply.status(404).send({ error: 'Event not found' });
    return {
      ...agg,
      connectedClients: getConnectionCount(request.params.id),
    };
  });

  // ── POST /api/v1/chat ───────────────────────────────────
  // Rate limited to 20 RPM per IP (per config).
  fastify.post('/api/v1/chat', {
    config: {
      rateLimit: {
        max: config.rateLimit.chat.max,
        timeWindow: config.rateLimit.chat.timeWindow,
      },
    },
    schema: {
      body: chatRequestSchema,
      response: { 200: chatResponseSchema },
    },
  }, async (request, reply) => {
    const { message, eventId = config.defaultEventId } = request.body;
    if (!message || typeof message !== 'string') {
      return reply.status(400).send({ error: 'message field required (string, max 500 chars)' });
    }
    if (message.length > 500) {
      return reply.status(400).send({ error: 'Message exceeds 500 character limit' });
    }

    const agg = getAggregates(eventId);
    const state = getState(eventId);
    if (!agg || !state) {
      return reply.status(404).send({ error: 'Event not found' });
    }

    // Build system prompt (TAD §4.3)
    const systemPrompt = `You are StadiumPulse AI, a real-time crowd guide at ${config.venue.name}.
Today's event: ${config.event.name}.

Current wait times (updated ${new Date(agg.updatedAt).toLocaleTimeString()}):
- Food stands: ${agg.avgWaitFood} min average
- Drink stands: ${agg.avgWaitDrinks} min average
- Bathrooms: ${agg.avgWaitBathroom} min average

Busiest sections right now: ${agg.topSections.join(', ')}
Quietest exits: ${agg.quietExits.join(', ')}

Rules: Be concise (max 3 sentences). Always give a specific recommendation.
Never speculate outside your stadium context. Use friendly, conversational tone.`;

    // ── Context-aware mock response engine ─────────────────
    // (Swap for Gemini API / Claude API call later)
    const lowerMsg = message.toLowerCase();
    let responseText;

    if (lowerMsg.includes('food') || lowerMsg.includes('eat') || lowerMsg.includes('hungry')) {
      const best = Object.entries(state.sections)
        .sort((a, b) => a[1].waitFood - b[1].waitFood)[0];
      responseText = `The shortest food line right now is at "${best[1].concession}" near Section ${best[0]} — only ${best[1].waitFood} min wait. I'd head there before ${agg.topSections[0]} gets busier!`;
    } else if (lowerMsg.includes('bathroom') || lowerMsg.includes('restroom') || lowerMsg.includes('toilet')) {
      const best = Object.entries(state.sections)
        .sort((a, b) => a[1].waitBathroom - b[1].waitBathroom)[0];
      responseText = `Section ${best[0]} has the shortest restroom queue at ${best[1].waitBathroom} min. It's much quieter than ${agg.topSections[0]} right now.`;
    } else if (lowerMsg.includes('drink') || lowerMsg.includes('beer') || lowerMsg.includes('bar')) {
      const best = Object.entries(state.sections)
        .sort((a, b) => a[1].waitDrinks - b[1].waitDrinks)[0];
      responseText = `Head to "${best[1].concession}" at Section ${best[0]} — drinks queue is only ${best[1].waitDrinks} min. Great selection there!`;
    } else if (lowerMsg.includes('exit') || lowerMsg.includes('leave') || lowerMsg.includes('gate')) {
      responseText = `The quietest exits right now are ${agg.quietExits.join(' and ')}. I'd recommend heading out through those to avoid the ${agg.topSections[0]} congestion.`;
    } else if (lowerMsg.includes('busy') || lowerMsg.includes('crowd') || lowerMsg.includes('density')) {
      responseText = `The busiest areas are ${agg.topSections.join(', ')} right now (avg density ${Math.round(agg.avgDensity * 100)}%). For some space, try the sections near ${agg.quietExits[0]}.`;
    } else {
      responseText = `Right now food lines average ${agg.avgWaitFood} min and restrooms ${agg.avgWaitBathroom} min. The busiest areas are ${agg.topSections.join(', ')}. Ask me about food, drinks, bathrooms, or exits for specific routing!`;
    }

    // Enforce max 3 sentences
    const sentences = responseText.match(/[^.!?]+[.!?]+/g) || [responseText];
    responseText = sentences.slice(0, 3).join(' ').trim();

    // Store in chat session
    const sessionId = request.ip || 'anonymous';
    appendChatMessage(sessionId, { role: 'user', content: message });
    appendChatMessage(sessionId, { role: 'assistant', content: responseText });

    log.info(`chat response`, { sessionId, inputLength: message.length, outputLength: responseText.length });

    return {
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    };
  });

  // ── GET /api/v1/events/:id/forecast ───────────────────
  fastify.get('/api/v1/events/:id/forecast', async (request, reply) => {
    const forecast = getForecast(request.params.id);
    if (!forecast) return reply.status(404).send({ error: 'Event not found' });
    return forecast;
  });

  // ── POST /api/v1/sos ──────────────────────────────────
  fastify.post('/api/v1/sos', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: 60000,
      },
    },
  }, async (request, reply) => {
    const { type, location, message } = request.body || {};
    if (!type || !['medical', 'security', 'lost_child', 'fire', 'other'].includes(type)) {
      return reply.status(400).send({ error: 'type must be one of: medical, security, lost_child, fire, other' });
    }

    const alert = logSosAlert({ type, location: location || 'Unknown', message: message || '' });

    return {
      status: 'dispatched',
      alert,
      message: `Emergency ${type} alert has been dispatched. Help is on the way.`,
    };
  });
}
