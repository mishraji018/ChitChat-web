import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Send, Loader2, MessageSquare, Search } from 'lucide-react';
import { Chat, Message, User } from '@/types/chat';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  messages: Message[];
  recipientName: string;
  onApplySuggestion: (text: string) => void;
}

const AIPanel = ({ isOpen, onClose, currentUser, messages, recipientName, onApplySuggestion }: AIPanelProps) => {
  const [mode, setMode] = useState<'menu' | 'ask' | 'suggest'>('menu');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, aiResponse]);

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMsg = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 500,
          messages: [
            { role: 'system', content: `You are Blink AI. Current chat is with ${recipientName}. Help the user with their conversation.` },
            ...chatHistory,
            { role: 'user', content: userMsg }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Groq error:', data);
        throw new Error(data.error?.message || 'API Error');
      }

      if (!data.choices || !data.choices[0]) {
        throw new Error('No response from AI');
      }

      const aiMsg = data.choices[0].message.content;
      setChatHistory(prev => [...prev, { role: 'assistant', content: aiMsg }]);
    } catch (err) {
      console.error('AI Error:', err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggest = async () => {
    setIsScanning(true);
    setMode('suggest');
    setSuggestions([]);
    
    // Simulate laser scan effect for 1.5 seconds
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const lastMessages = messages
        .filter(m => m.content || (m as any).text)
        .slice(-10)
        .map(m => `${m.senderId === currentUser.id ? 'Me' : recipientName}: ${m.content || (m as any).text}`)
        .join('\n');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 300,
          messages: [
            { role: 'system', content: 'You are a chat assistant. Analyze this conversation and suggest 3 natural next replies the user can send. Reply in Hinglish (mix of Hindi and English). Be casual and friendly. Return ONLY a JSON array of strings: ["reply1", "reply2", "reply3"]' },
            { role: 'user', content: lastMessages || "No recent messages found." }
          ]
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error('API Error');

      const content = data.choices[0]?.message?.content || "[]";
      // Basic JSON array extraction in case AI wraps it in backticks
      const jsonStr = content.includes('[') ? content.substring(content.indexOf('['), content.lastIndexOf(']') + 1) : "[]";
      const parsed = JSON.parse(jsonStr);
      setSuggestions(Array.isArray(parsed) ? parsed : []);
    } catch (err) {
      console.error('Suggest Error:', err);
      setSuggestions(["How are you?", "Kya chal raha hai?", "Talk to you later!"]);
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setMode('menu');
    setQuery('');
    setSuggestions([]);
    setChatHistory([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="absolute bottom-[80px] left-0 right-0 z-50 p-4 pointer-events-none"
        >
          <div className="w-full max-h-[400px] flex flex-col bg-[#0f0f0f]/85 backdrop-blur-[20px] border border-white/10 rounded-[24px] shadow-2xl pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400">
                  <Sparkles size={16} />
                </div>
                <h3 className="font-bold text-zinc-100">Blink AI</h3>
              </div>
              <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-none" ref={scrollRef}>
              {mode === 'menu' && (
                <div className="grid grid-cols-2 gap-3 py-4">
                  <button 
                    onClick={() => setMode('ask')}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all flex flex-col items-center gap-3 text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-zinc-100">Ask Anything</p>
                      <p className="text-[10px] text-zinc-500">Chat with AI assistant</p>
                    </div>
                  </button>
                  <button 
                    onClick={handleSuggest}
                    className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/30 transition-all flex flex-col items-center gap-3 text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-zinc-100">💡 Suggest Replies</p>
                      <p className="text-[10px] text-zinc-500">Smart Hinglish replies</p>
                    </div>
                  </button>
                </div>
              )}

              {mode === 'ask' && (
                <div className="space-y-4">
                  {chatHistory.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${m.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-white/10 text-zinc-200 rounded-tl-none'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/10 px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin text-purple-400" />
                        <span className="text-xs text-zinc-500">Blink AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {mode === 'suggest' && (
                <div className="relative">
                  {isScanning ? (
                    <div className="py-12 flex flex-col items-center justify-center relative overflow-hidden rounded-2xl bg-white/5">
                      <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 mb-4 animate-pulse">
                        <Sparkles size={32} />
                      </div>
                      <p className="text-sm font-bold text-zinc-100">Analyzing Conversation...</p>
                      <p className="text-[11px] text-zinc-500 mt-1">Generating smart replies</p>
                      
                      {/* Laser Scan Line */}
                      <div className="absolute inset-0 pointer-events-none">
                        <motion.div 
                          animate={{ top: ['0%', '100%', '0%'] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_15px_rgba(168,85,247,0.8)] z-20"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center text-purple-400">
                          <Sparkles size={12} />
                        </div>
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Suggested Replies</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { onApplySuggestion(s); onClose(); }}
                            className="w-full text-left px-5 py-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-purple-500/40 text-[14px] text-zinc-200 transition-all active:scale-[0.98]"
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-center pt-2">
                        <button onClick={reset} className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest">Back to Menu</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer / Input */}
            {mode === 'ask' && (
              <form onSubmit={handleAsk} className="p-4 bg-black/20 border-t border-white/5 flex items-center gap-3">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask me anything..." 
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                />
                <button 
                  type="submit"
                  disabled={!query.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            )}

            {mode !== 'menu' && !isLoading && !isScanning && mode !== 'suggest' && (
              <div className="px-5 py-3 border-t border-white/5 flex justify-center">
                <button onClick={reset} className="text-xs font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest">Back to Menu</button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIPanel;
