// ─────────────────────────────────────────────────────────────
// StadiumPulse — Fastify Server Entry Point (v2)
// Production-aligned setup with:
//   • dotenv config loading
//   • structured Pino logging
//   • rate limiting
//   • modular route registration
//   • heartbeat + simulation lifecycle
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';

import config from './config.js';
import { bindLogger, createLogger } from './lib/logger.js';
import apiRoutes from './routes/api.js';
import wsRoutes from './routes/ws.js';
import { startSimulation, stopSimulation } from './services/simulation.js';
import { startHeartbeat, stopHeartbeat } from './services/broadcaster.js';
import { purgeStaleSessions } from './state/store.js';

const log = createLogger('server');

async function start() {
  // ── Fastify Instance ────────────────────────────────────
  const app = Fastify({
    logger: {
      level: config.logging.level,
      transport: config.server.env === 'development'
        ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
        : undefined,
    },
  });

  // Bind the Pino instance so our logger module can use it
  bindLogger(app.log);

  // ── Plugins ─────────────────────────────────────────────
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await app.register(websocket);

  await app.register(rateLimit, {
    max: config.rateLimit.global.max,
    timeWindow: config.rateLimit.global.timeWindow,
  });

  // ── Routes ──────────────────────────────────────────────
  await app.register(apiRoutes);
  await app.register(wsRoutes);

  // ── Graceful Shutdown ───────────────────────────────────
  const shutdown = async (signal) => {
    log.info(`${signal} received — shutting down`);
    stopSimulation();
    stopHeartbeat();
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── Periodic Maintenance ────────────────────────────────
  // Purge stale chat sessions every 30 minutes
  setInterval(() => purgeStaleSessions(), 30 * 60 * 1000);

  // ── Start ───────────────────────────────────────────────
  try {
    await app.listen({ port: config.server.port, host: config.server.host });

    const banner = `
  ┌──────────────────────────────────────────────────┐
  │  StadiumPulse API v2.0                           │
  │                                                  │
  │  REST   →  http://localhost:${config.server.port}/api/v1       │
  │  WS     →  ws://localhost:${config.server.port}/api/v1/...    │
  │  Health →  http://localhost:${config.server.port}/api/v1/health│
  │                                                  │
  │  Env: ${config.server.env.padEnd(14)}Log: ${config.logging.level.padEnd(10)}│
  │  Debug: ${String(config.logging.debug).padEnd(12)}Tick: ${config.simulation.tickMs}ms       │
  └──────────────────────────────────────────────────┘`;

    console.log(banner);

    // Boot subsystems
    startSimulation(config.defaultEventId);
    startHeartbeat();

  } catch (err) {
    log.error('startup failed', { error: err.message });
    process.exit(1);
  }
}

start();
