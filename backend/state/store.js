// ─────────────────────────────────────────────────────────────
// StadiumPulse — In-Memory State Store
// Drop-in replacement for Redis + PostgreSQL during MVP phase.
// Exposes getState / setState / getEvent helpers consumed by
// routes and the simulation service.
// ─────────────────────────────────────────────────────────────

import { v4 as uuid } from 'uuid';

// ── Seed Data ────────────────────────────────────────────────

const VENUE = {
  id: 'venue_001',
  name: 'MetLife Stadium',
  capacity: 82500,
  sections: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  gates: {
    north: 'Gate A',
    east: 'Gate B',
    south: 'Gate C',
    west: 'Gate D',
  },
};

const EVENT = {
  id: 'evt_001',
  venueId: VENUE.id,
  name: 'Super Bowl LIX',
  startTime: new Date().toISOString(),
  status: 'live',
};

const CONCESSIONS = {
  A: 'Grill & Chill',
  B: 'Beer Garden',
  C: 'Hot Dog Cart',
  D: 'Pizza Stand',
  E: 'Taco Truck',
  F: 'Craft Beer Bar',
  G: 'Burger Barn',
  H: 'Pretzel Palace',
};

// ── Live State (equivalent of Redis `state:{eventId}`) ──────

function buildInitialSections() {
  const sections = {};
  for (const id of VENUE.sections) {
    sections[id] = {
      density: +(Math.random() * 0.6 + 0.2).toFixed(2),   // 0.20 – 0.80
      waitFood: Math.floor(Math.random() * 12) + 2,         // 2 – 13 min
      waitDrinks: Math.floor(Math.random() * 8) + 1,        // 1 – 8 min
      waitBathroom: Math.floor(Math.random() * 7) + 1,      // 1 – 7 min
      concession: CONCESSIONS[id],
    };
  }
  return sections;
}

const state = {
  eventId: EVENT.id,
  updatedAt: Date.now(),
  sections: buildInitialSections(),
};

// ── Public API ───────────────────────────────────────────────

export function getVenue() {
  return VENUE;
}

export function getEvent(eventId) {
  if (eventId !== EVENT.id) return null;
  return { ...EVENT, venue: VENUE };
}

export function getFullState(eventId) {
  if (eventId !== EVENT.id) return null;
  return { ...state, updatedAt: Date.now() };
}

export function getSections() {
  return state.sections;
}

export function updateSection(sectionId, patch) {
  if (!state.sections[sectionId]) return;
  Object.assign(state.sections[sectionId], patch);
  state.updatedAt = Date.now();
}

export function getAggregates() {
  const secs = Object.values(state.sections);
  const avg = (arr) => +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);

  const densities = secs.map((s) => s.density);
  const busiest = Object.entries(state.sections)
    .sort((a, b) => b[1].density - a[1].density)
    .slice(0, 3)
    .map(([id]) => `Section ${id}`);

  const quietExits = Object.entries(state.sections)
    .sort((a, b) => a[1].density - b[1].density)
    .slice(0, 2)
    .map(([id]) => VENUE.gates[['north', 'east', 'south', 'west'][VENUE.sections.indexOf(id) % 4]]);

  return {
    avgDensity: avg(densities),
    avgWaitFood: avg(secs.map((s) => s.waitFood)),
    avgWaitDrinks: avg(secs.map((s) => s.waitDrinks)),
    avgWaitBathroom: avg(secs.map((s) => s.waitBathroom)),
    topSections: busiest,
    quietExits: [...new Set(quietExits)],
  };
}
