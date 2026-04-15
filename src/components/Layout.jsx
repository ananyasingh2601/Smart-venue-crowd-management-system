import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Map, Bell, MessageSquare, Zap, Trophy } from 'lucide-react';
import SOSButton from './SOSButton';

const Layout = () => {
  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Map', path: '/map', icon: Map },
    { name: 'Predict', path: '/forecast', icon: Zap },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Rewards', path: '/rewards', icon: Trophy },
    { name: 'Chat', path: '/chat', icon: MessageSquare }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#070B14]">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* SOS Floating Button */}
      <SOSButton />

      {/* ── Bottom Nav ──────────────────────────────────── */}
      <nav className="fixed bottom-0 w-full z-50">
        {/* Top gradient fade */}
        <div className="h-6 bg-gradient-to-t from-[#070B14] to-transparent pointer-events-none" />
        <div className="glass-strong border-t border-white/5 bg-[#0A0F1C]/90 backdrop-blur-xl">
          <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'text-stadium-accent bg-stadium-accent/10 scale-105'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03]'
                  }`
                }
              >
                <item.icon size={18} strokeWidth={1.8} />
                <span className="text-[8px] font-semibold tracking-wider uppercase mt-0.5">{item.name}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
