import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../lib/api';

const EVENT_ID = import.meta.env.VITE_EVENT_ID || 'evt_001';
const POLL_MS = 5000;

function buildActivityFromDelta(nextSections, prevSections) {
  if (!nextSections) return [];

  const entries = [];
  for (const [sectionId, next] of Object.entries(nextSections)) {
    const prev = prevSections?.[sectionId];
    if (!prev) continue;

    const nextDensity = Math.round((next.density || 0) * 100);
    const prevDensity = Math.round((prev.density || 0) * 100);
    const densityDelta = nextDensity - prevDensity;

    if (densityDelta >= 8) {
      entries.push({
        id: `density-up-${sectionId}-${Date.now()}`,
        level: nextDensity >= 80 ? 'danger' : 'warning',
        message: `Section ${sectionId} congestion rising to ${nextDensity}%`,
        ts: Date.now(),
      });
    } else if (densityDelta <= -8) {
      entries.push({
        id: `density-down-${sectionId}-${Date.now()}`,
        level: 'safe',
        message: `Section ${sectionId} density easing to ${nextDensity}%`,
        ts: Date.now(),
      });
    }

    const waitDelta = (next.waitFood || 0) - (prev.waitFood || 0);
    if (waitDelta <= -3) {
      entries.push({
        id: `wait-down-${sectionId}-${Date.now()}`,
        level: 'safe',
        message: `Food queue reduced near Section ${sectionId}`,
        ts: Date.now(),
      });
    }
  }

  return entries.slice(0, 4);
}

function computeAggregates(sectionMap) {
  if (!sectionMap) {
    return {
      density: 0,
      food: 0,
      drinks: 0,
      bathrooms: 0,
      avgWaitTime: 0,
      alertsCount: 0,
      safetyScore: 100,
    };
  }

  const secs = Object.values(sectionMap);
  if (!secs.length) {
    return {
      density: 0,
      food: 0,
      drinks: 0,
      bathrooms: 0,
      avgWaitTime: 0,
      alertsCount: 0,
      safetyScore: 100,
    };
  }

  const avg = (fn) => Math.round(secs.reduce((sum, s) => sum + fn(s), 0) / secs.length);

  const density = avg((s) => (s.density || 0) * 100);
  const food = avg((s) => s.waitFood || 0);
  const drinks = avg((s) => s.waitDrinks || 0);
  const bathrooms = avg((s) => s.waitBathroom || 0);
  const avgWaitTime = Math.round((food + drinks + bathrooms) / 3);
  const alertsCount = secs.filter((s) => (s.density || 0) >= 0.8).length;
  const safetyScore = Math.max(0, Math.min(100, Math.round(100 - density * 0.65 - alertsCount * 4)));

  return {
    density,
    food,
    drinks,
    bathrooms,
    avgWaitTime,
    alertsCount,
    safetyScore,
  };
}

export default function useStadiumData() {
  const [eventMeta, setEventMeta] = useState(null);
  const [sections, setSections] = useState(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activity, setActivity] = useState([
    {
      id: 'boot-1',
      level: 'safe',
      message: 'Control center initialized',
      ts: Date.now(),
    },
  ]);

  const previousSectionsRef = useRef(null);

  useEffect(() => {
    let interval;
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [eventRes, stateRes] = await Promise.all([
          fetch(apiUrl(`/api/v1/events/${EVENT_ID}`)),
          fetch(apiUrl(`/api/v1/events/${EVENT_ID}/state`)),
        ]);

        if (!eventRes.ok || !stateRes.ok) {
          throw new Error(`event=${eventRes.status}, state=${stateRes.status}`);
        }

        const [eventData, stateData] = await Promise.all([eventRes.json(), stateRes.json()]);
        if (!isMounted) return;

        const nextSections = stateData.sections || null;
        const deltaActivity = buildActivityFromDelta(nextSections, previousSectionsRef.current);

        setEventMeta(eventData);
        setSections(nextSections);
        setLastUpdated(Date.now());
        setConnected(true);

        if (deltaActivity.length > 0) {
          setActivity((prev) => [...deltaActivity, ...prev].slice(0, 25));
        }

        previousSectionsRef.current = nextSections;
      } catch (err) {
        if (!isMounted) return;
        console.warn('[useStadiumData] REST fetch failed:', err);
        setConnected(false);
      }
    };

    fetchData();
    interval = setInterval(fetchData, POLL_MS);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const aggregates = computeAggregates(sections);
  const statusLabel =
    aggregates.density >= 82 ? 'Overcrowded' :
    aggregates.density >= 60 ? 'Live' :
    'Normal';

  return {
    eventId: EVENT_ID,
    eventName: eventMeta?.name || 'Super Bowl LIX',
    eventStatus: eventMeta?.status || statusLabel,
    sections,
    activity,
    connected,
    lastUpdated,
    ...aggregates,
  };
}