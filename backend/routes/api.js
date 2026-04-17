// ─────────────────────────────────────────────────────────────
// StadiumPulse — REST API Routes (v2)
// Modular Fastify plugin with response schemas,
// per-route rate limiting, and live-state-aware chat.
// ─────────────────────────────────────────────────────────────

import config from '../config.js';
import { getEvent, getState, getAggregates, getVersion, appendChatMessage, getChatHistory, getForecast, logSosAlert } from '../state/store.js';
import { getConnectionCount } from '../services/broadcaster.js';
import { generateGeminiReply, buildFallbackChatReply } from '../services/gemini.js';
import { saveChatMessageToFirebase, saveSosAlertToFirebase } from '../services/firebase.js';
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

    const sessionId = request.ip || 'anonymous';
    const history = getChatHistory(sessionId);

    const promptContext = {
      venueName: config.venue.name,
      eventName: config.event.name,
      updatedAt: agg.updatedAt,
      avgWaitFood: agg.avgWaitFood,
      avgWaitDrinks: agg.avgWaitDrinks,
      avgWaitBathroom: agg.avgWaitBathroom,
      avgDensity: agg.avgDensity,
      topSections: agg.topSections,
      quietExits: agg.quietExits,
      sections: state.sections,
    };

    let responseText = null;
    let provider = 'fallback';

    try {
      const gemini = await generateGeminiReply({
        apiKey: config.google.apiKey,
        model: config.google.geminiModel,
        timeoutMs: config.google.requestTimeoutMs,
        message,
        history,
        context: promptContext,
      });

      if (gemini.ok && gemini.text) {
        responseText = gemini.text;
        provider = 'gemini';
      } else if (gemini.reason === 'vertex_failed' && gemini.error) {
        log.warn('Vertex AI request failed; using fallback responder', { error: gemini.error });
      }
    } catch (error) {
      log.warn('Gemini request failed; using fallback responder', { error: error.message });
    }

    if (!responseText) {
      responseText = buildFallbackChatReply(message, agg, state);
    }

    // Store in chat session
    appendChatMessage(sessionId, { role: 'user', content: message });
    appendChatMessage(sessionId, { role: 'assistant', content: responseText });
    await Promise.allSettled([
      saveChatMessageToFirebase(sessionId, { role: 'user', content: message, provider }),
      saveChatMessageToFirebase(sessionId, { role: 'assistant', content: responseText, provider }),
    ]);

    log.info(`chat response`, { sessionId, provider, inputLength: message.length, outputLength: responseText.length });

    return {
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
      provider,
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
    const { type, location, message, reporterId = null } = request.body || {};
    if (!type || !['medical', 'security', 'lost_child', 'fire', 'other'].includes(type)) {
      return reply.status(400).send({ error: 'type must be one of: medical, security, lost_child, fire, other' });
    }

    const alert = logSosAlert({ type, location: location || 'Unknown', message: message || '', reporterId });
    await saveSosAlertToFirebase(alert);

    return {
      status: 'dispatched',
      alert,
      message: `Emergency ${type} alert has been dispatched. Help is on the way.`,
    };
  });
}
