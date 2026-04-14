import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Clock, Sparkles } from 'lucide-react';

const ChatMessage = ({ message }) => {
  const isAI = message.sender === 'ai';
  
  return (
    <div className={`flex gap-3 mb-6 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAI ? 'bg-stadium-accent/20 text-stadium-accent' : 'bg-gray-700 text-gray-300'}`}>
        {isAI ? <Bot size={18} /> : <User size={18} />}
      </div>
      <div className={`max-w-[75%] rounded-2xl p-4 ${isAI ? 'bg-stadium-card border border-gray-800' : 'bg-stadium-highlight text-white'}`}>
        <p className="text-sm leading-relaxed">{message.text}</p>
        <div className={`flex items-center gap-1 mt-2 text-[10px] ${isAI ? 'text-gray-500' : 'text-blue-100 justify-end'}`}>
          <Clock size={10} />
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
      text: "Hey! I'm your StadiumPulse AI Concierge. I have live access to wait times, concessions, and navigation across the stadium. How can I help?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestions = [
    "Where's the shortest food line?",
    "Nearest bathroom to Sec 14?",
    "When's the best time to leave?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (text) => {
    if (!text.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponseText = "There are currently multiple vendors fully stocked. Let me know if you need directions!";
      
      const lowerInput = text.toLowerCase();
      if (lowerInput.includes('food')) {
        aiResponseText = "The shortest food line right now is at 'Grill & Chill' near Section 18. It's only a 3-minute wait!";
      } else if (lowerInput.includes('bathroom') || lowerInput.includes('restroom')) {
        aiResponseText = "The nearest bathroom to Section 14 has a 6-minute wait. However, if you head down to the concourse level near Section 10, there's no wait!";
      } else if (lowerInput.includes('leave') || lowerInput.includes('time')) {
        aiResponseText = "Based on our predictive models, there is usually a surge 5 minutes before halftime. I recommend heading to concessions now while lines are under 4 minutes.";
      }

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full bg-stadium-dark animate-in fade-in duration-500 pb-16">
      <header className="pt-8 pb-4 px-5 bg-stadium-card/80 backdrop-blur-md border-b border-gray-800/60 sticky top-0 z-10 hidden sm:block">
         <div className="flex items-center gap-2">
            <Sparkles className="text-stadium-accent" size={20} />
            <h1 className="text-xl font-bold text-white tracking-tight">AI Concierge</h1>
         </div>
      </header>
      
      <div className="pt-6 pb-2 px-5 sm:hidden flex items-center gap-2 border-b border-gray-800/60 shadow-sm sticky top-0 z-10 bg-stadium-card/90 backdrop-blur">
          <Sparkles className="text-stadium-accent animate-pulse" size={18} />
          <h1 className="text-xl font-bold text-white tracking-tight">AI Concierge</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        
        {isTyping && (
          <div className="flex gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-stadium-accent/20 text-stadium-accent flex items-center justify-center shrink-0">
              <Bot size={18} />
            </div>
            <div className="bg-stadium-card border border-gray-800 rounded-2xl py-4 px-5 flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-stadium-card/50 border-t border-gray-800/60 backdrop-blur-lg fixed bottom-16 sm:bottom-0 w-full">
        {messages.length === 1 && !isTyping && (
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-none">
            {suggestions.map((suggestion, idx) => (
              <button 
                key={idx}
                onClick={() => handleSend(suggestion)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800/50 text-xs text-gray-300 hover:bg-gray-700 transition cursor-pointer"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 items-center bg-gray-900 rounded-full border border-gray-700 p-1 pr-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            placeholder="Ask anything about the stadium..."
            className="flex-1 bg-transparent px-4 py-2 text-sm text-white focus:outline-none placeholder-gray-500"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-full bg-stadium-accent text-stadium-dark flex items-center justify-center disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
