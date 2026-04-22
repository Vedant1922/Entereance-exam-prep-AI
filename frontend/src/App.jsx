import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Flame, CalendarClock, UserCircle, ArrowUp, Plus, Settings, LogOut, Atom, FlaskConical, Calculator } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const INITIAL_MESSAGE = { role: 'assistant', content: 'Hey! Ask me anything about Physics, Chemistry or Maths — I\'ll break it down for you in a way that actually makes sense.' };

const SUGGESTIONS = {
  CHEMISTRY: [
    { emoji: '🧪', text: 'What is sp3 hybridization in methane?' },
    { emoji: '⚗️', text: 'Explain chemical equilibrium with Le Chatelier\'s Principle' },
    { emoji: '🔬', text: 'How do I identify nucleophile vs electrophile?' },
    { emoji: '🧫', text: 'What are the periodic trends in ionization energy?' },
  ],
  PHYSICS: [
    { emoji: '⚡', text: 'Explain Kirchhoff\'s Laws with an example' },
    { emoji: '🌀', text: 'How does rotational inertia work in rolling motion?' },
    { emoji: '🔭', text: 'What is the photoelectric effect?' },
    { emoji: '🎯', text: 'How to solve projectile motion problems fast?' },
  ],
  MATHS: [
    { emoji: '∫', text: 'How do I solve integration by parts?' },
    { emoji: '📐', text: 'Explain the concept of limits with examples' },
    { emoji: '🔢', text: 'What are the properties of determinants?' },
    { emoji: '📊', text: 'How to approach probability problems in JEE?' },
  ],
};

const SUBJECT_ICONS = {
  PHYSICS: Atom,
  CHEMISTRY: FlaskConical,
  MATHS: Calculator,
};

