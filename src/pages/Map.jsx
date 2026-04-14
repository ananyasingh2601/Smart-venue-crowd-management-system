import React, { useState } from 'react';
import { Navigation2, Coffee, X } from 'lucide-react';
import useStadiumData from '../hooks/useStadiumData';

const getDensityColor = (density) => {
  if (density < 30) return '#22C55E';
  if (density < 75) return '#F59E0B';
  return '#EF4444';
};

const Map = () => {
  const { sections: rawSections } = useStadiumData();
  const [selectedSection, setSelectedSection] = useState(null);

  // Transform backend section data {A: {density: 0.82, ...}} into
  // the array format the SVG renderer expects
  const sections = rawSections
    ? Object.entries(rawSections).map(([id, data]) => ({
        id,
        density: Math.round(data.density * 100),
        wait: data.waitFood,
        concession: data.concession,
      }))
    : [];

  const handleSectionClick = (section) => {
    setSelectedSection(section);
  };

  const stadiumSectors = [
    { id: 'A', path: "M 150 50 L 250 50 L 200 120 L 150 120 Z" },
    { id: 'B', path: "M 250 50 L 350 100 L 250 170 L 200 120 Z" },
    { id: 'C', path: "M 350 100 L 350 200 L 250 220 L 250 170 Z" },
    { id: 'D', path: "M 350 200 L 250 300 L 200 250 L 250 220 Z" },
    { id: 'E', path: "M 250 300 L 150 300 L 150 250 L 200 250 Z" },
    { id: 'F', path: "M 150 300 L 50 200 L 120 170 L 150 250 Z" },
    { id: 'G', path: "M 50 200 L 50 100 L 120 120 L 120 170 Z" },
    { id: 'H', path: "M 50 100 L 150 50 L 150 120 L 120 120 Z" },
  ];

  return (
    <div className="flex flex-col h-full bg-stadium-dark relative animate-in fade-in duration-500">
      <header className="pt-6 pb-2 px-5 border-b border-gray-800/60 sticky top-0 z-10 bg-stadium-card/90 backdrop-blur">
        <h1 className="text-xl font-bold text-white tracking-tight">Live Heat Map</h1>
        <p className="text-xs text-gray-400 mt-1">Real-time crowd density across the stadium</p>
      </header>

      <div className="flex-1 flex justify-center items-center p-4">
        {sections.length === 0 ? (
          <div className="text-gray-500 text-sm animate-pulse">Connecting to live data…</div>
        ) : (
        <div className="relative w-full max-w-sm aspect-square">
          <svg viewBox="0 0 400 350" className="w-full h-full drop-shadow-[0_0_20px_rgba(34,197,94,0.1)]">
            <rect x="150" y="120" width="100" height="130" rx="20" fill="#22C55E" opacity="0.15" stroke="#22C55E" strokeWidth="2" />
            <circle cx="200" cy="185" r="20" fill="none" stroke="#22C55E" strokeWidth="2" />
            
            {stadiumSectors.map((sector) => {
              const data = sections.find(s => s.id === sector.id);
              if (!data) return null;
              return (
                <g key={sector.id} onClick={() => handleSectionClick(data)} className="cursor-pointer transition-transform hover:scale-[1.02] origin-center -ml-1">
                  <path 
                    d={sector.path} 
                    fill={getDensityColor(data.density)}
                    fillOpacity="0.8"
                    stroke="#0B0F19"
                    strokeWidth="5"
                    className="transition-colors duration-1000 ease-in-out"
                  />
                  <text 
                    x={sector.id === 'A' ? 195 : sector.id === 'B' ? 265 : sector.id === 'C' ? 305 : sector.id === 'D' ? 260 : sector.id === 'E' ? 195 : sector.id === 'F' ? 130 : sector.id === 'G' ? 85 : 130} 
                    y={sector.id === 'A' ? 80 : sector.id === 'B' ? 100 : sector.id === 'C' ? 165 : sector.id === 'D' ? 230 : sector.id === 'E' ? 280 : sector.id === 'F' ? 230 : sector.id === 'G' ? 165 : 100} 
                    fill="#fff" 
                    fontSize="18" 
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {sector.id}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        )}
      </div>

      {selectedSection && (
        <div className="absolute bottom-0 w-full animate-in slide-in-from-bottom-5 duration-300 z-50">
          <div className="bg-stadium-card border-t border-gray-700 rounded-t-3xl p-6 shadow-2xl relative pb-8">
            <button 
              onClick={() => setSelectedSection(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-800 rounded-full p-1"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-xl font-bold text-white">
                {selectedSection.id}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Section {selectedSection.id}</h2>
                <span className="text-sm font-medium text-gray-400">Density: {selectedSection.density}%</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-3">
                  <Coffee className="text-stadium-accent" size={20} />
                  <div>
                    <p className="text-sm text-gray-400">Nearest Concession</p>
                    <p className="font-bold text-white text-lg">{selectedSection.concession}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-1">Wait Time</div>
                  <div className={`px-2.5 py-1 rounded-full text-xs font-bold bg-gray-800 ${
                    selectedSection.wait < 5 ? 'text-stadium-success' : selectedSection.wait < 10 ? 'text-stadium-warning' : 'text-stadium-danger'
                  }`}>
                    {selectedSection.wait} mins
                  </div>
                </div>
              </div>
              
              <button className="w-full bg-stadium-accent text-[#0B0F19] font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-400 transition-colors">
                <Navigation2 size={18} className="rotate-45" />
                Navigate Here
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
