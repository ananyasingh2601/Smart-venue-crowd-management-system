// ─────────────────────────────────────────────────────────────
// StadiumPulse — Crowd Simulation Engine (v2)
// Produces realistic crowd density mutations with:
//   • Per-section traffic profiles (biases)
//   • Time-based spikes (halftime rush simulation)
//   • Separated density / wait-time calculation functions
// ─────────────────────────────────────────────────────────────

import config from '../config.js';
import { getState, updateSection, pushDensityHistory } from '../state/store.js';
import { broadcast } from './broadcaster.js';
import { WS_OUTBOUND_TYPES } from '../lib/schemas.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('simulation');

let intervalHandle = null;
let _tickCount = 0;

// ── Pure Calculation Functions ───────────────────────────────

/**
 * Clamp a number between min and max.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

/**
 * Compute the halftime multiplier based on current tick count.
 * Simulates a 3-phase pattern:
 *   • Normal play:  multiplier = 1.0
 *   • Pre-halftime:  multiplier ramps up to 1.8 (fans rush to stands)
 *   • Post-halftime: multiplier decays back to 1.0
 *
 * @param {number} tickCount — current simulation tick
 * @param {number} tickMs    — ms per tick
 * @returns {number} multiplier (1.0 – 1.8)
 */
function getHalftimeMultiplier(tickCount, tickMs) {
  // Convert tick count to approximate "game minutes"
  const gameMinutes = (tickCount * tickMs) / 60000;
  const halftime = config.simulation.halftimeMinute;

  // 5 minutes before halftime → ramp up
  if (gameMinutes >= halftime - 5 && gameMinutes < halftime) {
    const progress = (gameMinutes - (halftime - 5)) / 5;
    return 1.0 + 0.8 * progress;
  }
  // During halftime (halftime → halftime+15) → peak then decay
  if (gameMinutes >= halftime && gameMinutes < halftime + 15) {
    const progress = (gameMinutes - halftime) / 15;
    return 1.8 - 0.8 * progress;
  }
  return 1.0;
}

/**
 * Calculate the new density for a section.
 * @param {number} currentDensity — 0.0 to 1.0
 * @param {number} bias — section traffic bias from config
 * @param {number} halftimeMult — time-based multiplier
 * @returns {number} new density (0.05 – 0.98)
 */
function calculateDensity(currentDensity, bias, halftimeMult) {
  // Mean-reverting random walk: density gravitates toward bias * 0.5 over time
  const target = clamp(bias * 0.5, 0.2, 0.8);
  const meanReversion = (target - currentDensity) * 0.05;
  const noise = (Math.random() - 0.48) * 0.12 * halftimeMult;
  return +clamp(currentDensity + meanReversion + noise, 0.05, 0.98).toFixed(2);
}

/**
 * Calculate wait time based on density and a base factor.
 * Higher density → longer waits (non-linear relationship).
 * @param {number} currentWait — current wait in minutes
 * @param {number} density — current section density (0-1)
 * @param {number} maxWait — maximum possible wait
 * @param {number} halftimeMult — time-based multiplier
 * @returns {number} integer minutes
 */
function calculateWaitTime(currentWait, density, maxWait, halftimeMult) {
  // Wait is correlated with density but has some randomness
  const densityPull = density * maxWait * 0.3;
  const noise = (Math.random() - 0.45) * 3 * halftimeMult;
  const combined = currentWait * 0.7 + densityPull + noise;
  return clamp(Math.round(combined), 1, maxWait);
}

// ── Simulation Tick ──────────────────────────────────────────

/**
 * Execute one simulation tick. Mutates state and returns the delta.
 * @param {string} eventId
 * @returns {Record<string, object>} delta patch per section
 */
function tick(eventId) {
  const state = getState(eventId);
  if (!state) return {};

  _tickCount++;
  const halftimeMult = getHalftimeMultiplier(_tickCount, config.simulation.tickMs);
  const delta = {};

  for (const [id, section] of Object.entries(state.sections)) {
    const profile = config.sectionProfiles[id];
    if (!profile) continue;

    const newDensity = calculateDensity(section.density, profile.bias, halftimeMult);

    const patch = {
      density: newDensity,
      waitFood: calculateWaitTime(section.waitFood, newDensity, 25, halftimeMult),
      waitDrinks: calculateWaitTime(section.waitDrinks, newDensity, 20, halftimeMult),
      waitBathroom: calculateWaitTime(section.waitBathroom, newDensity, 15, halftimeMult),
    };

    updateSection(eventId, id, patch);
    delta[id] = patch;
  }

  // Push density snapshot into history ring buffer
  const densityMap = {};
  for (const [id, d] of Object.entries(delta)) {
    densityMap[id] = d.density;
  }
  pushDensityHistory(eventId, densityMap);

  return delta;
}

// ── Lifecycle ────────────────────────────────────────────────

/**
 * Start the simulation loop.
 * @param {string} eventId
 */
export function startSimulation(eventId) {
  if (intervalHandle) return;

  log.info(`started`, { eventId, tickMs: config.simulation.tickMs });

  intervalHandle = setInterval(() => {
    const delta = tick(eventId);
    const state = getState(eventId);

    broadcast(eventId, {
      type: WS_OUTBOUND_TYPES.DENSITY_UPDATE,
      eventId,
      timestamp: Date.now(),
      version: state?.version ?? 0,
      sections: delta,
    });

    // Log every 10th tick to avoid spam
    if (_tickCount % 10 === 0) {
      const htMult = getHalftimeMultiplier(_tickCount, config.simulation.tickMs);
      log.debug(`tick #${_tickCount}`, { halftimeMultiplier: htMult.toFixed(2) });
    }
  }, config.simulation.tickMs);
}

/**
 * Stop the simulation loop.
 */
export function stopSimulation() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    _tickCount = 0;
    log.info('stopped');
  }
}
