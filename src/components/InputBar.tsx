import { toast } from 'sonner';
import { compressImage, generateVideoThumbnail } from '@/utils/imageCompressor';
import { getToken } from '@/utils/tokenManager';
import { useState, useRef } from 'react';
import { Send, Smile, Paperclip, Mic, Image, FileText, MapPin, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { ThemeType, User } from '@/types/chat';
import { useAIReply } from '@/hooks/useAIReply';
import { Loader2 } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string, type?: string, mediaData?: any) => void;
  currentTheme?: ThemeType;
  t: any;
  currentUser: User;
  disabled?: boolean;
  onTyping?: () => void;
  isRecipientOnline?: boolean;
  messages?: any[];
}

const InputBar = ({ onSend, currentTheme, t, currentUser, disabled, onTyping, isRecipientOnline = true, messages = [] }: InputBarProps) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [activeUploadType, setActiveUploadType] = useState<string>('image');

  const { suggestions: aiSuggestions, isLoading: aiLoading, getSuggestions, clearSuggestions } = useAIReply(currentUser.id);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
    setShowEmoji(false);
    clearSuggestions();
    inputRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let fileToUpload = file;
      let thumbnail = '';

      if (file.type.startsWith('image/')) {
        toast.info('Optimizing image...');
        fileToUpload = await compressImage(file);
      } else if (file.type.startsWith('video/')) {
        toast.info('Generating thumbnail...');
        thumbnail = await generateVideoThumbnail(file);
      }

      const sizeMB = (fileToUpload.size / 1024 / 1024).toFixed(2);
      
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = getToken();
      
      const res = await fetch(`${API_URL}/api/media/upload/${activeUploadType}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();

      if (data.url) {
        onSend(data.url, activeUploadType, {
          fileName: file.name,
          fileSize: `${sizeMB} MB`,
          thumbnail: thumbnail || data.thumbnail,
          ...data
        });
      }
    } catch (err) {
      toast.error('Upload failed. Try again.');
      console.error(err);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startRecording = () => {
    setIsRecording(true);
    setRecordTime(0);
    timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    // TODO: connect API here — start audio recording
  };

  const stopRecording = (send: boolean) => {
    setIsRecording(false);
    clearInterval(timerRef.current);
    if (send) {
      // TODO: connect API here — send voice note
      onSend('🎤 Voice note');
    }
    setRecordTime(0);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const attachOptions = [
    { icon: Image, label: 'Photo/Video', color: 'text-primary' },
    { icon: FileText, label: 'Document', color: 'text-accent' },
    { icon: MapPin, label: 'Location', color: 'text-destructive' },
  ];

  const suggestionCategories = [
    { label: "😂 Funny", tone: "funny" },
    { label: "❤️ Sweet", tone: "romantic" },
    { label: "😎 Cool", tone: "cool" }
  ];

  return (
    <div className="relative bg-[#0f0f0f] border-t border-white/5 p-4">
      {/* AI Suggestion Bubbles Overlay */}
      <AnimatePresence>
        {aiSuggestions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-full left-0 right-0 p-4 pb-0 bg-gradient-to-t from-[#0f0f0f] to-transparent z-40"
          >
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {aiSuggestions.map((s, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setText(s);
                    clearSuggestions();
                  }}
                  className="px-4 py-2 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-[13px] text-purple-100 hover:bg-purple-500/20 transition-all shadow-xl backdrop-blur-md"
                >
                  {s}
                </motion.button>
              ))}
              <button 
                onClick={clearSuggestions}
                className="p-2 text-zinc-500 hover:text-zinc-300"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Category Chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none items-center">
        <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold mr-1">AI Reply:</span>
        {suggestionCategories.map((s, i) => (
          <button
            key={i}
            disabled={aiLoading}
            onClick={() => getSuggestions(messages, s.tone)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-[#1a1a1a] border border-white/5 text-[12px] text-zinc-400 hover:text-purple-400 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all duration-300 flex items-center gap-2"
          >
            {s.label}
            {aiLoading && <Loader2 size={12} className="animate-spin text-purple-500" />}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {!isRecipientOnline && !disabled && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-purple-500/10 text-[11px] text-purple-300 py-1.5 px-4 mb-3 rounded-full flex items-center gap-2 font-medium border border-purple-500/20"
          >
            <span className="text-purple-400">🕙</span>
            <span>Recipient is offline. Messages will be delivered when they connect.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileUpload}
        accept={activeUploadType === 'image' ? "image/*,video/*" : ".pdf,.doc,.docx,.xls,.xlsx,.txt"}
      />

      {isRecording ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 h-11">
          <button onClick={() => stopRecording(false)} className="text-zinc-500 hover:text-zinc-300">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 bg-[#1a1a1a] rounded-2xl px-4 h-full border border-red-500/20">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-500 font-bold">{formatTime(recordTime)}</span>
            <div className="flex items-center gap-0.5 flex-1 justify-center">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-purple-500"
                  animate={{ height: [4, 4 + Math.random() * 20, 4] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.03 }}
                />
              ))}
            </div>
          </div>
          <button onClick={() => stopRecording(true)} className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Send size={20} className="text-white ml-0.5" />
          </button>
        </motion.div>
      ) : (
        <div className={`flex items-center gap-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex-1 bg-[#1a1a1a] rounded-2xl flex items-center px-2 py-1.5 border border-white/5 focus-within:border-purple-500/50 focus-within:ring-4 focus-within:ring-purple-500/10 transition-all duration-300">
            <button
              disabled={disabled}
              onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
              className="p-2.5 text-zinc-500 hover:text-purple-400 transition-colors shrink-0"
            >
              <Smile size={22} />
            </button>
            <input
              ref={inputRef}
              type="text"
              disabled={disabled}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onTyping?.();
              }}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "You cannot message a blocked contact" : "Write something..."}
              className="flex-1 bg-transparent border-none px-2 py-2 text-[15px] text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
            />
            <button
              disabled={disabled}
              onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
              className="p-2.5 text-zinc-500 hover:text-purple-400 transition-colors shrink-0"
            >
              <Paperclip size={22} />
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setText(prev => prev + '🌶️')}
              className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-xl hover:bg-purple-500/5 hover:border-purple-500/30 transition-all duration-300"
              title="Add Spice"
            >
              🌶️
            </button>
            
            {text.trim() ? (
              <motion.button
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                onClick={handleSend}
                disabled={disabled}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/30 hover:scale-105 transition-transform"
              >
                <Send size={18} className="text-white ml-0.5" />
              </motion.button>
            ) : (
              <button
                onMouseDown={startRecording}
                disabled={disabled}
                className="w-11 h-11 rounded-2xl bg-[#1a1a1a] border border-white/5 flex items-center justify-center text-zinc-500 hover:text-purple-400 transition-colors shrink-0"
              >
                <Mic size={22} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InputBar;
