// ─────────────────────────────────────────────────────────────
// StadiumPulse — Crowd Simulation Service
// Mimics the Crowd Intelligence Service consuming from the
// Event Bus. Runs an 8-second interval that mutates in-memory
// section densities using a bounded random walk, then pushes
// delta patches to all connected WebSocket clients via the
// broadcaster.
// ─────────────────────────────────────────────────────────────

import { getSections, updateSection, getFullState } from '../state/store.js';
import { broadcast } from './broadcaster.js';

const TICK_MS = 8_000; // 8-second update cycle per TAD spec
let intervalHandle = null;

/**
 * Clamp a number between min and max.
 */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Produce a single tick of simulated crowd movement.
 * Returns the delta patch that was applied.
 */
function tick() {
  const sections = getSections();
  const delta = {};

  for (const [id, section] of Object.entries(sections)) {
    // Density drifts ±0.08 per tick, clamped [0.05, 0.98]
    const densityDrift = (Math.random() - 0.48) * 0.16;
    const newDensity = +clamp(section.density + densityDrift, 0.05, 0.98).toFixed(2);

    // Wait times drift ±2 min, clamped [1, 25]
    const foodDrift = Math.floor(Math.random() * 5) - 2;
    const drinkDrift = Math.floor(Math.random() * 3) - 1;
    const bathroomDrift = Math.floor(Math.random() * 3) - 1;

    const patch = {
      density: newDensity,
      waitFood: clamp(section.waitFood + foodDrift, 1, 25),
      waitDrinks: clamp(section.waitDrinks + drinkDrift, 1, 20),
      waitBathroom: clamp(section.waitBathroom + bathroomDrift, 1, 15),
    };

    updateSection(id, patch);
    delta[id] = patch;
  }

  return delta;
}

/**
 * Start the simulation loop. Each tick mutates state and
 * broadcasts a delta message to all connected clients.
 */
export function startSimulation(eventId) {
  if (intervalHandle) return;

  console.log(`[simulation] started — ticking every ${TICK_MS / 1000}s for event ${eventId}`);

  intervalHandle = setInterval(() => {
    const delta = tick();

    // Build the WebSocket message matching the TAD protocol
    const message = {
      type: 'density_update',
      eventId,
      timestamp: Date.now(),
      sections: delta,
    };

    broadcast(eventId, message);
  }, TICK_MS);
}

/**
 * Stop the simulation loop.
 */
export function stopSimulation() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log('[simulation] stopped');
  }
}
