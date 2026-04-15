import React, { useState, useEffect } from 'react';
import { Coffee, Utensils, Droplets, Presentation, Wifi, WifiOff, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStadiumData from '../hooks/useStadiumData';

// ── Wait-Time Metric Card ────────────────────────────────────
const MetricCard = ({ title, time, icon: Icon, onClick }) => {
  const getStyle = (t) => {
    if (t < 5) return { glow: 'glow-green', border: 'border-emerald-500/20', text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' };
    if (t <= 10) return { glow: 'glow-amber', border: 'border-amber-500/20', text: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-400' };
    return { glow: 'glow-red', border: 'border-red-500/20', text: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' };
  };
  const s = getStyle(time);

  return (
    <div
      onClick={onClick}
      className={`glass rounded-2xl p-4 ${s.border} ${s.glow} flex flex-col justify-between cursor-pointer
        hover:bg-white/[0.06] active:scale-[0.97] transition-all duration-200 ease-out`}
    >
      <div className="flex justify-between items-start mb-5">
        <div className="p-2.5 bg-white/[0.04] rounded-xl">
          <Icon className="text-gray-300" size={18} />
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${s.bg} ${s.text} flex items-center gap-1.5`}>
          <div className={`w-1.5 h-1.5 rounded-full ${s.dot} live-dot`} />
          {time} min
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-white mt-0.5 num-transition">{time < 5 ? 'Low' : time <= 10 ? 'Moderate' : 'High'}</p>
      </div>
    </div>
  );
};

// ── Live Indicator Badge ─────────────────────────────────────
const LiveBadge = ({ connected, lastUpdated }) => {
  const [ago, setAgo] = useState(0);
  useEffect(() => {
    const t = setInterval(() => {
      if (lastUpdated) setAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
      connected
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border border-red-500/20'
    }`}>
      {connected ? (
        <>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
          {ago < 2 ? 'Live' : `${ago}s ago`}
        </>
      ) : (
        <>
          <WifiOff size={10} />
          Offline
        </>
      )}
    </div>
  );
};

// ── Home View ────────────────────────────────────────────────
const Home = () => {
  const navigate = useNavigate();
  const { density, food, drinks, bathrooms, connected, lastUpdated } = useStadiumData();

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (density / 100) * circumference;

  const getDensityStyle = (d) => {
    if (d < 40) return { label: 'Quiet', color: 'text-emerald-400', stroke: 'stroke-emerald-400', glow: '0 0 30px rgba(34,197,94,0.2)' };
    if (d < 65) return { label: 'Moderate', color: 'text-amber-400', stroke: 'stroke-amber-400', glow: '0 0 30px rgba(245,158,11,0.2)' };
    if (d < 85) return { label: 'Busy', color: 'text-red-400', stroke: 'stroke-red-400', glow: '0 0 30px rgba(239,68,68,0.2)' };
    return { label: 'Very Busy', color: 'text-red-500', stroke: 'stroke-red-500', glow: '0 0 40px rgba(239,68,68,0.3)' };
  };
  const ds = getDensityStyle(density);

  return (
    <div className="p-5 space-y-6 page-enter">

      {/* ── Header ──────────────────────────────────────── */}
      <header className="pt-3 flex justify-between items-start">
        <div>
          <p className="text-stadium-accent text-[11px] font-bold tracking-[0.25em] uppercase">Super Bowl LIX</p>
          <h1 className="text-[28px] font-extrabold gradient-text leading-tight mt-1">Welcome<br/>to the Game</h1>
        </div>
        <LiveBadge connected={connected} lastUpdated={lastUpdated} />
      </header>

      {/* ── Density Meter ───────────────────────────────── */}
      <section className="glass rounded-3xl p-6 relative overflow-hidden glow-blue">
        {/* Ambient bg glow */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-[60px] opacity-20 pointer-events-none"
          style={{ background: ds.glow.includes('emerald') ? '#22C55E' : ds.glow.includes('amber') ? '#F59E0B' : '#EF4444' }} />

        <div className="flex items-center gap-6 relative z-10">
          <div className="relative w-28 h-28 flex items-center justify-center shrink-0 animate-pulse-ring">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
              {/* Track */}
              <circle cx="60" cy="60" r={radius}
                className="stroke-white/[0.06]" strokeWidth="8" fill="transparent" />
              {/* Value arc */}
              <circle cx="60" cy="60" r={radius}
                className={`${ds.stroke} transition-all duration-1000 ease-out`}
                strokeWidth="8" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(${ds.glow})` }} />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-2xl font-black text-white num-transition">{density}%</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Crowd Density</p>
            <p className={`text-lg font-extrabold mt-1 ${ds.color} num-transition`}>{ds.label}</p>
            <p className="text-[13px] text-gray-300/70 mt-2 leading-relaxed">
              {density >= 65 ? 'High traffic areas detected. Consider alternate routes.' : 'Crowd levels are manageable. Good time to move around.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Wait Time Cards ─────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-white">Predicted Wait Times</h2>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
            AI Powered
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard title="Food Stands" time={food} icon={Utensils} onClick={() => navigate('/map')} />
          <MetricCard title="Drinks & Bars" time={drinks} icon={Coffee} onClick={() => navigate('/map')} />
          <MetricCard title="Restrooms" time={bathrooms} icon={Droplets} onClick={() => navigate('/map')} />
          <div
            onClick={() => navigate('/pitch')}
            className="glass rounded-2xl p-4 border border-stadium-accent/10 flex flex-col justify-center items-center gap-3
              cursor-pointer hover:bg-stadium-accent/[0.06] active:scale-[0.97] transition-all duration-200 glow-accent"
          >
            <div className="w-11 h-11 rounded-full bg-stadium-accent/10 flex items-center justify-center text-stadium-accent animate-float">
              <Presentation size={20} />
            </div>
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Pitch Deck</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
