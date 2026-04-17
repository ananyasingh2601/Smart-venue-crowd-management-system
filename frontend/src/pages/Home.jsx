import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Clock3,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import useStadiumData from '../hooks/useStadiumData';

const statusTone = (status, connected) => {
  if (!connected) {
    return {
      label: 'Offline',
      className: 'bg-red-500/15 text-red-200 border-red-300/30',
      dot: 'bg-red-400',
    };
  }

  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('overcrowded')) {
    return {
      label: 'Overcrowded',
      className: 'bg-red-500/15 text-red-100 border-red-300/30',
      dot: 'bg-red-400',
    };
  }
  if (normalized.includes('live')) {
    return {
      label: 'Live',
      className: 'bg-amber-400/20 text-amber-100 border-amber-200/35',
      dot: 'bg-amber-300',
    };
  }

  return {
    label: 'Normal',
    className: 'bg-emerald-500/15 text-emerald-100 border-emerald-300/30',
    dot: 'bg-emerald-300',
  };
};

const metricTone = (value, thresholds) => {
  if (value >= thresholds.danger) {
    return { text: 'text-red-200', bar: 'from-red-400 to-red-500', glow: 'shadow-red-500/20' };
  }
  if (value >= thresholds.warn) {
    return { text: 'text-amber-100', bar: 'from-amber-300 to-amber-500', glow: 'shadow-amber-400/20' };
  }
  return { text: 'text-emerald-100', bar: 'from-emerald-300 to-emerald-500', glow: 'shadow-emerald-400/20' };
};

const sectionTone = (density) => {
  if (density >= 80) {
    return {
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(254, 202, 202, 0.30)',
      label: 'text-red-100',
      pulse: true,
    };
  }
  if (density >= 60) {
    return {
      bg: 'rgba(245, 158, 11, 0.16)',
      border: 'rgba(253, 230, 138, 0.28)',
      label: 'text-amber-100',
      pulse: false,
    };
  }
  return {
    bg: 'rgba(34, 197, 94, 0.12)',
    border: 'rgba(187, 247, 208, 0.24)',
    label: 'text-emerald-100',
    pulse: false,
  };
};

const AnimatedNumber = ({ value, suffix = '', decimals = 0, className = '' }) => {
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, { damping: 22, stiffness: 110, mass: 0.9 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const controls = animate(motionValue, value, { duration: 0.85, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [motionValue, value]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => setDisplay(latest));
    return () => unsubscribe();
  }, [springValue]);

  return (
    <span className={className}>
      {Number(display).toFixed(decimals)}
      {suffix}
    </span>
  );
};

