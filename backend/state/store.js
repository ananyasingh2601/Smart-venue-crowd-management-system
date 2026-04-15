// ─────────────────────────────────────────────────────────────
// StadiumPulse — In-Memory State Adapter
// Implements the state interface using plain JS Maps.
// Designed as a drop-in replacement target: swap this file
// for a Redis adapter (ioredis) without changing consumers.
//
// Key schema mirrors Redis conventions:
//   state:{eventId}     → full density/wait-time state
//   chat:{sessionId}    → conversation history array
// ─────────────────────────────────────────────────────────────

import { v4 as uuid } from 'uuid';
import config from '../config.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('state');

// ── Internal Storage ─────────────────────────────────────────

/** @type {Map<string, object>} key = "state:{eventId}" */
const stateStore = new Map();

/** @type {Map<string, Array>} key = "chat:{sessionId}" */
const chatStore = new Map();

/** @type {Map<string, Array<object>>} key = "history:{eventId}" — ring buffer of density snapshots */
const historyStore = new Map();
const HISTORY_MAX = 20;

/** @type {Array<object>} SOS alerts log */
const sosAlerts = [];

/** Global version counter — incremented on every state mutation */
let _version = 0;

// ── Seed Data ────────────────────────────────────────────────

function buildInitialSections() {
  /** @type {Record<string, object>} */
  const sections = {};
  for (const id of config.venue.sections) {
    const profile = config.sectionProfiles[id];
    const baseDensity = 0.3 + (profile.bias - 0.5) * 0.3; // bias-adjusted starting point
    sections[id] = Object.freeze({
      density: +baseDensity.toFixed(2),
      waitFood: Math.floor(4 * profile.bias + Math.random() * 4),
      waitDrinks: Math.floor(3 * profile.bias + Math.random() * 3),
      waitBathroom: Math.floor(2 * profile.bias + Math.random() * 2),
      concession: profile.concession,
    });
  }
  return sections;
}

/** Seed the default event state on module load */
function seed() {
  const key = `state:${config.event.id}`;
  stateStore.set(key, {
    eventId: config.event.id,
    version: ++_version,
    updatedAt: Date.now(),
    sections: buildInitialSections(),
  });
  log.info(`seeded initial state`, { key, version: _version });
}

seed();

// ── State Interface ──────────────────────────────────────────

/**
 * Get the full immutable state for an event.
 * @param {string} eventId
 * @returns {object|null}
 */
export function getState(eventId) {
  const state = stateStore.get(`state:${eventId}`);
  if (!state) return null;
  // Return a deep-frozen copy to prevent mutation bugs
  return JSON.parse(JSON.stringify(state));
}

/**
 * Atomically update a single section's data.
 * Creates a new state object (copy-on-write) to avoid mutation.
 * @param {string} eventId
 * @param {string} sectionId
 * @param {object} patch — partial section fields to merge
 * @returns {object|null} — the new section state, or null if missing
 */
export function updateSection(eventId, sectionId, patch) {
  const key = `state:${eventId}`;
  const prev = stateStore.get(key);
  if (!prev || !prev.sections[sectionId]) return null;

  // Copy-on-write: new sections object with the patched section
  const newSections = { ...prev.sections };
  newSections[sectionId] = Object.freeze({ ...prev.sections[sectionId], ...patch });

  const newState = {
    ...prev,
    version: ++_version,
    updatedAt: Date.now(),
    sections: newSections,
  };

  stateStore.set(key, newState);
  return newSections[sectionId];
}

/**
 * Get the current state version (for cache invalidation / ETags).
 * @returns {number}
 */
export function getVersion() {
  return _version;
}

// ── Event Metadata ───────────────────────────────────────────

/**
 * @param {string} eventId
 * @returns {object|null}
 */
export function getEvent(eventId) {
  if (eventId !== config.event.id) return null;
  return {
    id: config.event.id,
    venueId: config.venue.id,
    name: config.event.name,
    startTime: new Date().toISOString(),
    status: config.event.status,
    venue: { ...config.venue },
  };
}

// ── Aggregates ───────────────────────────────────────────────

/**
 * Compute derived averages from the current state.
 * @param {string} eventId
 * @returns {object|null}
 */
export function getAggregates(eventId) {
  const state = stateStore.get(`state:${eventId}`);
  if (!state) return null;

  const secs = Object.values(state.sections);
  const avg = (fn) => +(secs.reduce((sum, s) => sum + fn(s), 0) / secs.length).toFixed(1);

  const ranked = Object.entries(state.sections).sort((a, b) => b[1].density - a[1].density);
  const topSections = ranked.slice(0, 3).map(([id]) => `Section ${id}`);

  const quietIndices = ranked.slice(-2).map(([id]) => {
    const idx = config.venue.sections.indexOf(id);
    const gateKey = ['north', 'east', 'south', 'west'][idx % 4];
    return config.venue.gates[gateKey];
  });

  return {
    avgDensity: avg((s) => s.density),
    avgWaitFood: avg((s) => s.waitFood),
    avgWaitDrinks: avg((s) => s.waitDrinks),
    avgWaitBathroom: avg((s) => s.waitBathroom),
    topSections,
    quietExits: [...new Set(quietIndices)],
    version: state.version,
    updatedAt: state.updatedAt,
  };
}

