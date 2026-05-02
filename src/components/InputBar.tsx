/**
 * FILE: InputBar.tsx
 * PURPOSE: Handles message input, file attachments, AI suggestions, recording, and emoji picking
 * HOOKS USED: useState, useRef, useEffect, useAIReply
 */

import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip, Mic, X, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/types/chat';
import { useAIReply } from '@/hooks/useAIReply';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EmojiPicker, { Theme, EmojiClickData } from 'emoji-picker-react';
import { compressImage } from '@/hooks/useFileUpload';

interface Props { onSend: (t: string, type?: string, m?: any) => void; t: any; currentUser: User; disabled?: boolean; onTyping?: () => void; messages?: any[]; currentUserId: string; onSendFile?: (f: File) => void; isRecipientOnline?: boolean; }

const InputBar = ({ onSend, t, currentUser, disabled, onTyping, isRecipientOnline = true, messages = [], currentUserId, onSendFile }: Props) => {
  // ─── [1-40] State & Refs ──────────────────
  const [sFile, setSFile] = useState<File | null>(null);
  const [fPrev, setFPrev] = useState<string | null>(null);
  const [text, setText] = useState('');
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
    setText(prev => prev + emojiData.emoji);
    // inRef.current?.focus(); // Uncomment if you want to keep focus on input
  };

  const getFStat = (s: number) => s < 1024 * 1024 ? { t: 'Small', c: 'text-green-400' } : s < 10 * 1024 * 1024 ? { t: 'Med', c: 'text-yellow-400' } : { t: 'Large', c: 'text-orange-400' };
  const startRec = () => { setIsRec(true); setRecT(0); tRef.current = setInterval(() => setRecT(t => t + 1), 1000); };
  const stopRec = (s: boolean) => { setIsRec(false); clearInterval(tRef.current); if (s) onSend('🎤 Voice note'); setRecT(0); };

  // ─── [111-321] Render ─────────────────────
  return (
    <div className="relative bg-[#0f0f0f] border-t border-white/5 p-4">
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
              theme={Theme.DARK} 
              onEmojiClick={onEmojiClick}
              autoFocusSearch={false}
              width={320}
              height={400}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{sFile && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full left-0 right-0 p-4 bg-[#1a1a1a] border-t border-white/5 z-50 flex items-center gap-4">{fPrev ? <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0"><img src={fPrev} alt="P" className="w-full h-full object-cover" /></div> : <div className="w-16 h-16 rounded-lg bg-white/5 flex items-center justify-center shrink-0 text-2xl">{sFile.type.startsWith('video/') ? '🎥' : '📄'}</div>}<div className="flex-1 min-w-0"><p className="text-sm font-medium text-zinc-100 truncate">{sFile.name}</p><p className={cn("text-xs font-bold flex items-center gap-2", isOptimizing ? "text-purple-400" : getFStat(sFile.size).c)}>{isOptimizing && <Loader2 size={12} className="animate-spin" />}{isOptimizing ? "Optimizing..." : getFStat(sFile.size).t}</p></div><button onClick={() => { setSFile(null); setFPrev(null); setIsOptimizing(false); }} className="p-2 text-zinc-500 hover:text-red-400"><X size={20} /></button></motion.div>}</AnimatePresence>
      
      <AnimatePresence>
        {aiS.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-0 right-0 p-4 bg-gradient-to-t from-[#0f0f0f] to-transparent z-40">
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {aiS.map((s, i) => <button key={i} onClick={() => { setText(s); clearSuggestions(); }} className="px-4 py-2 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-[13px] text-purple-100 hover:bg-purple-500/30 shadow-xl backdrop-blur-md transition-all">{s}</button>)}
              <button onClick={clearSuggestions} className="p-2 text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>{!isRecipientOnline && !disabled && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="bg-purple-500/10 text-[11px] text-purple-300 py-1.5 px-4 mb-3 rounded-full border border-purple-500/20">Recipient is offline. Messages queued.</motion.div>}</AnimatePresence>
      
      <input type="file" ref={fileRef} className="hidden" onChange={onFile} accept="*/*" />
      
      {isRec ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 h-11"><button onClick={() => stopRec(false)} className="text-zinc-500"><X size={20} /></button><div className="flex items-center gap-2 flex-1 bg-[#1a1a1a] rounded-2xl px-4 h-full border border-red-500/20"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-red-500 font-bold">{Math.floor(recT/60)}:{(recT%60).toString().padStart(2,'0')}</span><div className="flex items-center gap-0.5 flex-1 justify-center">{Array.from({ length: 20 }).map((_, i) => <motion.div key={i} className="w-[3px] rounded-full bg-purple-500" animate={{ height: [4, 4 + Math.random() * 20, 4] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.03 }} />)}</div></div><button onClick={() => stopRec(true)} className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg"><Send size={20} className="text-white ml-0.5" /></button></motion.div>
      ) : (
        <div className={`flex items-center gap-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex-1 bg-[#1a1a1a] rounded-2xl flex items-center px-2 py-1.5 border border-white/5 focus-within:border-purple-500/50 transition-all">
            <button 
              disabled={disabled} 
              onClick={() => setShowEmoji(!showEmoji)} 
              className={cn("p-3 md:p-2.5 transition-colors hover:text-purple-400", showEmoji ? "text-purple-400" : "text-zinc-500")}
            >
              <Smile size={22} />
            </button>
            <input ref={inRef} type="text" disabled={disabled} value={text} onChange={(e) => { setText(e.target.value); onTyping?.(); }} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), onSendMsg())} placeholder={disabled ? "Blocked" : "Write..."} className="flex-1 bg-transparent border-none px-2 py-2 text-[16px] md:text-[15px] text-zinc-100 focus:outline-none" />
            <button disabled={disabled} onClick={() => fileRef.current?.click()} className="p-3 md:p-2.5 text-zinc-500 hover:text-purple-400"><Paperclip size={22} /></button>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              disabled={disabled || aiL} 
              onClick={() => getSuggestions(messages || [], currentUserId)} 
              className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-purple-400 hover:bg-purple-500/5 transition-all"
            >
              {aiL ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
            </button>
            
            {text.trim() || sFile ? (
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={onSendMsg} disabled={disabled} className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <Send size={18} className="text-white ml-0.5" />
              </motion.button>
            ) : (
              <button onMouseDown={startRec} disabled={disabled} className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-zinc-500 hover:text-purple-400 transition-colors"><Mic size={22} /></button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputBar;
