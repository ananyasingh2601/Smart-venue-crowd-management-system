// ─────────────────────────────────────────────────────────────
// StadiumPulse — Structured Logger
// Thin wrapper over the Fastify/Pino logger instance.
// Provides namespaced child loggers for each subsystem.
// ─────────────────────────────────────────────────────────────

import config from '../config.js';

/** @type {import('pino').Logger | null} */
let _root = null;

/**
 * Bind the root Pino logger (called once from server.js).
 * @param {import('pino').Logger} pinoInstance
 */
export function bindLogger(pinoInstance) {
  _root = pinoInstance;
}

/**
 * Create a namespaced child logger.
 * @param {string} namespace — e.g. 'ws', 'simulation', 'api'
 * @returns {{ info: Function, warn: Function, error: Function, debug: Function }}
 */
export function createLogger(namespace) {
  const prefix = `[${namespace}]`;

  // If Pino is available, use structured logging
  if (_root) {
    const child = _root.child({ ns: namespace });
    return {
      info: (msg, data) => child.info(data ?? {}, `${prefix} ${msg}`),
      warn: (msg, data) => child.warn(data ?? {}, `${prefix} ${msg}`),
      error: (msg, data) => child.error(data ?? {}, `${prefix} ${msg}`),
      debug: (msg, data) => {
        if (config.logging.debug) child.debug(data ?? {}, `${prefix} ${msg}`);
      },
    };
  }

  // Fallback console logger (before Fastify boots)
  return {
    info: (msg, data) => console.log(prefix, msg, data ?? ''),
    warn: (msg, data) => console.warn(prefix, msg, data ?? ''),
    error: (msg, data) => console.error(prefix, msg, data ?? ''),
    debug: (msg, data) => {
      if (config.logging.debug) console.debug(prefix, msg, data ?? '');
    },
  };
}