// ── Density History ──────────────────────────────────────────

/**
 * Push a density snapshot into the ring buffer.
 * @param {string} eventId
 * @param {Record<string, number>} densityMap — { sectionId: density }
 */
export function pushDensityHistory(eventId, densityMap) {
  const key = `history:${eventId}`;
  if (!historyStore.has(key)) historyStore.set(key, []);
  const buf = historyStore.get(key);
  buf.push({ timestamp: Date.now(), densities: { ...densityMap } });
  if (buf.length > HISTORY_MAX) buf.shift();
}

/**
 * Get density history for an event.
 * @param {string} eventId
 * @returns {Array<object>}
 */
export function getDensityHistory(eventId) {
  return historyStore.get(`history:${eventId}`) ?? [];
}

/**
 * Compute a simple trend for each section (up / down / stable).
 * @param {string} eventId
 * @returns {Record<string, string>|null}
 */
export function getTrends(eventId) {
  const history = getDensityHistory(eventId);
  if (history.length < 3) return null;

  const recent = history.slice(-3);
  const trends = {};
  for (const sectionId of config.venue.sections) {
    const vals = recent.map(h => h.densities[sectionId] ?? 0);
    const delta = vals[vals.length - 1] - vals[0];
    trends[sectionId] = delta > 0.03 ? 'up' : delta < -0.03 ? 'down' : 'stable';
  }
  return trends;
}

/**
 * Forecast density for the next 4 time slots (7.5 / 15 / 22.5 / 30 min).
 * Uses simple linear extrapolation from recent history.
 * @param {string} eventId
 * @returns {object|null}
 */
export function getForecast(eventId) {
  const state = stateStore.get(`state:${eventId}`);
  const history = getDensityHistory(eventId);
  if (!state) return null;

  const slots = [7.5, 15, 22.5, 30]; // minutes ahead
  const forecast = {};

  for (const sectionId of config.venue.sections) {
    const current = state.sections[sectionId]?.density ?? 0.5;

    // Compute trend slope from history
    let slope = 0;
    if (history.length >= 3) {
      const recent = history.slice(-5);
      const first = recent[0].densities[sectionId] ?? current;
      const last = recent[recent.length - 1].densities[sectionId] ?? current;
      const timeSpanMin = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 60000;
      slope = timeSpanMin > 0 ? (last - first) / timeSpanMin : 0;
    }

    forecast[sectionId] = slots.map(minutes => ({
      minutes,
      density: Math.min(0.98, Math.max(0.05, +(current + slope * minutes).toFixed(2))),
      confidence: Math.max(0.3, +(1 - minutes / 60).toFixed(2)),
    }));
  }

  return {
    eventId,
    generatedAt: Date.now(),
    slots,
    sections: forecast,
  };
}

// ── SOS Alerts ───────────────────────────────────────────────

/**
 * Log an SOS alert.
 * @param {object} alert — { type, location, message }
 * @returns {object} the stored alert
 */
export function logSosAlert(alert) {
  const entry = {
    id: uuid(),
    ...alert,
    timestamp: Date.now(),
    status: 'dispatched',
  };
  sosAlerts.push(entry);
  if (sosAlerts.length > 100) sosAlerts.shift();
  log.info('SOS alert logged', { id: entry.id, type: entry.type });
  return entry;
}

/**
 * Get recent SOS alerts.
 * @param {number} limit
 * @returns {Array}
 */
export function getSosAlerts(limit = 10) {
  return sosAlerts.slice(-limit).reverse();
}

// ── Chat Session Store ───────────────────────────────────────

/**
 * Append a message to a chat session.
 * @param {string} sessionId
 * @param {{ role: string, content: string }} message
 */
export function appendChatMessage(sessionId, message) {
  const key = `chat:${sessionId}`;
  if (!chatStore.has(key)) chatStore.set(key, []);
  const history = chatStore.get(key);
  history.push({ ...message, timestamp: Date.now() });

  // Cap at 50 messages per session
  if (history.length > 50) history.splice(0, history.length - 50);
}

/**
 * Get the chat history for a session.
 * @param {string} sessionId
 * @returns {Array}
 */
export function getChatHistory(sessionId) {
  return chatStore.get(`chat:${sessionId}`) ?? [];
}

/**
 * Purge expired chat sessions (call periodically).
 * @param {number} maxAgeMs — max age in milliseconds (default 2h)
 */
export function purgeStaleSessions(maxAgeMs = 2 * 60 * 60 * 1000) {
  const now = Date.now();
  for (const [key, history] of chatStore.entries()) {
    if (history.length === 0) { chatStore.delete(key); continue; }
    const lastMsg = history[history.length - 1];
    if (now - lastMsg.timestamp > maxAgeMs) {
      chatStore.delete(key);
      log.debug(`purged stale chat session`, { key });
    }
  }
}
