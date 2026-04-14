import React from 'react';
import { Target, TrendingUp, Cpu, Maximize, Zap, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pitch = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8 sm:p-12 md:p-20 flex flex-col font-sans relative overflow-x-hidden">
      
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-stadium-accent/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#38BDF8]/10 blur-[150px] rounded-full pointer-events-none" />
      
      <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2 self-start relative z-50 transition-colors">
        &larr; Back to App
      </button>

      <header className="mb-16 mt-4 text-center sm:text-left border-b border-gray-800/50 pb-12 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stadium-accent/10 border border-stadium-accent/30 rounded-full mb-6">
          <Sparkles className="text-stadium-accent" size={14} />
          <span className="text-stadium-accent text-[10px] font-bold tracking-[0.2em] uppercase">Hackathon Demo</span>
        </div>
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          Stadium<span className="text-stadium-accent">Pulse</span>
        </h1>
        <p className="text-xl sm:text-2xl text-gray-400 font-medium max-w-3xl">
          Turning stadium chaos into a seamless personal guide with AI crowd intelligence.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10 pb-20">
        
        <div className="space-y-12">
          <section>
            <h2 className="flex items-center gap-3 text-2xl font-bold mb-4">
              <Target className="text-stadium-accent" /> Minimum Viable Problem
            </h2>
            <div className="bg-[#151C2C] p-6 rounded-3xl border border-gray-800 shadow-lg">
              <p className="text-gray-400 text-lg leading-relaxed">
                Fans spend up to <strong className="text-white">20% of the game</strong> waiting in lines for food or bathrooms, 
                missing crucial plays. Venues suffer from <strong className="text-white">traffic bottlenecks</strong> and lost concessions revenue due to queue abandonment.
              </p>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-3 text-2xl font-bold mb-4">
              <Cpu className="text-[#38BDF8]" /> Our Solution
            </h2>
            <div className="bg-[#151C2C] p-6 rounded-3xl border border-gray-800 space-y-5 shadow-lg">
              <div className="flex gap-4">
                <div className="w-1.5 shrink-0 bg-[#38BDF8] rounded-full"></div>
                <div>
                  <h3 className="text-white font-bold text-lg">Predictive Routing</h3>
                  <p className="text-gray-400">AI predicts shortest queues using live density data.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1.5 shrink-0 bg-[#38BDF8] rounded-full"></div>
                <div>
                  <h3 className="text-white font-bold text-lg">AI Concierge</h3>
                  <p className="text-gray-400">Conversational interface for instant stadium directions.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-1.5 shrink-0 bg-[#38BDF8] rounded-full"></div>
                <div>
                  <h3 className="text-white font-bold text-lg">Smart Nudging</h3>
                  <p className="text-gray-400">Real-time alerts when nearby lines drop to zero.</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <section>
            <h2 className="flex items-center gap-3 text-2xl font-bold mb-4">
              <Zap className="text-stadium-success" /> Business Model
            </h2>
            <div className="bg-[#151C2C] p-6 rounded-3xl border border-gray-800 shadow-lg">
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="bg-stadium-success/20 p-3 rounded-xl text-stadium-success shrink-0"><Maximize size={20} /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg">B2B SaaS to Venues</h4>
                    <p className="text-gray-400">Licensing the platform to stadiums for traffic flow analytics.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-stadium-success/20 p-3 rounded-xl text-stadium-success shrink-0"><TrendingUp size={20} /></div>
                  <div>
                    <h4 className="text-white font-bold text-lg">Sponsored Moments</h4>
                    <p className="text-gray-400">Targeted flash deals driving traffic to under-utilized stands.</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-3 text-2xl font-bold mb-4">
              <Maximize className="text-[#A855F7]" /> Market Opportunity
            </h2>
            <div className="bg-gradient-to-br from-[#151C2C] to-gray-900 p-10 rounded-3xl border border-gray-800 text-center shadow-xl">
              <h3 className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#A855F7] to-[#38BDF8]">$1.2B</h3>
              <p className="text-gray-400 mt-3 font-bold tracking-[0.2em] uppercase text-sm">Smart Venue Tech TAM by 2027</p>
              <p className="text-gray-500 mt-6 text-sm px-4 leading-relaxed">
                Starting with major league stadiums and expanding to concert venues and theme parks globally.
              </p>
            </div>
          </section>
        </div>

      </div>
    </div>
  );
};

export default Pitch;
