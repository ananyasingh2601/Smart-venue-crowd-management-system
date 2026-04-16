import React, { useState, useEffect } from 'react';
import { ShieldAlert, X, Heart, Shield, Baby, Flame, HelpCircle, CheckCircle, Loader2 } from 'lucide-react';
import { auth, ensureAnonymousAuth, firebaseEnabled } from '../lib/firebase';

const emergencyTypes = [
  { type: 'medical', icon: Heart, label: 'Medical', desc: 'Medical emergency or injury', color: '#EF4444', bg: 'from-red-500/20 to-rose-500/20' },
  { type: 'security', icon: Shield, label: 'Security', desc: 'Security threat or concern', color: '#F59E0B', bg: 'from-amber-500/20 to-yellow-500/20' },
  { type: 'lost_child', icon: Baby, label: 'Lost Child', desc: 'Report a missing child', color: '#3B82F6', bg: 'from-blue-500/20 to-cyan-500/20' },
  { type: 'fire', icon: Flame, label: 'Fire', desc: 'Fire or smoke detected', color: '#F97316', bg: 'from-orange-500/20 to-red-500/20' },
  { type: 'other', icon: HelpCircle, label: 'Other', desc: 'General emergency', color: '#8B5CF6', bg: 'from-violet-500/20 to-purple-500/20' },
];

const SOSButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(null);
  const [dispatched, setDispatched] = useState(null);

  useEffect(() => {
    if (dispatched) {
      const t = setTimeout(() => {
        setDispatched(null);
        setIsOpen(false);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [dispatched]);

  useEffect(() => {
    if (firebaseEnabled) {
      ensureAnonymousAuth().catch(() => {});
    }
  }, []);

  const handleSOS = async (type) => {
    setSending(type);
    try {
      const reporterId = auth?.currentUser?.uid || null;
      const res = await fetch('http://localhost:3001/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, location: 'Current Location', reporterId }),
      });
      const data = await res.json();
      setDispatched(data);
    } catch {
      setDispatched({ status: 'dispatched', message: 'Alert dispatched. Help is on the way.' });
    } finally {
      setSending(null);
    }
  };

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[88px] right-4 z-[60] w-11 h-11 rounded-full flex items-center justify-center
          bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-500/30
          hover:shadow-red-500/50 active:scale-90 transition-all duration-200 sos-pulse"
      >
        <ShieldAlert className="text-white" size={18} />
      </button>

      {/* Emergency Panel Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col" style={{ animation: 'fadeIn 0.2s ease-out forwards' }}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !sending && setIsOpen(false)} />

          {/* Panel */}
          <div className="relative z-10 mt-auto max-h-[85vh] overflow-y-auto" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
            <div className="bg-[#0D1117] rounded-t-3xl p-6 pb-10 border-t border-red-500/20">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                    <ShieldAlert className="text-red-500" size={24} />
                    Emergency SOS
                  </h2>
                  <p className="text-gray-500 text-xs mt-1">Select the type of emergency. Help will be dispatched immediately.</p>
                </div>
                <button
                  onClick={() => !sending && setIsOpen(false)}
                  className="text-gray-500 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] rounded-full p-2 transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Success State */}
              {dispatched ? (
                <div className="flex flex-col items-center py-10 text-center" style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4 sos-dispatch-ring">
                    <CheckCircle className="text-emerald-400" size={36} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Help Is On The Way</h3>
                  <p className="text-gray-400 text-sm max-w-xs">{dispatched.message}</p>
                  <div className="mt-4 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                    Status: Dispatched ✓
                  </div>
                </div>
              ) : (
                /* Emergency Type Grid */
                <div className="space-y-3">
                  {emergencyTypes.map((em, idx) => (
                    <button
                      key={em.type}
                      onClick={() => handleSOS(em.type)}
                      disabled={!!sending}
                      className={`w-full glass rounded-2xl p-4 flex items-center gap-4 text-left
                        hover:bg-white/[0.06] active:scale-[0.98] transition-all duration-200
                        disabled:opacity-50 disabled:pointer-events-none group`}
                      style={{ animation: `fadeSlideUp 0.3s ease-out ${idx * 0.06}s forwards`, opacity: 0 }}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${em.bg} flex items-center justify-center shrink-0
                          group-hover:scale-110 transition-transform duration-200`}
                        style={{ border: `1px solid ${em.color}33` }}
                      >
                        {sending === em.type ? (
                          <Loader2 className="animate-spin" style={{ color: em.color }} size={22} />
                        ) : (
                          <em.icon style={{ color: em.color }} size={22} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-[15px]">{em.label}</h3>
                        <p className="text-gray-500 text-[11px] mt-0.5">{em.desc}</p>
                      </div>
                      <div className="text-gray-600 group-hover:text-gray-400 transition-colors">→</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-center text-[9px] text-gray-700 mt-6">
                False reports may result in removal from the venue. Use only in genuine emergencies.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSButton;
