// ─────────────────────────────────────────────────────────────
// StadiumPulse — Fastify Server Entry Point
// Boots the API gateway, registers plugins, mounts routes,
// and starts the crowd simulation service.
// ─────────────────────────────────────────────────────────────

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';

import apiRoutes from './routes/api.js';
import wsRoutes from './routes/ws.js';
import { startSimulation } from './services/simulation.js';

const PORT = process.env.PORT || 3001;
const HOST = '0.0.0.0';
const DEFAULT_EVENT_ID = 'evt_001';

async function start() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
    },
  });

  // ── Plugins ─────────────────────────────────────────────
  await app.register(cors, {
    origin: true,           // Allow all origins during development
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  await app.register(websocket);

  // ── Routes ──────────────────────────────────────────────
  await app.register(apiRoutes);
  await app.register(wsRoutes);

  // ── Start ───────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: HOST });

    console.log(`\n  ┌─────────────────────────────────────────────┐`);
    console.log(`  │  StadiumPulse API running on port ${PORT}        │`);
    console.log(`  │                                             │`);
    console.log(`  │  REST   →  http://localhost:${PORT}/api/v1      │`);
    console.log(`  │  WS     →  ws://localhost:${PORT}/api/v1/...   │`);
    console.log(`  │  Health →  http://localhost:${PORT}/api/v1/health│`);
    console.log(`  └─────────────────────────────────────────────┘\n`);

    // Boot the crowd simulation
    startSimulation(DEFAULT_EVENT_ID);

  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
