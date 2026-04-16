// ─────────────────────────────────────────────────────────────
// StadiumPulse — useStadiumData Hook
// Manages a WebSocket connection to the backend simulation
// service. Receives an initial full state snapshot, then
// applies delta patches on every 8-second tick.
// Falls back to REST polling if WS fails.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { wsUrl } from '../lib/api';

const WS_URL = wsUrl('/api/v1/events/evt_001/live');

export default function useStadiumData() {
  const [sections, setSections] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    // Don't create duplicate connections
    if (wsRef.current && wsRef.current.readyState <= 1) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useStadiumData] WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'state_snapshot') {
          // Full state on first connect
          setSections(msg.sections);
          setLastUpdated(msg.timestamp);
        }

        if (msg.type === 'density_update') {
          // Delta patch — merge into existing state
          setSections((prev) => {
            if (!prev) return msg.sections;
            const next = { ...prev };
            for (const [id, patch] of Object.entries(msg.sections)) {
              next[id] = { ...next[id], ...patch };
            }
            return next;
          });
          setLastUpdated(msg.timestamp);
        }
      } catch (err) {
        console.warn('[useStadiumData] Failed to parse message:', err);
      }
    };

    ws.onclose = () => {
      console.log('[useStadiumData] WebSocket disconnected — reconnecting in 3s');
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.warn('[useStadiumData] WebSocket error, falling back to REST');
      ws.close();
    };
  }, []);

  // Initial connection
  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  // Compute aggregate values from sections
  const aggregates = sections
    ? (() => {
        const secs = Object.values(sections);
        const avg = (fn) => Math.round(secs.reduce((sum, s) => sum + fn(s), 0) / secs.length);
        return {
          density: avg((s) => (s.density || 0) * 100),
          food: avg((s) => s.waitFood || 0),
          drinks: avg((s) => s.waitDrinks || 0),
          bathrooms: avg((s) => s.waitBathroom || 0),
        };
      })()
    : { density: 0, food: 0, drinks: 0, bathrooms: 0 };

  return {
    sections,
    connected,
    lastUpdated,
    ...aggregates,
  };
}
