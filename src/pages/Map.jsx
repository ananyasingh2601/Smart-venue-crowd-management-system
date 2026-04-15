import React, { useState, useEffect } from 'react';
import { Navigation2, Coffee, X, TrendingDown, TrendingUp, AlertTriangle, GitCompareArrows, Trophy } from 'lucide-react';
import useStadiumData from '../hooks/useStadiumData';

const getDensityColor = (d) => {
  if (d < 30) return '#22C55E';
  if (d < 60) return '#F59E0B';
  if (d < 80) return '#F97316';
  return '#EF4444';
};

const getDensityLabel = (d) => {
  if (d < 30) return 'Quiet';
  if (d < 60) return 'Moderate';
  if (d < 80) return 'Busy';
  return 'Very Busy';
};

const Map = () => {
  const { sections: rawSections } = useStadiumData();
  const [selectedSection, setSelectedSection] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelections, setCompareSelections] = useState([]);

  // Track section views for achievement
  useEffect(() => {
    if (selectedSection) {
      try {
        const p = JSON.parse(localStorage.getItem('stadiumpulse_progress') || '{}');
        const viewed = new Set(p._viewedSections || []);
        viewed.add(selectedSection.id);
        p._viewedSections = [...viewed];
        if (viewed.size >= 8) p.explorer = 8;
        localStorage.setItem('stadiumpulse_progress', JSON.stringify(p));
      } catch {}
    }
  }, [selectedSection]);

  const sections = rawSections
    ? Object.entries(rawSections).map(([id, data]) => ({
        id,
        density: Math.round(data.density * 100),
        waitFood: data.waitFood,
        waitDrinks: data.waitDrinks,
        waitBathroom: data.waitBathroom,
        concession: data.concession,
      }))
    : [];

  const stadiumSectors = [
    { id: 'A', path: "M 150 50 L 250 50 L 200 120 L 150 120 Z", cx: 195, cy: 80 },
    { id: 'B', path: "M 250 50 L 350 100 L 250 170 L 200 120 Z", cx: 265, cy: 100 },
    { id: 'C', path: "M 350 100 L 350 200 L 250 220 L 250 170 Z", cx: 305, cy: 165 },
    { id: 'D', path: "M 350 200 L 250 300 L 200 250 L 250 220 Z", cx: 260, cy: 230 },
    { id: 'E', path: "M 250 300 L 150 300 L 150 250 L 200 250 Z", cx: 195, cy: 280 },
    { id: 'F', path: "M 150 300 L 50 200 L 120 170 L 150 250 Z", cx: 130, cy: 230 },
    { id: 'G', path: "M 50 200 L 50 100 L 120 120 L 120 170 Z", cx: 85, cy: 165 },
    { id: 'H', path: "M 50 100 L 150 50 L 150 120 L 120 120 Z", cx: 130, cy: 100 },
  ];

  const handleSectionClick = (data) => {
    if (compareMode) {
      setCompareSelections(prev => {
        // Remove if already selected
        if (prev.find(s => s.id === data.id)) return prev.filter(s => s.id !== data.id);
        if (prev.length < 2) return [...prev, data];
        // Replace the second one
        return [prev[0], data];
      });
    } else {
      setSelectedSection(data);
    }
  };

  const comparisonPair = compareSelections.length === 2 ? compareSelections : null;

  const getWinner = (a, b, key, lower = true) => {
    if (a[key] === b[key]) return null;
    return lower ? (a[key] < b[key] ? 'A' : 'B') : (a[key] > b[key] ? 'A' : 'B');
  };

  return (
    <div className="flex flex-col h-full bg-[#070B14] relative page-enter">
      {/* Header */}
      <header className="pt-5 pb-3 px-5 sticky top-0 z-10 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-extrabold gradient-text">Live Heat Map</h1>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              {compareMode ? 'Tap two sections to compare' : 'Real-time crowd density • Updates every 8s'}
            </p>
          </div>
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSelections([]); setSelectedSection(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 ${
              compareMode
                ? 'bg-stadium-accent/20 text-stadium-accent border border-stadium-accent/30'
                : 'glass text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <GitCompareArrows size={12} />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
        </div>
      </header>

      {/* Map */}
      <div className="flex-1 flex justify-center items-center p-4">
        {sections.length === 0 ? (
          <div className="text-gray-500 text-sm animate-shimmer px-6 py-3 rounded-full glass">Connecting to live data…</div>
        ) : (
          <div className="relative w-full max-w-sm aspect-square">
            <svg viewBox="0 0 400 350" className="w-full h-full">
              {/* Field */}
              <rect x="150" y="120" width="100" height="130" rx="18" fill="#22C55E" opacity="0.08" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.3" />
              <circle cx="200" cy="185" r="18" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeOpacity="0.3" />

              {stadiumSectors.map((sector) => {
                const data = sections.find(s => s.id === sector.id);
                if (!data) return null;
                const color = getDensityColor(data.density);
                const isHot = data.density > 75;
                const isCompareSelected = compareSelections.find(s => s.id === sector.id);

                return (
                  <g key={sector.id} onClick={() => handleSectionClick(data)} className="cursor-pointer">
                    <path
                      d={sector.path}
                      fill={color}
                      fillOpacity={isCompareSelected ? "0.9" : "0.7"}
                      stroke={isCompareSelected ? "#fff" : "#070B14"}
                      strokeWidth={isCompareSelected ? "3" : "4"}
                      className={`transition-all duration-700 ease-in-out ${isHot ? 'animate-map-pulse' : ''}`}
                      style={{ filter: isHot ? `drop-shadow(0 0 8px ${color})` : isCompareSelected ? 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' : 'none' }}
                    />
                    <text x={sector.cx} y={sector.cy} fill="#fff" fontSize="15" fontWeight="800" textAnchor="middle" className="pointer-events-none">
                      {sector.id}
                    </text>
                    <text x={sector.cx} y={sector.cy + 14} fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="600" textAnchor="middle" className="pointer-events-none">
                      {data.density}%
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 glass rounded-full px-4 py-2">
              {[
                { color: '#22C55E', label: 'Low' },
                { color: '#F59E0B', label: 'Mid' },
                { color: '#EF4444', label: 'High' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Section Detail Popup ─────────────────────────── */}
      {selectedSection && !compareMode && (
        <div className="absolute bottom-0 w-full z-50" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
          <div className="glass-strong rounded-t-3xl p-6 pb-8 shadow-2xl relative border-t border-white/[0.08]">
            <button
              onClick={() => setSelectedSection(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-full p-1.5 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                style={{ background: getDensityColor(selectedSection.density) + '22', border: `1px solid ${getDensityColor(selectedSection.density)}33` }}>
                {selectedSection.id}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">Section {selectedSection.id}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold" style={{ color: getDensityColor(selectedSection.density) }}>
                    {getDensityLabel(selectedSection.density)}
                  </span>
                  <span className="text-[11px] text-gray-500">• {selectedSection.density}% capacity</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { label: 'Food', val: `${selectedSection.waitFood}m`, emoji: '🍔' },
                { label: 'Drinks', val: `${selectedSection.waitDrinks}m`, emoji: '🍺' },
                { label: 'WC', val: `${selectedSection.waitBathroom}m`, emoji: '🚻' },
              ].map(s => (
                <div key={s.label} className="glass rounded-xl p-3 text-center">
                  <p className="text-lg mb-0.5">{s.emoji}</p>
                  <p className="text-white font-bold text-sm">{s.val}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-3 mb-4 flex items-center gap-3">
              <Coffee className="text-stadium-accent shrink-0" size={18} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nearest Concession</p>
                <p className="font-bold text-white text-sm">{selectedSection.concession}</p>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-stadium-accent to-yellow-500 text-[#070B14] font-bold py-3.5 rounded-xl
              flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-stadium-accent/20">
              <Navigation2 size={16} className="rotate-45" />
              Navigate Here
            </button>
          </div>
        </div>
      )}

      {/* ── Comparison Overlay ─────────────────────────────── */}
      {comparisonPair && (
        <div className="absolute bottom-0 w-full z-50" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
          <div className="glass-strong rounded-t-3xl p-6 pb-8 shadow-2xl relative border-t border-white/[0.08]">
            <button
              onClick={() => setCompareSelections([])}
              className="absolute top-4 right-4 text-gray-500 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-full p-1.5 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-5">
              <GitCompareArrows className="text-stadium-accent" size={18} />
              <h2 className="text-lg font-extrabold text-white">Section Comparison</h2>
            </div>

            {/* Side by Side Headers */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {comparisonPair.map((s, i) => (
                <div key={s.id} className="glass rounded-xl p-3 text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white mx-auto mb-2"
                    style={{ background: getDensityColor(s.density) + '22', border: `1px solid ${getDensityColor(s.density)}33` }}
                  >
                    {s.id}
                  </div>
                  <p className="text-white font-bold text-sm">Section {s.id}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: getDensityColor(s.density) }}>
                    {s.density}% • {getDensityLabel(s.density)}
                  </p>
                </div>
              ))}
            </div>

            {/* Metrics Comparison */}
            <div className="space-y-2 mb-5">
              {[
                { label: '🏟️ Density', key: 'density', unit: '%', lower: true },
                { label: '🍔 Food Wait', key: 'waitFood', unit: 'm', lower: true },
                { label: '🍺 Drinks Wait', key: 'waitDrinks', unit: 'm', lower: true },
                { label: '🚻 Bathroom Wait', key: 'waitBathroom', unit: 'm', lower: true },
              ].map(metric => {
                const winner = getWinner(comparisonPair[0], comparisonPair[1], metric.key, metric.lower);
                return (
                  <div key={metric.key} className="glass rounded-xl p-3 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-semibold">{metric.label}</span>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-bold ${winner === 'A' ? 'text-emerald-400' : 'text-white'}`}>
                        {comparisonPair[0][metric.key]}{metric.unit}
                        {winner === 'A' && <Trophy className="inline ml-1 text-emerald-400" size={10} />}
                      </span>
                      <span className="text-[9px] text-gray-600">vs</span>
                      <span className={`text-sm font-bold ${winner === 'B' ? 'text-emerald-400' : 'text-white'}`}>
                        {comparisonPair[1][metric.key]}{metric.unit}
                        {winner === 'B' && <Trophy className="inline ml-1 text-emerald-400" size={10} />}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recommendation */}
            {(() => {
              const a = comparisonPair[0], b = comparisonPair[1];
              const betterSection = a.density < b.density ? a : b;
              const diff = Math.abs(a.density - b.density);
              return (
                <div className="glass rounded-xl p-3 border border-emerald-500/20">
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    💡 Section {betterSection.id} is {diff}% less crowded — head there for a better experience!
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;

