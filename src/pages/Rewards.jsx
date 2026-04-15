import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Star, MapPin, MessageSquare, Eye, Clock, Zap, Shield, TrendingUp, Award, Sparkles } from 'lucide-react';

const BADGES = [
  { id: 'early_bird', icon: Clock, label: 'Early Bird', desc: 'Opened the app before the game', color: '#F59E0B', xp: 50, threshold: 1 },
  { id: 'explorer', icon: MapPin, label: 'Explorer', desc: 'Viewed all 8 sections on the map', color: '#3B82F6', xp: 100, threshold: 8 },
  { id: 'crowd_surfer', icon: Eye, label: 'Crowd Surfer', desc: 'Checked density 10+ times', color: '#22C55E', xp: 75, threshold: 10 },
  { id: 'ai_whisperer', icon: MessageSquare, label: 'AI Whisperer', desc: 'Asked 5+ questions to the AI', color: '#8B5CF6', xp: 100, threshold: 5 },
  { id: 'safety_first', icon: Shield, label: 'Safety First', desc: 'Viewed the SOS emergency panel', color: '#EF4444', xp: 25, threshold: 1 },
  { id: 'forecast_guru', icon: TrendingUp, label: 'Forecast Guru', desc: 'Checked crowd predictions 3+ times', color: '#06B6D4', xp: 75, threshold: 3 },
  { id: 'power_user', icon: Zap, label: 'Power User', desc: 'Used the app for 5+ minutes', color: '#F97316', xp: 150, threshold: 5 },
  { id: 'social_star', icon: Star, label: 'Social Star', desc: 'Earned 400+ total XP', color: '#EC4899', xp: 200, threshold: 400 },
];

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('stadiumpulse_progress') || '{}');
  } catch { return {}; }
}

function updateProgress(key, value) {
  const p = getProgress();
  p[key] = value;
  localStorage.setItem('stadiumpulse_progress', JSON.stringify(p));
  return p;
}

// Automatically track some things
function autoTrack() {
  const p = getProgress();
  // Early bird — always unlocked for opening the app
  if (!p.early_bird) updateProgress('early_bird', 1);
  // Power user — track session start
  if (!p._sessionStart) updateProgress('_sessionStart', Date.now());
  // Increment density checks
  updateProgress('crowd_surfer', (p.crowd_surfer || 0) + 1);
  // Forecast guru
  updateProgress('forecast_guru', (p.forecast_guru || 0) + 1);
}

