import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Clock, RefreshCw, Zap } from 'lucide-react';

const slotLabels = ['+7.5m', '+15m', '+22.5m', '+30m'];

const getDensityColor = (d) => {
  if (d < 0.3) return '#22C55E';
  if (d < 0.6) return '#F59E0B';
  if (d < 0.8) return '#F97316';
  return '#EF4444';
};

const getDensityLabel = (d) => {
  if (d < 0.3) return 'Low';
  if (d < 0.6) return 'Moderate';
  if (d < 0.8) return 'Busy';
  return 'Very Busy';
};

const getTrendIcon = (current, future) => {
  const diff = future - current;
  if (diff > 0.05) return <TrendingUp className="text-red-400" size={12} />;
  if (diff < -0.05) return <TrendingDown className="text-emerald-400" size={12} />;
  return <Minus className="text-gray-500" size={12} />;
};

const sectionNames = {
  A: 'Grill & Chill', B: 'Beer Garden', C: 'Hot Dog Cart', D: 'Pizza Stand',
  E: 'Taco Truck', F: 'Craft Beer Bar', G: 'Burger Barn', H: 'Pretzel Palace',
};

const Forecast = () => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3001/api/v1/events/evt_001/forecast');
      const data = await res.json();
      setForecast(data);
      setLastRefresh(Date.now());
    } catch (err) {
      console.warn('Failed to fetch forecast:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
    const interval = setInterval(fetchForecast, 30000);
    return () => clearInterval(interval);
  }, [fetchForecast]);

  const sections = forecast
    ? Object.entries(forecast.sections).map(([id, slots]) => ({
        id,
        name: sectionNames[id] || `Section ${id}`,
        currentDensity: slots[0]?.density ?? 0.5,
        slots,
      }))
    : [];

  // Sort by predicted density at selected slot (busiest first)
  const sortedSections = [...sections].sort(
    (a, b) => (b.slots[selectedSlot]?.density ?? 0) - (a.slots[selectedSlot]?.density ?? 0)
  );

  return (
    <div className="flex flex-col h-full bg-[#070B14] page-enter overflow-y-auto">
      {/* Header */}
      <header className="pt-5 pb-3 px-5 sticky top-0 z-10 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-extrabold gradient-text flex items-center gap-2">
              <Zap className="text-stadium-accent" size={18} />
              Crowd Forecast
            </h1>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">AI-predicted density • Next 30 minutes</p>
          </div>
          <button
            onClick={fetchForecast}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold text-gray-400
              hover:text-white hover:bg-white/[0.06] transition-all active:scale-95"
          >
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      {/* Time Slot Selector */}
      <div className="px-5 pt-4 pb-2 flex gap-2">
        {slotLabels.map((label, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedSlot(idx)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
              selectedSlot === idx
                ? 'bg-gradient-to-r from-stadium-accent to-yellow-500 text-[#070B14] shadow-lg shadow-stadium-accent/20'
                : 'glass text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Clock size={10} />
              {label}
            </div>
          </button>
        ))}
      </div>

      {/* Section Forecast Cards */}
      <div className="p-5 space-y-3 pb-28">
        {loading && sections.length === 0 ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-12 h-12 rounded-full glass flex items-center justify-center animate-shimmer">
              <Zap className="text-gray-600" size={24} />
            </div>
            <p className="text-gray-400 text-sm mt-4">Generating forecast…</p>
          </div>
        ) : (
          sortedSections.map((section, idx) => {
            const prediction = section.slots[selectedSlot];
            if (!prediction) return null;
            const color = getDensityColor(prediction.density);
            const pct = Math.round(prediction.density * 100);
            const barWidth = pct;

            return (
              <div
                key={section.id}
                className="glass rounded-2xl p-4 relative overflow-hidden group transition-all duration-300"
                style={{ animation: `fadeSlideUp 0.3s ease-out ${idx * 0.04}s forwards`, opacity: 0 }}
              >
                {/* Section Header */}
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white"
                      style={{ background: color + '22', border: `1px solid ${color}33` }}
                    >
                      {section.id}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">{section.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {getTrendIcon(section.currentDensity, prediction.density)}
                        <span className="text-xs font-semibold" style={{ color }}>
                          {getDensityLabel(prediction.density)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-white">{pct}%</p>
                    <p className="text-[10px] text-gray-500 font-semibold">
                      {Math.round(prediction.confidence * 100)}% conf
                    </p>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out forecast-bar-grow"
                    style={{
                      width: `${barWidth}%`,
                      background: `linear-gradient(90deg, ${color}88, ${color})`,
                      boxShadow: `0 0 12px ${color}44`,
                    }}
                  />
                </div>

                {/* Mini Timeline */}
                <div className="flex gap-1 mt-3">
                  {section.slots.map((slot, si) => {
                    const sc = getDensityColor(slot.density);
                    return (
                      <div
                        key={si}
                        className={`flex-1 rounded-md py-1 text-center text-[9px] font-bold transition-all duration-200 ${
                          si === selectedSlot ? 'ring-1 ring-white/20' : ''
                        }`}
                        style={{ background: sc + '22', color: sc }}
                      >
                        {Math.round(slot.density * 100)}%
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Forecast;
