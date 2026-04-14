import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Home, Map, Bell, MessageSquare } from 'lucide-react';

const Layout = () => {
  const navItems = [
    { name: 'Home', path: '/home', icon: Home },
    { name: 'Map', path: '/map', icon: Map },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Chat', path: '/chat', icon: MessageSquare }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-stadium-dark">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 w-full bg-stadium-card border-t border-gray-800/60 pb-safe">
        <div className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-stadium-accent' : 'text-gray-500 hover:text-gray-300'
                }`
              }
            >
              <item.icon size={20} strokeWidth={2.5} />
              <span className="text-[10px] font-medium tracking-wide uppercase">{item.name}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
