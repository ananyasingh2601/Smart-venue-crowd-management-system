// ─────────────────────────────────────────────────────────────
// StadiumPulse — Centralized Configuration
// Single source of truth for all tuneable constants.
// Reads from process.env (dotenv loaded in server.js).
// ─────────────────────────────────────────────────────────────

/** @param {string} key  @param {string} fallback */
const env = (key, fallback) => process.env[key] ?? fallback;

/** @param {string} key  @param {number} fallback */
const envInt = (key, fallback) => parseInt(process.env[key] ?? String(fallback), 10);

/** @param {string} key  @param {boolean} fallback */
const envBool = (key, fallback) => (process.env[key] ?? String(fallback)) === 'true';

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.FIREBASE_APPLICATION_CREDENTIALS) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.FIREBASE_APPLICATION_CREDENTIALS;
}

const config = Object.freeze({
  // ── Server ──────────────────────────────────────────
  server: {
    port: envInt('PORT', 3001),
    host: env('HOST', '0.0.0.0'),
    env: env('NODE_ENV', 'development'),
  },

  // ── Logging ─────────────────────────────────────────
  logging: {
    level: env('LOG_LEVEL', 'info'),
    debug: envBool('DEBUG_MODE', false),
  },

  // ── Simulation ──────────────────────────────────────
  simulation: {
    tickMs: envInt('SIMULATION_TICK_MS', 8000),
    halftimeMinute: envInt('HALFTIME_MINUTE', 45),
  },

  // ── WebSocket ───────────────────────────────────────
  ws: {
    heartbeatIntervalMs: envInt('WS_HEARTBEAT_INTERVAL_MS', 30000),
    heartbeatTimeoutMs: envInt('WS_HEARTBEAT_TIMEOUT_MS', 10000),
  },

  // ── Rate Limiting ───────────────────────────────────
  rateLimit: {
    global: {
      max: envInt('RATE_LIMIT_MAX', 100),
      timeWindow: envInt('RATE_LIMIT_WINDOW_MS', 60000),
    },
    chat: {
      max: envInt('CHAT_RATE_LIMIT_MAX', 20),
      timeWindow: envInt('CHAT_RATE_LIMIT_WINDOW_MS', 60000),
    },
  },

  // ── Default Event ───────────────────────────────────
  defaultEventId: env('DEFAULT_EVENT_ID', 'evt_001'),

  // ── Google / Gemini ──────────────────────────────────
  google: {
    vertexProjectId: env('GOOGLE_CLOUD_PROJECT', ''),
    vertexLocation: env('GOOGLE_CLOUD_LOCATION', 'us-central1'),
    geminiModel: env('GOOGLE_GEMINI_MODEL', 'gemini-2.0-flash'),
    requestTimeoutMs: envInt('GOOGLE_GEMINI_TIMEOUT_MS', 12000),
  },

  // ── Firebase ──────────────────────────────────────────
  firebase: {
    projectId: env('FIREBASE_PROJECT_ID', env('GOOGLE_CLOUD_PROJECT', '')),
  },

  // ── Venue Seed Data ─────────────────────────────────
  venue: {
    id: 'venue_001',
    name: 'MetLife Stadium',
    capacity: 82500,
    sections: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
    gates: { north: 'Gate A', east: 'Gate B', south: 'Gate C', west: 'Gate D' },
  },

  event: {
    id: 'evt_001',
    name: 'Super Bowl LIX',
    status: 'live',
  },

  // ── Section Profiles (simulation realism) ───────────
  // bias > 1 = naturally busier, < 1 = naturally quieter
  sectionProfiles: {
    A: { bias: 1.1, concession: 'Grill & Chill' },
    B: { bias: 0.9, concession: 'Beer Garden' },
    C: { bias: 1.3, concession: 'Hot Dog Cart' },    // near main entrance
    D: { bias: 0.7, concession: 'Pizza Stand' },      // upper deck, quieter
    E: { bias: 0.6, concession: 'Taco Truck' },       // far corner
    F: { bias: 0.8, concession: 'Craft Beer Bar' },
    G: { bias: 1.2, concession: 'Burger Barn' },      // near big screen
    H: { bias: 0.5, concession: 'Pretzel Palace' },   // quietest section
  },
});

export default config;
