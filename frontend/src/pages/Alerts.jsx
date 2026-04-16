import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Clock, ShieldAlert, CheckCircle, Ticket, X, Sparkles, Database } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { auth, db, ensureAnonymousAuth, firebaseEnabled, subscribeToAuth, sosAlertsCollection } from '../lib/firebase';

const alertTemplates = [
  { type: 'deal', icon: Ticket, accent: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/15', dot: 'bg-blue-400', badge: 'bg-blue-500/10 text-blue-400', title: '🎉 Flash Deal!', desc: '50% off all draft beers at Section 18 for the next 10 minutes.' },
  { type: 'info', icon: CheckCircle, accent: 'from-emerald-500/20 to-green-500/20', border: 'border-emerald-500/15', dot: 'bg-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400', title: '✅ Queue Drop Alert', desc: 'The grill near Section 12 just cleared out — 0 min wait!' },
  { type: 'warning', icon: Clock, accent: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/15', dot: 'bg-amber-400', badge: 'bg-amber-500/10 text-amber-400', title: '⏰ Halftime Approaching', desc: 'Halftime is in 10 minutes. Expect heavy concourse traffic.' },
  { type: 'danger', icon: ShieldAlert, accent: 'from-red-500/20 to-rose-500/20', border: 'border-red-500/15', dot: 'bg-red-400', badge: 'bg-red-500/10 text-red-400', title: '🚨 Exit Congestion', desc: 'North Gates experiencing heavy delays. Use East/West exits.' },
];

const fallbackAlerts = [
  { id: 1, ...alertTemplates[0], time: 'Just now' },
  { id: 2, ...alertTemplates[1], time: '2m ago' },
  { id: 3, ...alertTemplates[2], time: '8m ago' },
];

const metaByType = Object.fromEntries(alertTemplates.map((template) => [template.type, template]));

function formatTimestamp(value) {
  if (!value) return 'Just now';
  if (typeof value === 'number') {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  return 'Just now';
}

function mapFirestoreAlert(doc) {
  const meta = metaByType[doc.type] || metaByType.info;
  return {
    id: doc.id,
    ...meta,
    title: doc.title || meta.title,
    desc: doc.message || doc.desc,
    time: formatTimestamp(doc.createdAt),
    location: doc.location || 'Unknown',
    reporterId: doc.reporterId || null,
    status: doc.status || 'dispatched',
  };
}

const Alerts = () => {
  const [alerts, setAlerts] = useState(fallbackAlerts);
  const [authLabel, setAuthLabel] = useState(firebaseEnabled ? 'Connecting to Firebase…' : 'Firebase disabled');

  useEffect(() => {
    if (!firebaseEnabled || !db) {
      setAlerts(fallbackAlerts);
      const interval = setInterval(() => {
        const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
        setAlerts((prev) => [
          { id: Date.now(), ...template, time: 'Just now' },
          ...prev.map((alert) => ({ ...alert, time: alert.time === 'Just now' ? '30s ago' : alert.time })),
        ].slice(0, 8));
      }, 30000);
      return () => clearInterval(interval);
    }

    let unsubscribeAuth = () => {};
    let unsubscribeAlerts = () => {};

    ensureAnonymousAuth().catch(() => {
      setAuthLabel('Firebase Auth unavailable');
    });

    unsubscribeAuth = subscribeToAuth((user) => {
      if (user?.uid) {
        setAuthLabel(user.isAnonymous ? `Firebase Auth • Anonymous ${user.uid.slice(0, 8)}` : `Firebase Auth • ${user.uid.slice(0, 8)}`);
      } else {
        setAuthLabel('Firebase Auth');
      }
    });

    const alertsCollection = sosAlertsCollection();
    if (alertsCollection) {
      const alertsQuery = query(alertsCollection, orderBy('createdAt', 'desc'), limit(8));
      unsubscribeAlerts = onSnapshot(alertsQuery, (snapshot) => {
        const liveAlerts = snapshot.docs.map((doc) => mapFirestoreAlert({ id: doc.id, ...doc.data() }));
        setAlerts(liveAlerts.length ? liveAlerts : fallbackAlerts);
      });
    }

    return () => {
      unsubscribeAuth?.();
      unsubscribeAlerts?.();
    };
  }, []);

  const sourceLabel = useMemo(() => {
    if (!firebaseEnabled) return 'Local demo alerts';
    return 'Live Firestore alerts';
  }, []);

  const dismissAlert = (id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-[#070B14] page-enter overflow-y-auto">
      {/* Header */}
      <header className="pt-5 pb-3 px-5 sticky top-0 z-10 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.04] flex justify-between items-end gap-3">
        <div>
          <h1 className="text-lg font-extrabold gradient-text">Smart Alerts</h1>
          <p className="text-xs text-gray-400 mt-0.5 font-medium flex items-center gap-2 flex-wrap">
            <span>{firebaseEnabled ? 'Firebase-backed stadium updates' : 'AI-powered stadium updates'}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-[10px] text-gray-300 border border-white/[0.08]">
              {sourceLabel}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {firebaseEnabled && (
            <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center gap-1.5">
              <Database size={11} />
              {authLabel}
            </div>
          )}
          <div className="w-9 h-9 rounded-xl glass flex items-center justify-center relative">
            <Bell className="text-stadium-accent" size={16} />
            {alerts.length > 0 && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#070B14] flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">{alerts.length}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Alert List */}
      <div className="p-5 space-y-3 pb-24">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
              <Sparkles className="text-gray-600" size={28} />
            </div>
            <p className="text-gray-400 font-medium">You're all caught up!</p>
            <p className="text-xs text-gray-500 mt-1">New alerts will appear here automatically</p>
          </div>
        ) : (
          alerts.map((alert, idx) => (
            <div
              key={alert.id}
              className={`glass rounded-2xl p-4 ${alert.border} relative overflow-hidden group transition-all duration-300`}
              style={{ animation: `fadeSlideUp 0.3s ease-out ${idx * 0.05}s forwards`, opacity: 0 }}
            >
              {/* Left accent gradient */}
              <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${alert.accent} rounded-full`} />

              <div className="flex gap-3 items-start pl-2">
                <div className={`p-2 rounded-xl shrink-0 ${alert.badge}`}>
                  <alert.icon size={18} />
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex justify-between items-start mb-1 gap-2">
                    <h3 className="font-bold text-white text-sm truncate">{alert.title}</h3>
                    {alert.location && (
                      <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider shrink-0">{alert.location}</span>
                    )}
                  </div>
                  <p className="text-[13px] text-gray-300/80 leading-relaxed">{alert.desc}</p>
                  <p className="text-[10px] text-gray-500 font-semibold mt-2 uppercase tracking-wider">{alert.time}</p>
                </div>
              </div>

              <button
                onClick={() => dismissAlert(alert.id)}
                className="absolute right-3 top-3 text-gray-700 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] rounded-full p-1 transition-all opacity-0 group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
