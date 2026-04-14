import React, { useState, useEffect } from 'react';
import { Coffee, Utensils, Droplets, Presentation, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MetricCard = ({ title, time, icon: Icon }) => {
  let badgeColor = "bg-stadium-success/20 text-stadium-success border-stadium-success/30";
  let dotColor = "bg-stadium-success";
  
  if (time >= 5 && time <= 10) {
    badgeColor = "bg-stadium-warning/20 text-stadium-warning border-stadium-warning/30";
    dotColor = "bg-stadium-warning";
  } else if (time > 10) {
    badgeColor = "bg-stadium-danger/20 text-stadium-danger border-stadium-danger/30";
    dotColor = "bg-stadium-danger";
  }

  return (
    <div className="bg-stadium-card rounded-2xl p-4 border border-gray-800/50 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-800/50 rounded-lg">
          <Icon className="text-gray-300" size={20} />
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${badgeColor}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse`}></div>
          {time}m
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        <p className="text-xl font-bold text-white mt-1">Wait Time</p>
      </div>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    food: 4,
    drinks: 2,
    bathrooms: 12,
    density: 68
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        food: Math.max(1, Math.min(25, prev.food + (Math.floor(Math.random() * 5) - 2))),
        drinks: Math.max(1, Math.min(20, prev.drinks + (Math.floor(Math.random() * 5) - 2))),
        bathrooms: Math.max(1, Math.min(15, prev.bathrooms + (Math.floor(Math.random() * 3) - 1))),
        density: Math.max(40, Math.min(95, prev.density + (Math.floor(Math.random() * 7) - 3)))
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (metrics.density / 100) * circumference;

  return (
    <div className="p-5 space-y-8 animate-in fade-in duration-500">
      
      <header className="pt-4">
        <h2 className="text-stadium-accent text-sm font-bold tracking-widest uppercase mb-1">Super Bowl LIX</h2>
        <h1 className="text-3xl font-bold text-white tracking-tight">Welcome <br/> to the Game</h1>
      </header>

      <section className="bg-gradient-to-br from-stadium-card to-gray-900 border border-gray-800/80 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <AlertCircle size={120} />
        </div>
        
        <div className="flex items-center gap-6 relative z-10">
          <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
              <circle
                cx="70" cy="70" r="60"
                className="stroke-gray-800"
                strokeWidth="12"
                fill="transparent"
              />
              <circle
                cx="70" cy="70" r="60"
                className="stroke-stadium-highlight transition-all duration-1000 ease-out"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">{metrics.density}%</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Live Crowd Density</h3>
            <p className="text-sm text-gray-400 leading-relaxed">Sections 120-145 are currently experiencing high traffic. Consider alternate routes.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold text-white">Live Wait Times</h2>
          <span className="text-xs text-stadium-accent flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-stadium-accent animate-pulse"></div>
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard title="Food Stands" time={metrics.food} icon={Utensils} />
          <MetricCard title="Drinks & Bars" time={metrics.drinks} icon={Coffee} />
          <MetricCard title="Restrooms" time={metrics.bathrooms} icon={Droplets} />
          
          <button 
            onClick={() => navigate('/pitch')}
            className="bg-[#1A2234] hover:bg-[#20293F] transition-colors rounded-2xl p-4 border border-gray-800/50 flex flex-col justify-center items-center gap-3 active:scale-95"
          >
            <div className="w-10 h-10 rounded-full bg-stadium-accent/10 flex items-center justify-center text-stadium-accent">
              <Presentation size={20} />
            </div>
            <span className="text-sm font-medium text-white">Pitch Deck</span>
          </button>
        </div>
      </section>

    </div>
  );
};

export default Home;
