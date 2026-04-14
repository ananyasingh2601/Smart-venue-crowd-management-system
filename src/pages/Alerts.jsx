import React, { useState, useEffect } from 'react';
import { Bell, Clock, ShieldAlert, CheckCircle, Ticket } from 'lucide-react';

const alertTemplates = [
  { type: 'deal', icon: Ticket, color: 'text-stadium-highlight bg-stadium-highlight/20', title: 'Flash Deal!', desc: '50% off all draft beers at Section 18 for the next 10 minutes.' },
  { type: 'info', icon: CheckCircle, color: 'text-stadium-success bg-stadium-success/20', title: 'Queue Drop Alert', desc: 'The grill near Section 12 just cleared out! 0min wait.' },
  { type: 'warning', icon: Clock, color: 'text-stadium-warning bg-stadium-warning/20', title: 'Halftime Approaching', desc: 'Halftime is in 10 minutes. Expect heavy concourse traffic.' },
  { type: 'danger', icon: ShieldAlert, color: 'text-stadium-danger bg-stadium-danger/20', title: 'Exit Congestion', desc: 'North Gates experiencing heavy delays. Use East/West exits.' },
];

const Alerts = () => {
  const [alerts, setAlerts] = useState([
    { id: 1, ...alertTemplates[0], time: 'Just now' },
    { id: 2, ...alertTemplates[1], time: '5m ago' }
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
      setAlerts(prev => [
        { id: Date.now(), ...template, time: 'Just now' },
        ...prev.map(a => ({...a, time: a.time === 'Just now' ? '1m ago' : a.time}))
      ].slice(0, 8));
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="flex flex-col h-full bg-stadium-dark animate-in fade-in duration-500 overflow-y-auto">
      <header className="pt-6 pb-4 px-5 border-b border-gray-800/60 sticky top-0 z-10 bg-stadium-card/90 backdrop-blur flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Smart Alerts</h1>
          <p className="text-xs text-gray-400 mt-1">Live stadium updates & insights</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-stadium-accent/20 flex items-center justify-center relative">
          <Bell className="text-stadium-accent" size={16} />
          {alerts.length > 0 && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-stadium-danger rounded-full border border-stadium-card animate-pulse"></div>}
        </div>
      </header>

      <div className="p-5 space-y-4 pb-24">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <CheckCircle className="text-gray-600 mb-3" size={40} />
            <p className="text-gray-400">You're all caught up!</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="bg-stadium-card border border-gray-800/80 p-4 rounded-2xl flex gap-4 items-start shadow-sm relative overflow-hidden group">
              <div className={`absolute left-0 top-0 w-1 h-full opacity-80 ${alert.color.split(' ')[0].replace('text-', 'bg-')}`} />
              <div className={`p-2.5 rounded-xl shrink-0 ${alert.color}`}>
                <alert.icon size={20} />
              </div>
              <div className="flex-1 pr-6">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-white text-[15px]">{alert.title}</h3>
                  <span className="text-[10px] text-gray-500 font-medium">{alert.time}</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{alert.desc}</p>
              </div>
              <button 
                onClick={() => dismissAlert(alert.id)}
                className="absolute right-3 top-3 text-gray-600 hover:text-white transition-colors"
                title="Dismiss"
              >
                 <X size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Alerts;
