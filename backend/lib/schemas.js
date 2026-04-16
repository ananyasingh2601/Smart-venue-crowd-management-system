// ─────────────────────────────────────────────────────────────
// StadiumPulse — Message Schemas & Validators
// Defines the shape of all WebSocket messages and REST
// responses. Used for both validation and documentation.
// ─────────────────────────────────────────────────────────────

// ── WebSocket Message Types ──────────────────────────────────

/** Allowed outbound message types from server → client */
export const WS_OUTBOUND_TYPES = Object.freeze({
  STATE_SNAPSHOT: 'state_snapshot',
  DENSITY_UPDATE: 'density_update',
  ALERT:         'alert',
  PONG:          'pong',
  ERROR:         'error',
});

/** Allowed inbound message types from client → server */
export const WS_INBOUND_TYPES = Object.freeze({
  PING:            'ping',
  LOCATION_UPDATE: 'location_update',
});

/**
 * Validate an incoming WebSocket message.
 * @param {string} raw — raw string from socket
 * @returns {{ valid: boolean, parsed: object|null, error: string|null }}
 */
export function validateInboundMessage(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, parsed: null, error: 'Message must be a JSON object' };
    }
    if (!parsed.type || typeof parsed.type !== 'string') {
      return { valid: false, parsed: null, error: 'Message must have a "type" string field' };
    }
    const allowed = Object.values(WS_INBOUND_TYPES);
    if (!allowed.includes(parsed.type)) {
      return { valid: false, parsed: null, error: `Unknown message type: "${parsed.type}". Allowed: ${allowed.join(', ')}` };
    }
    return { valid: true, parsed, error: null };
  } catch {
    return { valid: false, parsed: null, error: 'Invalid JSON' };
  }
}

// ── REST Response Schemas (Fastify JSON Schema format) ───────

export const healthResponseSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    uptime: { type: 'number' },
    connections: { type: 'integer' },
    stateVersion: { type: 'integer' },
  },
};

export const eventResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    venueId: { type: 'string' },
    name: { type: 'string' },
    startTime: { type: 'string' },
    status: { type: 'string' },
    venue: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        capacity: { type: 'integer' },
      },
    },
  },
};

export const chatRequestSchema = {
  type: 'object',
  required: ['message'],
  properties: {
    message: { type: 'string', maxLength: 500 },
    eventId: { type: 'string' },
  },
};

export const chatResponseSchema = {
  type: 'object',
  properties: {
    role: { type: 'string' },
    content: { type: 'string' },
    timestamp: { type: 'string' },
    provider: { type: 'string' },
  },
};
