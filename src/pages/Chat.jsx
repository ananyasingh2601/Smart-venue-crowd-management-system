import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Clock, Sparkles, Zap } from 'lucide-react';

const ChatMessage = ({ message }) => {
  const isAI = message.sender === 'ai';

  return (
    <div className={`flex gap-3 mb-5 ${isAI ? '' : 'flex-row-reverse'}`}
         style={{ animation: 'fadeSlideUp 0.3s ease-out forwards' }}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isAI ? 'bg-gradient-to-br from-stadium-accent/30 to-amber-600/20 text-stadium-accent' : 'bg-stadium-highlight/20 text-stadium-highlight'
      }`}>
        {isAI ? <Bot size={16} /> : <User size={16} />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
        isAI
          ? 'glass border border-white/[0.06] rounded-tl-md'
          : 'bg-gradient-to-br from-stadium-highlight to-blue-600 text-white rounded-tr-md shadow-lg shadow-stadium-highlight/10'
      }`}>
        <p className="text-[13px] leading-relaxed">{message.text}</p>
        <div className={`flex items-center gap-1 mt-1.5 text-[9px] font-medium ${isAI ? 'text-gray-600' : 'text-blue-200 justify-end'}`}>
          <Clock size={8} />
          {message.timestamp}
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hey! I'm your StadiumPulse AI Concierge 🏟️ I have live access to wait times, concessions, and navigation across the stadium. How can I help?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    { text: "Shortest food line?", icon: "🍔" },
    { text: "Nearest bathroom?", icon: "🚻" },
    { text: "Best time to leave?", icon: "⏰" },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:3001/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, eventId: 'evt_001' }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        sender: 'ai',
        text: "I'm having trouble connecting to the stadium network. Please try again in a moment! 📡",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070B14] page-enter pb-16">
      {/* Header */}
      <header className="pt-5 pb-3 px-5 sticky top-0 z-10 bg-[#070B14]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-stadium-accent/30 to-amber-600/20 flex items-center justify-center">
            <Sparkles className="text-stadium-accent" size={16} />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-white">AI Concierge</h1>
            <p className="text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-dot" />
              Live • Powered by StadiumPulse AI
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 scroll-smooth">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 mb-5" style={{ animation: 'fadeSlideUp 0.2s ease-out forwards' }}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-stadium-accent/30 to-amber-600/20 text-stadium-accent flex items-center justify-center shrink-0">
              <Bot size={16} />
            </div>
            <div className="glass border border-white/[0.06] rounded-2xl rounded-tl-md py-4 px-5 flex gap-2 items-center">
              <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-1" />
              <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-2" />
              <div className="w-2 h-2 bg-gray-500 rounded-full typing-dot-3" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 glass-strong border-t border-white/[0.04] fixed bottom-16 w-full">
        {/* Suggestion Chips */}
        {messages.length === 1 && !isTyping && (
          <div className="flex overflow-x-auto gap-2 mb-3 pb-1 scrollbar-none">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s.text)}
                className="whitespace-nowrap px-3.5 py-2 rounded-full glass border border-white/[0.06] text-[11px] font-semibold text-gray-300
                  hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200 flex items-center gap-1.5 active:scale-95"
              >
                <span>{s.icon}</span>
                {s.text}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center bg-white/[0.03] rounded-full border border-white/[0.06] p-1.5 pr-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask anything about the stadium..."
            className="flex-1 bg-transparent px-3 py-2 text-[13px] text-white focus:outline-none placeholder-gray-600"
          />
          <button
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-stadium-accent to-yellow-500 text-[#070B14] flex items-center justify-center
              disabled:opacity-30 disabled:from-gray-700 disabled:to-gray-700 transition-all duration-200 active:scale-90 shadow-lg shadow-stadium-accent/20"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
