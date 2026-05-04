import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Trash2, Bot, User, Search, Brain, Loader2, MessageSquare } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import { cn } from '@/lib/utils';
import { Chat } from '@/types/chat';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  chats?: Chat[];
}

type AIMode = 'ask' | 'scan';

export const AIAssistant = ({ isOpen, onClose, chats = [] }: AIAssistantProps) => {
  const { messages, askAI, isLoading, clearChat } = useAIChat();
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AIMode>('ask');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, scanResult]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    askAI(input);
    setInput('');
  };

  const handleScanChats = async () => {
    setIsScanning(true);
    setScanResult(null);
    setMode('scan');

    try {
      // Fetch last 5 messages from each of user's top 3 chats
      const topChats = [...chats]
        .sort((a, b) => {
          const dateA = new Date(a.lastMessageAt || a.updatedAt || 0).getTime();
          const dateB = new Date(b.lastMessageAt || b.updatedAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 3);

      const chatData = topChats.map(chat => ({
        contact: chat.user.displayName || chat.user.username,
        messages: chat.messages.slice(-5).map(m => ({
          role: m.senderId === chat.user.id ? 'contact' : 'me',
          text: m.content || m.text
        }))
      }));

      const prompt = `Analyze these conversations and tell me: 
1. Who needs a reply urgently?
2. Any important topics discussed?
3. Overall mood of conversations

CONVERSATIONS:
${JSON.stringify(chatData, null, 2)}`;

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
            {
              role: 'system',
              content: 'You are Blink AI, a professional chat analyst. Provide a clear, formatted summary of the conversations provided.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      if (response.ok) {
        setScanResult(data.choices[0].message.content);
      } else {
        throw new Error('Failed to scan chats');
      }
    } catch (error) {
      setScanResult("Sorry, I couldn't scan your chats right now. Please try again later!");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
          />

          {/* Bottom Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 h-[85vh] bg-[#1a1a1a] border-t border-white/10 z-[70] flex flex-col shadow-2xl rounded-t-[32px] overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-900/20 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                  <Sparkles className="text-purple-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100 flex items-center gap-2">
                    Blink AI <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Assistant</span>
                  </h3>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors bg-white/5 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mode Selectors */}
            <div className="p-4 flex gap-3 bg-[#141414]/50">
              <button 
                onClick={() => setMode('ask')}
                className={cn(
                  "flex-1 p-3 rounded-2xl border transition-all flex items-center gap-3",
                  mode === 'ask' 
                    ? "bg-purple-600/10 border-purple-500/50 text-purple-400" 
                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", mode === 'ask' ? "bg-purple-600 text-white" : "bg-zinc-800")}>
                  <MessageSquare size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold">Ask Anything</p>
                  <p className="text-[10px] opacity-60">Chat with Blink AI</p>
                </div>
              </button>
              <button 
                onClick={() => {
                  setMode('scan');
                  if (!scanResult) handleScanChats();
                }}
                className={cn(
                  "flex-1 p-3 rounded-2xl border transition-all flex items-center gap-3",
                  mode === 'scan' 
                    ? "bg-purple-600/10 border-purple-500/50 text-purple-400" 
                    : "bg-white/5 border-transparent text-zinc-500 hover:bg-white/10"
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", mode === 'scan' ? "bg-purple-600 text-white" : "bg-zinc-800")}>
                  <Search size={16} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold">Scan My Chats</p>
                  <p className="text-[10px] opacity-60">AI Smart Summary</p>
                </div>
              </button>
            </div>

            {/* Content Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
            >
              {mode === 'ask' ? (
                <>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-20">
                      <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center border border-white/5">
                        <Bot className="text-zinc-500" size={32} />
                      </div>
                      <div>
                        <p className="text-zinc-100 font-medium">How can I help you today?</p>
                        <p className="text-zinc-500 text-sm mt-1 px-8">Ask me anything!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "flex flex-col space-y-2",
                          msg.role === 'user' ? "items-end" : "items-start"
                        )}
                      >
                        <div className={cn(
                          "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                          msg.role === 'user' ? "text-zinc-500 flex-row-reverse" : "text-purple-400"
                        )}>
                          {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                          {msg.role === 'user' ? 'You' : 'Blink AI'}
                        </div>
                        <div className={cn(
                          "max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed",
                          msg.role === 'user' 
                            ? "bg-purple-600 text-white rounded-tr-none" 
                            : "bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-none shadow-xl"
                        )}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex flex-col items-start space-y-2">
                      <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                        <Bot size={12} />
                        Blink AI
                      </div>
                      <div className="bg-zinc-900 border border-white/5 p-4 rounded-2xl rounded-tl-none">
                        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-6">
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                        <Brain className="absolute inset-0 m-auto text-purple-400 animate-pulse" size={24} />
                      </div>
                      <p className="text-zinc-100 font-medium">Scanning your conversations...</p>
                      <p className="text-zinc-500 text-sm">Analyzing last 5 messages from top chats</p>
                    </div>
                  ) : scanResult ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-2 text-[10px] text-purple-400 font-bold uppercase tracking-widest mb-3">
                        <Search size={12} />
                        Smart Analysis
                      </div>
                      <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap shadow-xl">
                        {scanResult}
                      </div>
                      <button 
                        onClick={handleScanChats}
                        className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-xs font-bold text-zinc-400 transition-all border border-white/5"
                      >
                        Refresh Analysis
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Input Area (Only for Ask Mode) */}
            {mode === 'ask' && (
              <div className="p-6 border-t border-white/5 bg-[#141414]">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything..."
                    className="w-full bg-[#0f0f0f] border border-white/5 rounded-2xl py-4 pl-5 pr-14 text-sm text-zinc-100 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="absolute right-2 p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-xl transition-all shadow-lg"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
