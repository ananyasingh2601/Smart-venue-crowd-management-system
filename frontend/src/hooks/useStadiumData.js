import { useState, useEffect } from 'react';

const API_URL = 'https://smart-venue-crowd-management-system-2.onrender.com/api/v1/events/evt_001';

export default function useStadiumData() {
  const [sections, setSections] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let interval;

    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}`);
        const data = await res.json();

        setSections(data.sections);
        setLastUpdated(Date.now());
        setConnected(true);
      } catch (err) {
        console.warn('[useStadiumData] REST fetch failed:', err);
        setConnected(false);
      }
    };

    fetchData(); // initial
    interval = setInterval(fetchData, 5000); // poll every 5s

    return () => clearInterval(interval);
  }, []);

  const aggregates = sections
    ? (() => {
        const secs = Object.values(sections);
        const avg = (fn) =>
          Math.round(secs.reduce((sum, s) => sum + fn(s), 0) / secs.length);

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