function App() {
  const [activeSubject, setActiveSubject] = useState('CHEMISTRY');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [examDays] = useState(153);
  const [streak] = useState(12);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setIsProfileOpen(false);
  };

  const handleSuggestionClick = (text) => {
    setInput(text);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const newHistory = [...messages, { role: 'user', content: userMessage }];
    setMessages(newHistory);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const historyPayload = newHistory.slice(1);
      const payloadMessage = `[Context: ${activeSubject}]\n${userMessage}`;

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: payloadMessage, history: historyPayload })
      });

      if (!response.ok) throw new Error('Failed to connect to AI server');

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
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: updated[updated.length - 1].content + parsed.chunk
                };
                return updated;
              });
            }
          } catch (e) { /* skip malformed chunks */ }
        }
      }

    } catch (error) {
      console.error('Stream Error:', error);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `🚨 Connection Error: ${error.message}. Is the backend server running on port 3000?`
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isWelcomeState = messages.length === 1;

  return (
    <div className="overflow-hidden bg-theme_bg text-[#ECECEC] selection:bg-theme_green/40 selection:text-white font-sans h-screen flex w-full">

      {/* ── SIDEBAR ── */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-theme_sidebar border-r border-white/5 z-20">

        {/* Brand Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl bg-theme_green/20 border border-theme_green/30 flex items-center justify-center">
              <FlaskConical className="w-4 h-4 text-theme_green" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">JEE AI Tutor</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Your second teacher</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl">
              <Flame className="w-4.5 h-4.5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-none">{streak}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Day streak</p>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white/5 rounded-xl">
              <CalendarClock className="w-4.5 h-4.5 text-theme_green flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-white leading-none">{examDays}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Days left</p>
              </div>
            </div>
          </div>
        </div>

        {/* New Chat */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-theme_green/15 hover:bg-theme_green/25 text-theme_green border border-theme_green/20 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 group"
          >
            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
            New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <p className="px-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 mt-1">Recent</p>
          {[
            'Quantum Numbers Doubt',
            'Hybridization in CH4',
            'Thermodynamics Revision',
            'Organic Reaction Mechanisms'
          ].map((title, i) => (
            <button key={i} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 rounded-xl text-left truncate transition-colors duration-150 text-gray-400 hover:text-white group">
              <MessageSquare className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80 group-hover:text-theme_green transition-all flex-shrink-0" />
              <span className="truncate text-[13px]">{title}</span>
            </button>
          ))}
        </div>

        {/* Profile */}
        <div className="p-3 border-t border-white/5 relative">
          <div className={`absolute bottom-16 left-3 right-3 bg-[#2F2F2F] shadow-2xl border border-white/10 rounded-2xl p-1.5 z-30 flex flex-col gap-0.5 transition-all duration-200 origin-bottom-left ${isProfileOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 rounded-xl text-left text-gray-200 font-medium transition-colors">
              <Settings className="w-4 h-4 opacity-60" /> Settings
            </button>
            <div className="h-px bg-white/10 mx-1" />
            <button className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-500/15 rounded-xl text-left text-red-400 font-medium transition-colors">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/5 rounded-xl transition-all duration-150 group"
          >
            <UserCircle className="w-8 h-8 text-gray-500 group-hover:text-theme_green transition-colors flex-shrink-0" />
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[13px] font-semibold text-gray-200 group-hover:text-white transition-colors truncate">JEE Aspirant</span>
              <span className="text-[11px] text-gray-600 truncate">user@jee.local</span>
            </div>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="flex-1 flex flex-col h-full relative z-0 min-w-0">

        {/* Subject Switcher */}
        <div className="absolute top-0 w-full flex justify-center pt-5 z-10 pointer-events-none">
          <div className="flex items-center p-1 bg-[#2A2A2A] border border-white/8 rounded-full shadow-lg pointer-events-auto">
            {['PHYSICS', 'CHEMISTRY', 'MATHS'].map(sub => {
              const Icon = SUBJECT_ICONS[sub];
              const isActive = activeSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider transition-all duration-250 ${isActive ? 'bg-theme_green/15 text-theme_green border border-theme_green/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Icon className="w-3 h-3" />
                  {sub}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat / Welcome Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-16 pt-20 scroll-smooth">
          {isWelcomeState ? (
            /* ── WELCOME STATE ── */
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-full pb-48 text-center">
              <div className="w-14 h-14 rounded-2xl bg-theme_green/15 border border-theme_green/25 flex items-center justify-center mb-5">
                <FlaskConical className="w-7 h-7 text-theme_green" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">What do you want to learn today?</h1>
              <p className="text-[15px] text-gray-500 mb-8 max-w-sm">Ask anything from {activeSubject.charAt(0) + activeSubject.slice(1).toLowerCase()} — I'll explain it clearly, step by step.</p>

              <div className="grid grid-cols-2 gap-3 w-full">
                {SUGGESTIONS[activeSubject].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="flex items-start gap-3 p-4 bg-[#2A2A2A] hover:bg-[#303030] border border-white/6 hover:border-theme_green/20 rounded-2xl text-left transition-all duration-200 group"
                  >
                    <span className="text-xl flex-shrink-0">{s.emoji}</span>
                    <span className="text-[13.5px] text-gray-300 group-hover:text-white leading-snug transition-colors">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── CHAT MESSAGES ── */
            <div className="max-w-2xl mx-auto flex flex-col gap-8 pb-36">
              {messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-[#2F2F2F] text-[#ECECEC] px-4 py-2.5 rounded-3xl max-w-[75%] text-[15px] leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="text-gray-300 max-w-[92%] text-[15.5px] leading-relaxed relative markdown-body text-left w-full">
                      {msg.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        /* Streaming dots while content is empty */
                        <div className="flex gap-1.5 items-center h-6">
                          <div className="w-2 h-2 bg-theme_green rounded-full animate-bounce opacity-70" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-theme_green rounded-full animate-bounce opacity-70" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-theme_green rounded-full animate-bounce opacity-70" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute w-full bottom-0 bg-gradient-to-t from-theme_bg via-theme_bg/95 to-transparent pt-10 pb-6 px-4 md:px-16 z-10">
          <div className="max-w-2xl mx-auto relative bg-theme_input rounded-2xl border border-white/8 overflow-hidden focus-within:border-theme_green/50 shadow-lg focus-within:ring-1 focus-within:ring-theme_green/20 transition-all duration-300">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Ask anything about ${activeSubject.charAt(0) + activeSubject.slice(1).toLowerCase()}...`}
              className="w-full max-h-40 min-h-[56px] py-4 pl-5 pr-14 bg-transparent resize-none outline-none text-[15.5px] text-[#ECECEC] placeholder-[#555] disabled:opacity-50 leading-relaxed"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2.5 bottom-2.5 w-8 h-8 bg-white disabled:bg-[#444] disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 hover:bg-gray-200"
            >
              <ArrowUp className="w-4 h-4 text-black disabled:text-gray-600" />
            </button>
          </div>
          <p className="text-center text-[11px] text-[#444] mt-3 tracking-wide">
            JEE AI can make mistakes — always verify with NCERT & standard materials.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
