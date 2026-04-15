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
        if (prev.find(s => s.id === data.id)) return prev.filter(s => s.id !== data.id);
        if (prev.length < 2) return [...prev, data];
        return [prev[0], data];
      });
    } else {
      setSelectedSection(data);
    }
  };

  const comparisonPair = compareSelections.length === 2 ? compareSelections : null;
  const hasPopup = (selectedSection && !compareMode) || comparisonPair;

  const getWinner = (a, b, key, lower = true) => {
    if (a[key] === b[key]) return null;
    return lower ? (a[key] < b[key] ? 'A' : 'B') : (a[key] > b[key] ? 'A' : 'B');
  };

  return (
    <div className="flex flex-col h-full bg-[#070B14] page-enter overflow-hidden">
      {/* Header */}
      <header className="pt-5 pb-3 px-5 shrink-0 bg-[#070B14] border-b border-white/[0.04] z-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-extrabold gradient-text">Live Heat Map</h1>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              {compareMode ? 'Tap two sections to compare' : 'Real-time crowd density • Updates every 8s'}
            </p>
          </div>
          <button
            onClick={() => { setCompareMode(!compareMode); setCompareSelections([]); setSelectedSection(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all duration-200 shrink-0 ${
              compareMode
                ? 'bg-stadium-accent/20 text-stadium-accent border border-stadium-accent/30'
                : 'glass text-gray-400 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <GitCompareArrows size={12} />
            {compareMode ? 'Exit' : 'Compare'}
          </button>
        </div>
      </header>

      {/* Map — shrinks when popup is open */}
      <div className={`flex justify-center items-center p-3 transition-all duration-300 ${hasPopup ? 'h-[35vh]' : 'flex-1'}`}>
        {sections.length === 0 ? (
          <div className="text-gray-500 text-sm animate-shimmer px-6 py-3 rounded-full glass">Connecting to live data…</div>
        ) : (
          <div className="relative w-full h-full max-w-sm">
            <svg viewBox="0 0 400 350" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
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

            {/* Legend — hide when popup is open */}
            {!hasPopup && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 glass rounded-full px-4 py-2 z-20">
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
            )}
          </div>
        )}
      </div>

      {/* ── Section Detail Popup — part of the flow, not absolute ── */}
      {selectedSection && !compareMode && (
        <div className="shrink-0 overflow-y-auto z-20 border-t border-white/[0.08]" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
          <div className="bg-[#0D1117] p-5 pb-24">
            <button
              onClick={() => setSelectedSection(null)}
              className="absolute top-2 right-4 text-gray-500 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-full p-1.5 transition-all z-30"
              style={{ position: 'relative', float: 'right', marginTop: '-4px' }}
            >
              <X size={16} />
            </button>

            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black text-white shrink-0"
                style={{ background: getDensityColor(selectedSection.density) + '22', border: `1px solid ${getDensityColor(selectedSection.density)}33` }}>
                {selectedSection.id}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">Section {selectedSection.id}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold" style={{ color: getDensityColor(selectedSection.density) }}>
                    {getDensityLabel(selectedSection.density)}
                  </span>
                  <span className="text-[11px] text-gray-500">• {selectedSection.density}%</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Food', val: `${selectedSection.waitFood}m`, emoji: '🍔' },
                { label: 'Drinks', val: `${selectedSection.waitDrinks}m`, emoji: '🍺' },
                { label: 'WC', val: `${selectedSection.waitBathroom}m`, emoji: '🚻' },
              ].map(s => (
                <div key={s.label} className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/[0.06]">
                  <p className="text-base mb-0.5">{s.emoji}</p>
                  <p className="text-white font-bold text-sm">{s.val}</p>
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Concession */}
            <div className="bg-white/[0.04] rounded-xl p-3 mb-4 flex items-center gap-3 border border-white/[0.06]">
              <Coffee className="text-stadium-accent shrink-0" size={16} />
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nearest Concession</p>
                <p className="font-bold text-white text-sm">{selectedSection.concession}</p>
              </div>
            </div>

            <button className="w-full bg-gradient-to-r from-stadium-accent to-yellow-500 text-[#070B14] font-bold py-3 rounded-xl
              flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg shadow-stadium-accent/20">
              <Navigation2 size={14} className="rotate-45" />
              Navigate Here
            </button>
          </div>
        </div>
      )}

      {/* ── Comparison Overlay — part of the flow, not absolute ── */}
      {comparisonPair && (
        <div className="shrink-0 overflow-y-auto z-20 border-t border-white/[0.08]" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
          <div className="bg-[#0D1117] p-5 pb-24">
            <button
              onClick={() => setCompareSelections([])}
              className="text-gray-500 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-full p-1.5 transition-all z-30"
              style={{ float: 'right', marginTop: '-4px' }}
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <GitCompareArrows className="text-stadium-accent" size={16} />
              <h2 className="text-base font-extrabold text-white">Section Comparison</h2>
            </div>

            {/* Side by Side Headers */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {comparisonPair.map((s) => (
                <div key={s.id} className="bg-white/[0.04] rounded-xl p-2.5 text-center border border-white/[0.06]">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white mx-auto mb-1.5"
                    style={{ background: getDensityColor(s.density) + '22', border: `1px solid ${getDensityColor(s.density)}33` }}
                  >
                    {s.id}
                  </div>
                  <p className="text-white font-bold text-xs">Section {s.id}</p>
                  <p className="text-[9px] font-semibold mt-0.5" style={{ color: getDensityColor(s.density) }}>
                    {s.density}% • {getDensityLabel(s.density)}
                  </p>
                </div>
              ))}
            </div>

            {/* Metrics Comparison */}
            <div className="space-y-1.5 mb-4">
              {[
                { label: '🏟️ Density', key: 'density', unit: '%', lower: true },
                { label: '🍔 Food', key: 'waitFood', unit: 'm', lower: true },
                { label: '🍺 Drinks', key: 'waitDrinks', unit: 'm', lower: true },
                { label: '🚻 WC', key: 'waitBathroom', unit: 'm', lower: true },
              ].map(metric => {
                const winner = getWinner(comparisonPair[0], comparisonPair[1], metric.key, metric.lower);
                return (
                  <div key={metric.key} className="bg-white/[0.04] rounded-lg px-3 py-2.5 flex items-center justify-between border border-white/[0.06]">
                    <span className="text-[10px] text-gray-400 font-semibold">{metric.label}</span>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold ${winner === 'A' ? 'text-emerald-400' : 'text-white'}`}>
                        {comparisonPair[0][metric.key]}{metric.unit}
                        {winner === 'A' && <Trophy className="inline ml-1 text-emerald-400" size={9} />}
                      </span>
                      <span className="text-[8px] text-gray-600">vs</span>
                      <span className={`text-xs font-bold ${winner === 'B' ? 'text-emerald-400' : 'text-white'}`}>
                        {comparisonPair[1][metric.key]}{metric.unit}
                        {winner === 'B' && <Trophy className="inline ml-1 text-emerald-400" size={9} />}
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
                <div className="bg-emerald-500/[0.06] rounded-xl p-3 border border-emerald-500/20">
                  <p className="text-[11px] text-emerald-400 font-semibold">
                    💡 Section {betterSection.id} is {diff}% less crowded — head there!
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
