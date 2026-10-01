/**
 * FILE: InputBar.tsx
 * PURPOSE: Handles message input, file attachments, AI suggestions, recording, and emoji picking
 * HOOKS USED: useState, useRef, useEffect, useAIReply
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, X, Loader2, Sparkles, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types/chat';
import { useAIReply } from '@/hooks/useAIReply';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { compressImage } from '@/hooks/useFileUpload';

interface Props { 
  onSend: (t: string, type?: string, m?: any) => void; 
  t: any; 
  currentUser: User; 
  disabled?: boolean; 
  onTyping?: () => void; 
  messages?: any[]; 
  currentUserId: string; 
  onSendFile?: (f: File) => void; 
  isRecipientOnline?: boolean; 
  onOpenAI?: () => void;
  value?: string;
  onChange?: (val: string) => void;
  replyToMessage?: { id: string; senderName?: string; text: string } | null;
  onCancelReply?: () => void;
}

const InputBar = ({ 
  onSend, t, currentUser, disabled, onTyping, isRecipientOnline = true, 
  messages = [], currentUserId, onSendFile, onOpenAI,
  value, onChange, replyToMessage, onCancelReply
}: Props) => {
  // ─── [1-40] State & Refs ──────────────────
  const [sFile, setSFile] = useState<File | null>(null);
  const [fPrev, setFPrev] = useState<string | null>(null);
  const [internalText, setInternalText] = useState('');
  
  const text = value !== undefined ? value : internalText;
  const setText = (val: string) => {
    if (onChange) onChange(val);
    else setInternalText(val);
  };
  const [isRec, setIsRec] = useState(false);
  const [recT, setRecT] = useState(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const inRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const tRef = useRef<ReturnType<typeof setInterval>>();
  const { suggestions: aiS, isLoading: aiL, getSuggestions, clearSuggestions } = useAIReply();

  // ─── [41-110] Handlers ────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSendMsg = () => {
    if (sFile) { onSendFile?.(sFile); setSFile(null); setFPrev(null); return; }
    if (!text.trim()) return;
    onSend(text.trim()); setText(''); clearSuggestions(); setShowEmoji(false); inRef.current?.focus();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) return toast.error('Max 50MB');
    
    setSFile(f); 
    setFPrev(f.type.startsWith('image/') ? URL.createObjectURL(f) : null);

    if (f.type.startsWith('image/')) {
      setIsOptimizing(true);
      try {
        const compressed = await compressImage(f);
        setSFile(compressed);
        setFPrev(URL.createObjectURL(compressed));
      } catch (err) {
        console.error('Compression failed:', err);
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setText(text + emojiData.emoji);
    // inRef.current?.focus(); // Uncomment if you want to keep focus on input
  };

  const getFStat = (s: number) => s < 1024 * 1024 ? { t: 'Small', c: 'text-green-400' } : s < 10 * 1024 * 1024 ? { t: 'Med', c: 'text-yellow-400' } : { t: 'Large', c: 'text-orange-400' };
  const startRec = () => { setIsRec(true); setRecT(0); tRef.current = setInterval(() => setRecT(t => t + 1), 1000); };
  const stopRec = (s: boolean) => { setIsRec(false); clearInterval(tRef.current); if (s) onSend('🎤 Voice note'); setRecT(0); };

  // ─── [111-321] Render ─────────────────────
  return (
    <div className="relative bg-[var(--bg-primary)] border-t border-[var(--border-color)] p-4 teal-input-wrapper">
      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmoji && (
          <motion.div 
            ref={emojiRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }} 
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-4 z-[60] mb-2 shadow-2xl"
          >
            <EmojiPicker 
              theme={document.documentElement.getAttribute('data-theme') === 'light' ? Theme.LIGHT : Theme.DARK} 
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
              width={320}
              height={400}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{sFile && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 right-0 p-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] z-50 flex items-center gap-4">{fPrev ? <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0"><img src={fPrev} alt="P" className="w-full h-full object-cover" /></div> : <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-2xl">{sFile.type.startsWith('video/') ? '🎥' : '📄'}</div>}<div className="flex-1 min-w-0"><p className="text-sm font-medium text-[var(--text-primary)] truncate">{sFile.name}</p><p className={cn("text-xs font-bold flex items-center gap-2", isOptimizing ? "text-purple-400" : getFStat(sFile.size).c)}>{isOptimizing && <Loader2 size={12} className="animate-spin" />}{isOptimizing ? "Optimizing..." : getFStat(sFile.size).t}</p></div><button onClick={() => { setSFile(null); setFPrev(null); setIsOptimizing(false); }} className="p-2 text-[var(--text-secondary)] hover:text-red-400"><X size={20} /></button></motion.div>}</AnimatePresence>
      
      <AnimatePresence>
        {aiS.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-0 right-0 p-4 bg-gradient-to-t from-[var(--bg-primary)] to-transparent z-40">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {aiS.map((s, i) => <button key={i} onClick={() => { setText(s); clearSuggestions(); }} className="px-4 py-2 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-[13px] text-purple-100 hover:bg-purple-500/30 shadow-xl backdrop-blur-md transition-all">{s}</button>)}
              <button onClick={clearSuggestions} className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{!isRecipientOnline && !disabled && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="offline-banner bg-purple-500/10 text-[11px] text-purple-300 py-1.5 px-4 mb-3 rounded-full border border-purple-500/20">Recipient is offline. Messages queued.</motion.div>}</AnimatePresence>
      
      <input type="file" ref={fileRef} className="hidden" onChange={onFile} accept="*/*" />
      
      {isRec ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 h-14 bg-[var(--bg-secondary)] rounded-[1.8rem] px-5 border border-red-500/20 shadow-md">
          <button onClick={() => stopRec(false)} className="text-[var(--text-secondary)]"><X size={20} /></button>
          <div className="flex items-center gap-2 flex-1 h-full">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-500 font-bold">{Math.floor(recT/60)}:{(recT%60).toString().padStart(2,'0')}</span>
            <div className="flex items-center gap-0.5 flex-1 justify-center">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div key={i} className="w-[3px] rounded-full bg-primary" animate={{ height: [4, 4 + Math.random() * 20, 4] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.03 }} />
              ))}
            </div>
          </div>
          <button onClick={() => stopRec(true)} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg text-primary-foreground">
            <Send size={18} className="ml-0.5" />
          </button>
        </motion.div>
      ) : (
        <div className={`p-3 md:p-4 rounded-[2rem] border border-[var(--border-color)] bg-[var(--input-bg,#ffffff)]/10 backdrop-blur-md shadow-lg transition-all focus-within:ring-2 focus-within:ring-white/20 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          {replyToMessage && (
            <div className="mb-2 px-3 py-2 bg-black/5 dark:bg-white/10 border-l-4 border-primary rounded-xl flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-primary block truncate">Replying to {replyToMessage.senderName || 'User'}</span>
                <span className="text-[var(--text-secondary)] truncate block">{replyToMessage.text}</span>
              </div>
              <button 
                onClick={onCancelReply} 
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/10 ml-2"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="relative">
            <textarea
              ref={inRef as any}
              rows={2}
              disabled={disabled}
              value={text}
              onChange={(e) => { setText(e.target.value); onTyping?.(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMsg();
                }
              }}
              placeholder={disabled ? "Blocked" : "Write your message...."}
              className="w-full bg-transparent border-none outline-none resize-none px-3 pt-2 text-[15px] md:text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-60"
            />
          </div>

          <div className="flex items-center justify-between pt-1 px-1">
            <button
              type="button"
              disabled={disabled}
              onClick={onOpenAI}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 transition-all"
            >
              <Sparkles size={14} className="text-yellow-300" />
              <span>Blink AI</span>
            </button>

            <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setShowEmoji(!showEmoji)}
                className={cn("p-2 rounded-xl transition-all hover:bg-white/10", showEmoji ? "text-primary bg-white/10" : "opacity-80 hover:opacity-100")}
                title="Emoji"
              >
                <Smile size={20} />
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl transition-all hover:bg-white/10 opacity-80 hover:opacity-100"
                title="Attach document or file"
              >
                <Paperclip size={20} />
              </button>

              <button
                type="button"
                disabled={disabled}
                onClick={() => fileRef.current?.click()}
                className="p-2 rounded-xl transition-all hover:bg-white/10 opacity-80 hover:opacity-100"
                title="Attach media image"
              >
                <Image size={20} />
              </button>

              {text.trim() || sFile ? (
                <button
                  type="button"
                  onClick={onSendMsg}
                  disabled={disabled}
                  className="ml-1 p-2.5 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-md hover:scale-105 active:scale-95 transition-all"
                  title="Send message"
                >
                  <Send size={18} className="ml-0.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onMouseDown={startRec}
                  disabled={disabled}
                  className="p-2 rounded-xl transition-all hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
                  title="Voice note"
                >
                  <Mic size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InputBar;
