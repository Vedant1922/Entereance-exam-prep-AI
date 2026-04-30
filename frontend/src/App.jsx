import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Flame, CalendarClock, UserCircle, ArrowUp, Plus, Settings, LogOut, Atom, FlaskConical, Calculator, Mail, Menu, MoreVertical, Trash2, Edit2, Pin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { supabase } from './supabaseClient';

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
  const [session, setSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // App State
  const [activeSubject, setActiveSubject] = useState('CHEMISTRY');
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [examDays, setExamDays] = useState(153);
  const [streak, setStreak] = useState(0);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Modals & User Data
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isSavingYear, setIsSavingYear] = useState(false);
  
  // Database State
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [chatSessions, setChatSessions] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  
  // Custom UI States
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch Sidebar Chats and Stats when logged in
  useEffect(() => {
    if (session?.user?.id) {
      loadSidebarSessions();
      loadUserStats();
    }
  }, [session]);

  const loadUserStats = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('streak_count, target_exam_year')
        .eq('id', session.user.id)
        .single();
        
      if (data) {
        if (data.streak_count !== null && data.streak_count !== undefined) {
          setStreak(data.streak_count);
        }
        if (data.target_exam_year) {
          setSelectedYear(data.target_exam_year.toString());
          // Standard JEE Mains target: Jan 24th of the target year
          const targetDate = new Date(`${data.target_exam_year}-01-24T00:00:00Z`);
          const today = new Date();
          const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            setExamDays(diffDays);
          } else {
            setExamDays(153); // Fallback if their DB year defaults to something in the past
          }
        } else {
          checkAndShowOnboarding();
        }
      } else {
        checkAndShowOnboarding();
      }
    } catch(err) {
      checkAndShowOnboarding();
    }
  };

  const checkAndShowOnboarding = () => {
    if (!localStorage.getItem('skippedOnboarding_JEE')) {
      setShowOnboarding(true);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingYear(true);
    try {
      const { error } = await supabase.from('users').upsert(
        { id: session.user.id, email: session.user.email, target_exam_year: parseInt(selectedYear) },
        { onConflict: 'id' }
      );
      if (!error) {
        setShowSettings(false);
        setShowOnboarding(false);
        loadUserStats(); // refresh visual days left
      }
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setIsSavingYear(false);
    }
  };

  const handleClearAllChats = async () => {
    if (window.confirm("Are you sure you want to delete all your chat history? This cannot be undone.")) {
      try {
        await supabase.from('chat_sessions').delete().eq('user_id', session.user.id);
        setChatSessions([]);
        setMessages([INITIAL_MESSAGE]);
        setCurrentSessionId(null);
        setShowSettings(false);
      } catch (err) {
        console.error("Failed to delete chats", err);
      }
    }
  };

  const handleTogglePin = async (e, sessionId, currentPinStatus) => {
    e.stopPropagation();
    const newStatus = !currentPinStatus;
    // Update local state instantly
    setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_pinned: newStatus } : s));
    // Update DB
    await supabase.from('chat_sessions').update({ is_pinned: newStatus }).eq('id', sessionId);
    setOpenDropdownId(null);
  };

  const triggerDelete = (e, sessionId) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
    setOpenDropdownId(null);
  };

  const confirmDeleteChat = async () => {
    if (deleteConfirmId) {
      await supabase.from('chat_sessions').delete().eq('id', deleteConfirmId);
      setChatSessions(prev => prev.filter(s => s.id !== deleteConfirmId));
      if (currentSessionId === deleteConfirmId) {
        handleNewChat();
      }
    }
    setDeleteConfirmId(null);
  };

  const triggerRename = (e, sessionId, currentTitle) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle || "New Chat");
    setOpenDropdownId(null);
  };

  const saveRenameChat = async (sessionId) => {
    if (editingTitle && editingTitle.trim()) {
      await supabase.from('chat_sessions').update({ title: editingTitle.trim() }).eq('id', sessionId);
      setChatSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editingTitle.trim() } : s));
    }
    setEditingSessionId(null);
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('skippedOnboarding_JEE', 'true');
    setShowOnboarding(false);
  };

  const loadSidebarSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    if (data) setChatSessions(data);
  };

  const loadChatHistory = async (sessionId, subject) => {
    setCurrentSessionId(sessionId);
    setActiveSubject(subject || 'CHEMISTRY');
    setMessages([]); // clear current
    
    const { data } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
      
    if (data && data.length > 0) {
      setMessages(data);
    } else {
      setMessages([INITIAL_MESSAGE]);
    }
    // Mobile tweak: close sidebars
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
        if (error) throw error;
        setAuthError('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
        if (error) throw error;
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) setAuthError(error.message);
  };

  const handleLogOut = async () => {
    await supabase.auth.signOut();
    setIsProfileOpen(false);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([INITIAL_MESSAGE]);
    setInput('');
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
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
      // Don't send INITIAL_MESSAGE in history
      const historyPayload = newHistory.filter(m => m.content !== INITIAL_MESSAGE.content);
      const payloadMessage = `[Context: ${activeSubject}]\n${userMessage}`;

      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: payloadMessage, 
          history: historyPayload,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          sessionId: currentSessionId,
          subject: activeSubject
        })
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
          if (data === '[DONE]') {
            // Re-fetch sidebar to get the auto-generated title after a brief delay
            setTimeout(() => {
              loadSidebarSessions();
            }, 1500);
            break;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            
            // Capture Session ID sent at the very start of the stream
            if (parsed.sessionId) {
              setCurrentSessionId(parsed.sessionId);
              loadSidebarSessions(); // Background refresh to show new chat in sidebar
            }
            
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
      // Delayed refresh to capture the auto-generated title from the backend
      setTimeout(() => {
        loadSidebarSessions();
      }, 1500);
    }
  };

  if (isAuthLoading) {
    return <div className="h-screen w-full bg-[#000000] flex items-center justify-center text-white font-medium">Loading...</div>;
  }

  // --- AUTH OVERLAY SCREEN ---
  if (!session) {
    return (
      <div className="h-screen w-full bg-[#0A0A0A] flex items-center justify-center text-white font-sans selection:bg-theme_green/40 selection:text-white">
        <div className="bg-[#000000] p-10 rounded-3xl border border-white/5 shadow-2xl w-full max-w-md flex flex-col items-center relative overflow-hidden">
          {/* Subtle top glow */}
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-theme_green/50 to-transparent"></div>
          
          <div className="w-14 h-14 rounded-2xl bg-theme_green/15 border border-theme_green/25 flex items-center justify-center mb-6">
            <FlaskConical className="w-7 h-7 text-theme_green" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to JEE AI</h1>
          <p className="text-[13.5px] text-gray-400 mb-8 text-center px-4">Your personal, highly-trained JEE mentor.</p>

          {/* Toggle Tabs */}
          <div className="flex w-full bg-[#0A0A0A] p-1.5 rounded-xl border border-white/5 mb-8 relative">
            <div className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-[#171717] rounded-lg shadow-sm transition-all duration-300 ease-out border border-white/5 ${isSignUp ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'}`}></div>
            <button 
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 text-[13px] font-semibold z-10 transition-colors duration-200 ${!isSignUp ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 text-[13px] font-semibold z-10 transition-colors duration-200 ${isSignUp ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth} className="w-full flex flex-col gap-3">
            <input 
              type="email" 
              placeholder="Email address" 
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-theme_green/50 focus:ring-1 focus:ring-theme_green/20 text-sm transition-all text-white placeholder-gray-500"
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-theme_green/50 focus:ring-1 focus:ring-theme_green/20 text-sm transition-all text-white placeholder-gray-500"
            />
            {authError && <p className="text-red-400 text-[13px] mt-1 text-center font-medium bg-red-400/10 border border-red-500/20 py-2 rounded-lg">{authError}</p>}
            <button 
              type="submit"
              className="w-full bg-theme_green hover:bg-theme_green/90 text-black font-bold py-3.5 rounded-xl flex items-center justify-center transition-all duration-200 mt-2 text-sm active:scale-[0.98] shadow-[0_0_20px_rgba(34,197,94,0.15)]"
            >
              {isSignUp ? 'Create secure account' : 'Sign in to your account'}
            </button>
          </form>

          {/* Social Login Separator */}
          <div className="flex items-center w-full gap-3 my-6 opacity-60">
            <div className="h-px bg-white/20 flex-1"></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">or continue with</span>
            <div className="h-px bg-white/20 flex-1"></div>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-[#171717] hover:bg-[#202020] border border-white/10 text-gray-200 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN APP SCREEN ---
  const isWelcomeState = messages.length === 1;

  return (
    <div className="overflow-hidden bg-theme_bg text-[#ECECEC] selection:bg-theme_green/40 selection:text-white font-sans h-screen flex w-full">
      
      {/* --- CUSTOM DELETE MODAL --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1C1C1C] border border-red-500/20 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mb-5">
              <Trash2 className="w-5 h-5 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Delete Chat?</h2>
            <p className="text-[13px] text-gray-400 mb-8">
              This action cannot be undone. This chat and its history will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3 text-[13.5px] font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteChat}
                className="flex-1 py-3 text-[13.5px] font-bold text-red-100 bg-red-500/80 hover:bg-red-500 rounded-xl transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SETTINGS / ONBOARDING MODAL --- */}
      {(showSettings || showOnboarding) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#050505] border border-white/10 rounded-2xl w-full max-w-sm p-6 relative shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-theme_green/15 border border-theme_green/25 flex items-center justify-center mb-5">
              <Settings className="w-5 h-5 text-theme_green" />
            </div>
            
            <h2 className="text-xl font-bold text-white mb-1.5">{showOnboarding ? 'Welcome to JEE AI' : 'Account Settings'}</h2>
            <p className="text-[13px] text-gray-400 mb-8 max-w-[90%]">
              {showOnboarding ? "Let's set up your countdown clock. What year are you taking the exam?" : "Update your profile preferences and target exam year."}
            </p>

            <div className="flex flex-col gap-5 mb-8">
              {showSettings && (
                <div className="flex flex-col gap-4 border-b border-white/5 pb-5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Account Email</label>
                    <div className="px-3.5 py-3 bg-white/5 rounded-xl text-[13.5px] text-gray-300 border border-white/5 truncate">
                      {session?.user?.email}
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[12px] font-medium text-gray-300">App Theme</label>
                    <span className="text-[11px] bg-theme_green/10 text-theme_green px-2.5 py-1 rounded-full border border-theme_green/20">Dark Mode</span>
                  </div>
                </div>
              )}
              
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Target Exam Year</label>
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#0A0A0A] hover:bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-[14px] text-white outline-none focus:border-theme_green/40 focus:ring-1 focus:ring-theme_green/20 appearance-none transition-colors cursor-pointer"
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                  <option value="2029">2029</option>
                </select>
              </div>

              {showSettings && (
                <div className="pt-2">
                  <button 
                    onClick={handleClearAllChats}
                    className="w-full py-3 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-sm font-medium transition-colors"
                  >
                    Clear all chat history
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 w-full">
              {showOnboarding ? (
                <button 
                  onClick={handleSkipOnboarding}
                  className="flex-[0.7] py-3.5 text-[13.5px] font-semibold text-gray-400 hover:text-white transition-colors"
                >
                  Skip for now
                </button>
              ) : (
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-[0.7] py-3.5 text-[13.5px] font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              )}
              
              <button 
                onClick={handleSaveSettings}
                disabled={isSavingYear}
                className="flex-1 bg-theme_green hover:bg-theme_green/90 text-black font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 text-[13.5px]"
              >
                {isSavingYear ? 'Saving...' : 'Save & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`fixed md:relative top-0 left-0 h-full w-64 flex-shrink-0 flex flex-col bg-theme_sidebar border-r border-white/5 z-50 transform transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
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
          {chatSessions.length === 0 ? (
            <p className="px-3 text-xs text-gray-600 mt-4 italic">No recent chats.</p>
          ) : (
            [...chatSessions].sort((a, b) => {
              const aPinned = a.is_pinned;
              const bPinned = b.is_pinned;
              if (aPinned && !bPinned) return -1;
              if (!aPinned && bPinned) return 1;
              return new Date(b.updated_at) - new Date(a.updated_at);
            }).map((s) => {
              const isPinned = s.is_pinned;
              const isEditing = editingSessionId === s.id;
              return (
              <div key={s.id} className="relative group/item mb-0.5">
                <button 
                  onClick={() => { if (!isEditing) loadChatHistory(s.id, s.subject) }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 md:py-2 text-sm rounded-xl text-left transition-colors duration-150 ${currentSessionId === s.id && !isEditing ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  <div className="flex items-center gap-2.5 w-[85%]">
                    {/* Icon removed for cleaner look as requested */}
                    
                    {isEditing ? (
                      <input 
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveRenameChat(s.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRenameChat(s.id);
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                        className="bg-[#222] border border-theme_green/50 text-white text-[13px] rounded px-2 py-0.5 w-full outline-none focus:ring-1 focus:ring-theme_green/20"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="truncate text-[14px] font-medium tracking-tight">{s.title || 'New Chat'}</span>
                    )}
                  </div>
                  {isPinned && !isEditing && <Pin className="w-3 h-3 text-theme_green flex-shrink-0 ml-1" />}
                </button>
                
                {/* 3-Dot Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === s.id ? null : s.id); }}
                  className={`absolute right-1 top-1.5 p-1 rounded-md bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-all duration-200 border border-white/10 ${currentSessionId === s.id || openDropdownId === s.id ? 'opacity-100' : 'opacity-0 md:group-hover/item:opacity-100'}`}
                >
                  <MoreVertical className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                </button>

                {/* Dropdown Menu */}
                {openDropdownId === s.id && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                    <div className="absolute right-0 top-8 w-32 bg-[#2A2A2A] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                      <button onClick={(e) => handleTogglePin(e, s.id, isPinned)} className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-gray-300 hover:bg-white/10 hover:text-white w-full text-left transition-colors">
                        <Pin className="w-3 h-3" /> {isPinned ? 'Unpin' : 'Pin Chat'}
                      </button>
                      <button onClick={(e) => triggerRename(e, s.id, s.title)} className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-gray-300 hover:bg-white/10 hover:text-white w-full text-left transition-colors">
                        <Edit2 className="w-3 h-3" /> Rename
                      </button>
                      <div className="h-px bg-white/10 my-0.5 mx-2" />
                      <button onClick={(e) => triggerDelete(e, s.id)} className="flex items-center gap-2 px-3 py-2.5 text-[12px] text-red-400 hover:bg-red-500/15 w-full text-left transition-colors">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )})
          )}
        </div>

        {/* Profile */}
        <div className="p-3 border-t border-white/5 relative">
          <div className={`absolute bottom-16 left-3 right-3 bg-[#2F2F2F] shadow-2xl border border-white/10 rounded-2xl p-1.5 z-30 flex flex-col gap-0.5 transition-all duration-200 origin-bottom-left ${isProfileOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <button onClick={() => { setShowSettings(true); setIsProfileOpen(false); }} className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/10 rounded-xl text-left text-gray-200 font-medium transition-colors w-full">
              <Settings className="w-4 h-4 opacity-60" /> Settings
            </button>
            <div className="h-px bg-white/10 mx-1" />
            <button onClick={handleLogOut} className="flex items-center w-full gap-2.5 px-3 py-2 text-sm hover:bg-red-500/15 rounded-xl text-left text-red-400 font-medium transition-colors">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          </div>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 hover:bg-white/5 rounded-2xl transition-all duration-150 group"
          >
            {/* ChatGPT-style Profile Circle */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-theme_green/40 to-theme_green/10 border border-theme_green/30 flex items-center justify-center text-[13px] font-bold text-theme_green flex-shrink-0 group-hover:scale-105 transition-transform">
              {(session?.user?.email?.charAt(0) || 'J').toUpperCase()}
            </div>
            <div className="flex flex-col text-left min-w-0">
              <span className="text-[13.5px] font-bold text-white transition-colors truncate">
                {session?.user?.email?.split('@')[0] || 'JEE Aspirant'}
              </span>
            </div>
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="flex-1 flex flex-col h-full relative z-0 min-w-0">
        
        {/* Top Header Area */}
        <div className="absolute top-0 w-full flex justify-center pt-3 md:pt-5 z-10 pointer-events-none px-4">
          
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            className="absolute left-3 top-3.5 md:hidden p-2.5 bg-[#2A2A2A] border border-white/8 rounded-xl shadow-lg pointer-events-auto text-gray-300 hover:text-white transition-colors active:scale-95"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Subject Switcher */}
          <div className="flex items-center p-0.5 md:p-1 bg-[#111111] border border-white/8 rounded-full shadow-lg pointer-events-auto ml-9 md:ml-0">
            {['PHYSICS', 'CHEMISTRY', 'MATHS'].map(sub => {
              const Icon = SUBJECT_ICONS[sub];
              const isActive = activeSubject === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`flex items-center gap-1 md:gap-1.5 px-2.5 md:px-4 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-bold tracking-wider transition-all duration-250 shrink-0 ${isActive ? 'bg-theme_green/15 text-theme_green border border-theme_green/20' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  <Icon className="w-3 h-3 hidden sm:block" />
                  {sub}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat / Welcome Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-16 pt-20 md:pt-24 scroll-smooth pb-36">
          {isWelcomeState ? (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-full pb-48 text-center">
              <div className="w-14 h-14 rounded-2xl bg-theme_green/15 border border-theme_green/25 flex items-center justify-center mb-5">
                <FlaskConical className="w-7 h-7 text-theme_green" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">What do you want to learn today?</h1>
              <p className="text-[15px] text-gray-500 mb-8 max-w-sm">Ask anything from {activeSubject.charAt(0) + activeSubject.slice(1).toLowerCase()} — I'll explain it clearly, step by step.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {SUGGESTIONS[activeSubject].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.text)}
                    className="flex items-start gap-3 p-4 bg-[#0A0A0A] hover:bg-[#111111] border border-white/6 hover:border-theme_green/20 rounded-2xl text-left transition-all duration-200 group"
                  >
                    <span className="text-xl flex-shrink-0">{s.emoji}</span>
                    <span className="text-[13px] md:text-[13.5px] text-[#F3F4F6] group-hover:text-white leading-snug transition-colors">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-6 md:gap-8 pb-10">
              {messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="bg-[#171717] text-white px-5 py-3 rounded-2xl max-w-[85%] md:max-w-[75%] text-[14px] md:text-[15px] leading-relaxed shadow-sm border border-white/[0.03]">
                      {msg.content.replace(/^\[Context:.*?\]\s*/, '')}
                    </div>
                  ) : (
                    <div className="text-[#F3F4F6] max-w-[95%] md:max-w-[92%] text-[14.5px] md:text-[15.5px] leading-relaxed relative markdown-body text-left w-full">
                      {msg.content ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
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
        <div className="absolute w-full bottom-0 bg-gradient-to-t from-theme_bg via-theme_bg/95 to-transparent pt-10 pb-4 md:pb-8 px-3 md:px-16 z-10 pointer-events-none">
          <div className="max-w-2xl mx-auto relative bg-theme_input rounded-2xl border-2 border-white/10 overflow-hidden focus-within:border-theme_green/40 shadow-2xl focus-within:ring-2 focus-within:ring-theme_green/10 transition-all duration-300 pointer-events-auto">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Ask about ${activeSubject.toLowerCase()}...`}
              className="w-full max-h-32 md:max-h-40 min-h-[52px] md:min-h-[56px] py-3.5 md:py-4 pl-4 pr-12 bg-transparent resize-none outline-none text-[14.5px] md:text-[15.5px] text-white placeholder-[#555] disabled:opacity-50 leading-relaxed"
              rows="1"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-3 bottom-3 w-8 h-8 md:w-9 md:h-9 bg-white disabled:bg-[#333] disabled:cursor-not-allowed rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 hover:bg-gray-200 shadow-md"
            >
              <ArrowUp className="w-4 h-4 md:w-5 md:h-5 text-black disabled:text-gray-500" />
            </button>
          </div>
          <p className="text-center text-[10px] md:text-[11px] text-[#444] mt-2 md:mt-3 tracking-wide pointer-events-auto">
            Always verify with NCERT & standard materials.
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