const MetricCard = ({ title, value, suffix, icon: Icon, tone, progress }) => (
  <motion.article
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    className={`glass rounded-3xl border border-white/20 p-5 md:p-6 shadow-2xl ${tone.glow}`}
  >
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-[0.24em] text-white/60">{title}</p>
      <div className="rounded-xl bg-white/10 p-2 text-white/80">
        <Icon size={16} />
      </div>
    </div>

    <div className="mt-3">
      <AnimatedNumber value={value} suffix={suffix} className={`text-3xl md:text-4xl font-extrabold ${tone.text}`} />
    </div>

    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <motion.div
        className={`h-full rounded-full bg-gradient-to-r ${tone.bar}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(6, Math.min(progress, 100))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  </motion.article>
);

const Home = () => {
  const {
    eventName,
    eventStatus,
    sections,
    connected,
    lastUpdated,
    density,
    avgWaitTime,
    safetyScore,
    alertsCount,
    activity,
  } = useStadiumData();

  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!lastUpdated) return;
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000)));
    }, 1000);

    return () => clearInterval(timer);
  }, [lastUpdated]);

  const status = statusTone(eventStatus, connected);
  const sectionList = useMemo(() => {
    if (!sections) return [];
    return Object.entries(sections)
      .map(([id, value]) => ({
        id,
        density: Math.round((value.density || 0) * 100),
        wait: Math.round(((value.waitFood || 0) + (value.waitDrinks || 0) + (value.waitBathroom || 0)) / 3),
      }))
      .sort((a, b) => b.density - a.density);
  }, [sections]);

  return (
    <div className="relative min-h-full overflow-hidden px-4 pb-28 pt-4 md:px-8 md:pt-6">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(110% 70% at 20% 10%, rgba(56,189,248,0.25), rgba(11,15,25,0.9) 50%), radial-gradient(80% 70% at 80% 20%, rgba(30,58,138,0.35), rgba(11,15,25,0.94) 65%), #0B0F19',
          backgroundSize: '170% 170%',
        }}
        animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
        transition={{ duration: 24, ease: 'linear', repeat: Infinity }}
      />

      <div className="relative z-10 mx-auto w-full max-w-7xl space-y-5 md:space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass rounded-3xl border border-white/20 px-5 py-4 md:px-7 md:py-5 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200/75">Smart Venue Crowd Management</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">{eventName || 'Super Bowl LIX'}</h1>
              <p className="mt-2 text-xs text-white/65">Last updated {lastUpdated ? `${secondsAgo}s ago` : 'just now'}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${status.className}`}>
                <span className={`h-2 w-2 rounded-full ${status.dot}`} />
                {status.label}
              </span>

              <div className="hidden h-10 w-10 rounded-2xl border border-white/30 bg-white/15 shadow-lg md:flex md:items-center md:justify-center">
                {connected ? <Wifi size={16} className="text-sky-100" /> : <WifiOff size={16} className="text-red-200" />}
              </div>
            </div>
          </div>
        </motion.header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Crowd Density"
            value={density}
            suffix="%"
            icon={Users}
            tone={metricTone(density, { warn: 60, danger: 82 })}
            progress={density}
          />
          <MetricCard
            title="Avg Wait Time"
            value={avgWaitTime}
            suffix=" min"
            icon={Clock3}
            tone={metricTone(avgWaitTime, { warn: 8, danger: 13 })}
            progress={Math.min(avgWaitTime * 7, 100)}
          />
          <MetricCard
            title="Safety Score"
            value={safetyScore}
            suffix=""
            icon={ShieldCheck}
            tone={metricTone(100 - safetyScore, { warn: 22, danger: 40 })}
            progress={safetyScore}
          />
          <MetricCard
            title="Active Alerts"
            value={alertsCount}
            suffix=""
            icon={AlertTriangle}
            tone={metricTone(alertsCount, { warn: 2, danger: 4 })}
            progress={Math.min(alertsCount * 22, 100)}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl border border-white/20 p-5 md:p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Live Sections Grid</h2>
              <p className="text-xs text-white/55">Hover for density and queue status</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {sectionList.map((section, index) => {
                const tone = sectionTone(section.density);
                return (
                  <motion.div
                    key={section.id}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: tone.pulse ? [1, 1.015, 1] : 1,
                    }}
                    transition={
                      tone.pulse
                        ? {
                            opacity: { duration: 0.35, delay: index * 0.03 },
                            y: { duration: 0.35, delay: index * 0.03 },
                            scale: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                          }
                        : { duration: 0.35, delay: index * 0.03 }
                    }
                    whileHover={{ scale: 1.03, boxShadow: '0 0 28px rgba(56, 189, 248, 0.28)' }}
                    style={{
                      backgroundColor: tone.bg,
                      borderColor: tone.border,
                    }}
                    className="rounded-2xl border px-4 py-3 backdrop-blur-2xl transition-all duration-300"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-white/65">Section {section.id}</p>
                    <p className={`mt-1 text-2xl font-bold ${tone.label}`}>{section.density}%</p>
                    <p className="mt-1 text-xs text-white/70">Wait {section.wait} min</p>
                  </motion.div>
                );
              })}
            </div>
          </motion.article>

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="glass rounded-3xl border border-white/20 p-5 md:p-6 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Real-Time Activity</h2>
              <Activity size={16} className="text-sky-200/80" />
            </div>

            <div className="h-[320px] space-y-2 overflow-y-auto pr-1 scrollbar-none">
              <AnimatePresence initial={false}>
                {activity.map((item) => {
                  const itemColor =
                    item.level === 'danger' ? 'border-red-300/30 bg-red-500/12 text-red-100' :
                    item.level === 'warning' ? 'border-amber-200/30 bg-amber-500/12 text-amber-100' :
                    'border-emerald-300/30 bg-emerald-500/12 text-emerald-100';

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className={`rounded-2xl border px-3 py-2.5 ${itemColor}`}
                    >
                      <p className="text-sm font-medium leading-snug">{item.message}</p>
                      <p className="mt-1 text-[11px] text-white/60">{new Date(item.ts).toLocaleTimeString()}</p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.article>
        </section>
      </div>
    </div>
  );
};

export default Home;
