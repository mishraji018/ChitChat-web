import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Trash2, Bot, User } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAssistant = ({ isOpen, onClose }: AIAssistantProps) => {
  const { messages, askAI, isLoading, clearChat } = useAIChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    askAI(input);
    setInput('');
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
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#0f0f0f] border-l border-white/10 z-[70] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#141414]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/20">
                  <Sparkles className="text-purple-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-100">Blink AI</h3>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Online Assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={clearChat}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={onClose}
                  className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
            >
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center border border-white/5">
                    <Bot className="text-zinc-500" size={32} />
                  </div>
                  <div>
                    <p className="text-zinc-100 font-medium">How can I help you today?</p>
                    <p className="text-zinc-500 text-sm mt-1 px-8">Ask me anything! I can help you with advice, fun facts, or just a quick chat.</p>
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
                        : "bg-zinc-900 text-zinc-100 border border-white/5 rounded-tl-none"
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
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-6 border-t border-white/5 bg-[#141414]">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="w-full bg-[#0f0f0f] border border-white/5 rounded-xl py-3 pl-4 pr-12 text-sm text-zinc-100 focus:outline-none focus:border-purple-500/50 transition-all placeholder:text-zinc-600"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-lg transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
              <p className="text-[10px] text-center text-zinc-600 mt-4 uppercase tracking-tighter">
                Powered by Groq Llama 3 • Responses may vary
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
