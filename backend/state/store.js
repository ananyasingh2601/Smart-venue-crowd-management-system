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