const Rewards = () => {
  const [progress, setProgress] = useState(getProgress());
  const [justUnlocked, setJustUnlocked] = useState(null);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    autoTrack();
    setProgress(getProgress());
  }, []);

  // Check for power_user badge (time-based)
  useEffect(() => {
    const interval = setInterval(() => {
      const p = getProgress();
      if (p._sessionStart) {
        const minutes = (Date.now() - p._sessionStart) / 60000;
        if (minutes >= 5 && (p.power_user || 0) < 5) {
          updateProgress('power_user', 5);
          setProgress(getProgress());
        }
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalXP = BADGES.reduce((sum, b) => {
    const val = progress[b.id] || 0;
    return sum + (val >= b.threshold ? b.xp : 0);
  }, 0);

  // Check social_star
  useEffect(() => {
    if (totalXP >= 400 && (progress.social_star || 0) < 400) {
      updateProgress('social_star', totalXP);
      setProgress(getProgress());
    }
  }, [totalXP]);

  const unlockedCount = BADGES.filter(b => (progress[b.id] || 0) >= b.threshold).length;
  const maxXP = BADGES.reduce((sum, b) => sum + b.xp, 0);

  const spawnParticles = useCallback((badgeId) => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: `${badgeId}-${i}-${Date.now()}`,
      angle: (i / 12) * 360,
      delay: Math.random() * 0.3,
    }));
    setParticles(newParticles);
    setJustUnlocked(badgeId);
    setTimeout(() => { setParticles([]); setJustUnlocked(null); }, 1500);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#070B14] page-enter overflow-y-auto">
      {/* Header */}
      <header className="pt-5 pb-3 px-5 sticky top-0 z-10 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-extrabold gradient-text flex items-center gap-2">
              <Trophy className="text-stadium-accent" size={18} />
              Rewards
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Unlock badges • Earn XP</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full glass text-[10px] font-bold text-stadium-accent flex items-center gap-1.5 border border-stadium-accent/20">
              <Zap size={10} />
              {totalXP} XP
            </div>
          </div>
        </div>
      </header>

      {/* XP Progress Bar */}
      <div className="px-5 pt-4">
        <div className="glass rounded-2xl p-4 relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">Fan Level</p>
              <p className="text-white font-extrabold text-lg mt-0.5">
                {unlockedCount < 3 ? 'Rookie' : unlockedCount < 6 ? 'Regular' : unlockedCount < 8 ? 'MVP' : 'Legend'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-sm">{unlockedCount}/{BADGES.length}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">Badges</p>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-stadium-accent to-yellow-400 transition-all duration-1000 ease-out"
              style={{ width: `${(totalXP / maxXP) * 100}%`, boxShadow: '0 0 12px rgba(234,179,8,0.4)' }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] text-gray-600 font-semibold">{totalXP} XP</span>
            <span className="text-[9px] text-gray-600 font-semibold">{maxXP} XP</span>
          </div>
          {/* Ambient glow */}
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-stadium-accent/10 rounded-full blur-[40px] pointer-events-none" />
        </div>
      </div>

      {/* Badge Grid */}
      <div className="p-5 space-y-3 pb-28">
        {BADGES.map((badge, idx) => {
          const val = progress[badge.id] || 0;
          const unlocked = val >= badge.threshold;
          const progressPct = Math.min(100, (val / badge.threshold) * 100);

          return (
            <div
              key={badge.id}
              onClick={() => unlocked && spawnParticles(badge.id)}
              className={`glass rounded-2xl p-4 relative overflow-hidden transition-all duration-300 ${
                unlocked ? 'cursor-pointer hover:bg-white/[0.06]' : 'opacity-60'
              } ${justUnlocked === badge.id ? 'badge-unlock-shake' : ''}`}
              style={{ animation: `fadeSlideUp 0.3s ease-out ${idx * 0.05}s forwards`, opacity: 0 }}
            >
              <div className="flex items-center gap-4">
                {/* Badge Icon */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                    unlocked ? 'badge-glow' : ''
                  }`}
                  style={{
                    background: unlocked ? badge.color + '22' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${unlocked ? badge.color + '44' : 'rgba(255,255,255,0.06)'}`,
                    boxShadow: unlocked ? `0 0 20px ${badge.color}33` : 'none',
                  }}
                >
                  <badge.icon
                    size={24}
                    style={{ color: unlocked ? badge.color : '#4B5563' }}
                  />
                </div>

                {/* Badge Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className={`font-bold text-[14px] ${unlocked ? 'text-white' : 'text-gray-500'}`}>
                      {badge.label}
                    </h3>
                    {unlocked && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: badge.color + '22', color: badge.color }}>
                        +{badge.xp} XP
                      </span>
                    )}
                  </div>
                  <p className={`text-[11px] ${unlocked ? 'text-gray-400' : 'text-gray-600'}`}>{badge.desc}</p>

                  {/* Progress Bar */}
                  {!unlocked && (
                    <div className="mt-2 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${progressPct}%`,
                          background: badge.color,
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="shrink-0">
                  {unlocked ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ background: badge.color + '22' }}>
                      <Award size={16} style={{ color: badge.color }} />
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-600 font-semibold">
                      {val}/{badge.threshold}
                    </span>
                  )}
                </div>
              </div>

              {/* Particle Burst */}
              {justUnlocked === badge.id && particles.map(p => (
                <div
                  key={p.id}
                  className="particle-burst"
                  style={{
                    '--angle': `${p.angle}deg`,
                    '--delay': `${p.delay}s`,
                    '--color': badge.color,
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Rewards;
