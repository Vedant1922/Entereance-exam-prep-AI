import React, { useState } from 'react';
import { MessageSquare, Flame, CalendarClock, UserCircle, Send, Plus, Settings, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

function App() {
  const [activeSubject, setActiveSubject] = useState('CHEMISTRY');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I am filling the gap between your preparation to result.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [examDays] = useState(153);
  const [streak] = useState(12);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const newHistory = [...messages, { role: 'user', content: userMessage }];
    setMessages(newHistory);

    // Add an empty assistant message slot that we'll stream into
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const historyPayload = newHistory.slice(1);
      const payloadMessage = `[Context: ${activeSubject}]\n${userMessage}`;

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payloadMessage, history: historyPayload })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to AI server');
      }

      // Read the stream chunk by chunk
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.chunk) {
              // Append the new chunk to the last message
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.chunk
                };
                return updated;
              });
            }
          } catch (e) {
            // Skip malformed chunks silently
          }
        }
      }

    } catch (error) {
      console.error("Stream Error:", error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `🚨 Connection Error: ${error.message}. Is the Node backend server running?`
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="overflow-hidden bg-theme_bg text-gray-200 selection:bg-theme_cyan selection:text-gray-900 font-sans h-screen flex w-full">
        
      {/* SIDEBAR */}
      <aside className="w-1/4 max-w-xs flex flex-col bg-theme_sidebar border-r border-white/5 shadow-xl z-20">
        
        {/* Top Feature Bar */}
        <div className="p-5 border-b border-white/5 flex gap-2 justify-between items-center text-sm font-semibold tracking-wide">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full shadow-sm hover:bg-white/10 transition-colors duration-300">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
            <span className="text-gray-300">{streak} Days</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full shadow-sm hover:bg-white/10 transition-colors duration-300">
            <CalendarClock className="w-4 h-4 text-theme_green" />
            <span className="text-gray-300">{examDays} Left</span>
          </div>
        </div>

        <div className="p-4">
          {/* New Chat Button */}
          <button className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-theme_cyan hover:bg-opacity-90 text-gray-900 rounded-xl text-sm font-bold transition-all duration-300 shadow-sm active:scale-95 group">
            <Plus className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
            New Chat
          </button>
        </div>

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          <p className="px-3 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 mt-2">Past Sessions</p>
          {[
            "Quantum Numbers Doubt", 
            "Hybridization in CH4", 
            "Thermodynamics Revision",
            "Organic Reaction Mechanisms"
          ].map((title, i) => (
            <button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/5 rounded-xl text-left truncate transition-colors duration-200 text-gray-300 hover:text-white group">
              <MessageSquare className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:text-theme_green transition-all flex-shrink-0" />
              <span className="truncate">{title}</span>
            </button>
          ))}
        </div>

        {/* Account / Profile Area */}
        <div className="p-4 border-t border-white/5 relative">
          {/* Mock Profile Popup */}
          <div className={`absolute bottom-20 left-4 w-[calc(100%-2rem)] bg-[#2A2A2A] shadow-2xl border border-white/10 rounded-2xl p-2 z-30 flex flex-col gap-1 transition-all duration-200 origin-bottom-left ${isProfileOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-white/10 rounded-xl text-left text-gray-200 font-medium transition-colors">
              <Settings className="w-4 h-4 opacity-70" /> Settings
            </button>
            <div className="h-px bg-white/10 my-1 w-full" />
            <button className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-red-500/20 rounded-xl text-left text-red-400 font-medium transition-colors">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>

          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 group"
          >
            <UserCircle className="w-9 h-9 text-gray-400 group-hover:text-theme_green transition-colors" />
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors truncate">JEE Aspirant</span>
              <span className="text-xs text-gray-500 truncate mt-0.5">user@jee.local</span>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CHAT AREA */}
      <main className="flex-1 flex flex-col h-full relative z-0">
        
        {/* Top Subject Switcher */}
        <div className="absolute top-0 w-full flex justify-center pt-6 z-10 pointer-events-none">
          <div className="flex items-center p-1 bg-[#1A1A1A] border border-white/5 rounded-full shadow-lg pointer-events-auto backdrop-blur-md">
            {['PHYSICS', 'CHEMISTRY', 'MATHS'].map(sub => (
              <button 
                key={sub}
                onClick={() => setActiveSubject(sub)}
                className={`px-5 py-2 rounded-full text-xs font-bold tracking-widest transition-all duration-300 ${activeSubject === sub ? 'bg-white/10 text-theme_green shadow-sm' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Avatar-less Chat Stream */}
        <div className="flex-1 overflow-y-auto px-4 md:px-20 pt-28 py-10 scroll-smooth">
          <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-32">
            {messages.map((msg, i) => (
              <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="bg-theme_cyan/40 text-white px-5 py-3.5 rounded-[22px] rounded-tr-md max-w-[80%] text-[15.5px] leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="text-gray-300 max-w-[90%] text-[15.5px] leading-relaxed relative markdown-body text-left w-full pr-4">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ))}

            {/* AI Typing Animation */}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="bg-[#1E1E1E] border border-white/5 px-5 py-4 rounded-3xl max-w-[85%] shadow-sm flex gap-1.5 items-center justify-center">
                  <div className="w-2 h-2 bg-theme_green rounded-full animate-bounce opacity-80" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-theme_green rounded-full animate-bounce opacity-80" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-theme_green rounded-full animate-bounce opacity-80" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input Area */}
        <div className="absolute w-full bottom-0 bg-gradient-to-t from-theme_bg via-theme_bg to-transparent pt-12 pb-8 px-4 md:px-20 z-10">
          <div className="max-w-3xl mx-auto relative bg-[#1A1A1A] rounded-3xl border border-white/10 overflow-hidden focus-within:border-theme_green shadow-lg focus-within:ring-2 focus-within:ring-theme_green/20 transition-all duration-300">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message JEE ${activeSubject === 'CHEMISTRY' ? 'Chemistry' : activeSubject === 'PHYSICS' ? 'Physics' : 'Maths'} AI...`}
              className="w-full max-h-48 min-h-[60px] py-4 pl-5 pr-14 bg-transparent resize-none outline-none text-[16px] text-gray-100 placeholder-gray-500 disabled:opacity-50"
              rows="1"
              disabled={isLoading}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-2 p-2.5 bg-theme_green text-gray-900 rounded-2xl hover:bg-opacity-80 disabled:opacity-30 disabled:hover:bg-theme_green transition-all duration-300 transform active:scale-95 flex items-center justify-center font-bold"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-4 font-medium tracking-wide">
            JEE AI Tutor can make mistakes. Always verify with standard NCERT materials.
          </p>
        </div>
      </main>

    </div>
  );
}

export default App;
